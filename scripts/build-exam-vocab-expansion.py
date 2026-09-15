from __future__ import annotations

import csv
import io
import json
import re
import tarfile
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from hangul_romanize import Transliter
from hangul_romanize.rule import academic
from pykakasi import kakasi
from wordfreq import zipf_frequency

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
JA_OUT = SRC / "vocabulary-exam-expansion-ja.ts"
KO_OUT = SRC / "vocabulary-exam-expansion-ko.ts"

JA_TARGETS = {"N3": 500, "N2": 1050, "N1": 750}
KO_TARGETS = {"중급": 600, "고급": 1100}

WALLER_URLS = {
    "N3": "https://raw.githubusercontent.com/stephenmk/yomitan-jlpt-vocab/main/original_data/n3.csv",
    "N2": "https://raw.githubusercontent.com/stephenmk/yomitan-jlpt-vocab/main/original_data/n2.csv",
    "N1": "https://raw.githubusercontent.com/stephenmk/yomitan-jlpt-vocab/main/original_data/n1.csv",
}
KRDICT_URLS = [
    "https://raw.githubusercontent.com/studioego/krdict-converted/master/upstream/0.xml",
    "https://raw.githubusercontent.com/studioego/krdict-converted/master/upstream/1.xml",
]
KRDICT_YOMITAN_EN = "https://github.com/Lyroxide/yomitan-ko-dic/releases/download/1.0.0/KO-EN.KRDICT.No.Examples.zip"
KRDICT_YOMITAN_ZH = "https://github.com/Lyroxide/yomitan-ko-dic/releases/download/1.0.0/KO-ZH.KRDICT.No.Examples.zip"

JP_BAD_GLOSS = (
    "particle", "prefix", "suffix", "conjunction", "auxiliary", "expression",
    "counter for", "honorific", "polite expression", "sentence-ending", "phrase",
)
JP_BAD_WORD_PARTS = (
    "かもしれない", "なければ", "てください", "て下さい", "てしまう", "ている",
    "てある", "ようにする", "ことがある", "お願いします", "おねがいします",
)
JP_PHRASE_ENDINGS = ("ます", "ました", "ません", "です", "でした", "ください", "下さい")
KO_POS = {"명사", "동사", "형용사", "부사"}

_kks = kakasi()
_ko_translit = Transliter(academic)


def fetch_text(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "LingoSleep-vocab-builder/1.0"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return r.read().decode("utf-8-sig")


def download(url: str, path: Path) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": "LingoSleep-vocab-builder/1.0"})
    with urllib.request.urlopen(req, timeout=180) as r, path.open("wb") as f:
        while True:
            chunk = r.read(1024 * 1024)
            if not chunk:
                break
            f.write(chunk)


def parse_ts_map(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    for line in path.read_text().splitlines():
        m = re.match(r'^\s*("(?:\\.|[^"\\])*"):\s*"([^"]+)"', line)
        if m:
            out[json.loads(m.group(1))] = m.group(2)
    return out


def _decode_ts_string(raw: str) -> str:
    try:
        return json.loads('"' + raw + '"')
    except Exception:  # noqa: BLE001
        return raw


def existing_words(language: str) -> set[str]:
    pat = re.compile(rf'"?targetLanguage"?\s*:\s*"{language}"\s*,\s*"?targetText"?\s*:\s*"((?:\\.|[^"\\])*)"')
    words: set[str] = set()
    for p in SRC.glob("vocabulary*.ts"):
        if p.name in {"vocabulary.ts", JA_OUT.name, KO_OUT.name}:
            continue
        text = p.read_text()
        words.update(_decode_ts_string(x) for x in pat.findall(text))

        # Compact row formats used by the curated Basic and noun expansions.
        if p.name not in {"vocabulary-basic-expansion.ts", "vocabulary-noun-expansion.ts", "vocabulary-intermediate-curated-expansion.ts"}:
            continue
        for line in text.splitlines():
            stripped = line.strip()
            if not stripped.startswith('["'):
                continue
            vals = re.findall(r'"((?:\\.|[^"\\])*)"', stripped)
            if p.name in {"vocabulary-basic-expansion.ts", "vocabulary-intermediate-curated-expansion.ts"} and len(vals) >= 8:
                raw = vals[4] if language == "Japanese" else vals[7]
                words.add(_decode_ts_string(raw))
            elif p.name == "vocabulary-noun-expansion.ts" and len(vals) >= 7:
                raw = vals[3] if language == "Japanese" else vals[6]
                words.add(_decode_ts_string(raw))
    return words


def valid_headword(word: str) -> bool:
    if not word or len(word) > 12 or any(ch.isspace() for ch in word):
        return False
    if re.search(r'[()（）/／・,:;!?！？「」『』【】\[\]{}=~〜～]', word):
        return False
    if word.startswith("-") or word.endswith("-"):
        return False
    return True


def concise_gloss(text: str) -> str:
    text = re.sub(r'\([^)]*\)', '', text or '')
    text = re.sub(r'\s+', ' ', text).strip(' ,;')
    parts = [p.strip() for p in re.split(r'[;,]', text) if p.strip()]
    clean: list[str] = []
    for p in parts:
        p = re.sub(r'^\(?\d+\)?\s*', '', p).strip()
        if p and p not in clean:
            clean.append(p)
        if len(clean) >= 3:
            break
    return '; '.join(clean)[:180]


def jp_romaji(reading: str) -> str:
    return ''.join(part.get('hepburn', '') for part in _kks.convert(reading)).replace(' ', '')


def translate_one(text: str, source: str, target: str) -> str:
    text = text.strip()
    if not text:
        return text
    params = urllib.parse.urlencode({
        "client": "gtx", "sl": source, "tl": target, "dt": "t", "q": text,
    })
    url = "https://translate.googleapis.com/translate_a/single?" + params
    last = None
    for attempt in range(7):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=25) as r:
                data = json.loads(r.read().decode("utf-8"))
            result = ''.join(piece[0] for piece in data[0] if piece and piece[0]).strip()
            if result:
                return result
        except Exception as exc:  # noqa: BLE001
            last = exc
            time.sleep(1.0 * (attempt + 1))
    raise RuntimeError(f"translation failed for {text!r}: {last}")


def translate_many(texts: list[str], source: str, target: str) -> dict[str, str]:
    uniq = sorted({t for t in texts if t})
    out: dict[str, str] = {}

    def request_batch(batch: list[str]) -> dict[str, str]:
        joined = "\n".join(batch)
        params = urllib.parse.urlencode({
            "client": "gtx", "sl": source, "tl": target, "dt": "t", "q": joined,
        })
        url = "https://translate.googleapis.com/translate_a/single?" + params
        last = None
        for attempt in range(5):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=35) as r:
                    data = json.loads(r.read().decode("utf-8"))
                translated = ''.join(piece[0] for piece in data[0] if piece and piece[0])
                parts = [x.strip() for x in translated.splitlines()]
                if len(parts) == len(batch) and all(parts):
                    return dict(zip(batch, parts))
                last = RuntimeError(
                    f"batch segmentation mismatch: source={len(batch)} translated={len(parts)}"
                )
            except Exception as exc:  # noqa: BLE001
                last = exc
            time.sleep(1.5 * (attempt + 1))

        if len(batch) == 1:
            return {batch[0]: translate_one(batch[0], source, target)}
        mid = len(batch) // 2
        left = request_batch(batch[:mid])
        right = request_batch(batch[mid:])
        return {**left, **right}

    chunk_size = 20
    for start in range(0, len(uniq), chunk_size):
        batch = uniq[start:start + chunk_size]
        out.update(request_batch(batch))
        print(f"translated {len(out)}/{len(uniq)} {source}->{target}", flush=True)
        time.sleep(0.15)
    return out


def _jmdict_pos_allowed(tags: list[str]) -> bool:
    for tag in tags:
        if tag in {"n", "n-adv", "n-t", "adv", "adv-to"}:
            return True
        if tag.startswith("v1") or tag.startswith("v5") or tag in {"vs", "vs-i", "vs-s", "vk", "vz"}:
            return True
        if tag.startswith("adj-"):
            return True
    return False


def _load_jmdict_by_seq(seqs: set[str]) -> dict[str, dict]:
    release = json.loads(fetch_text("https://api.github.com/repos/scriptin/jmdict-simplified/releases/latest"))
    assets = release.get("assets", [])
    candidates = [
        a for a in assets
        if a.get("name", "").startswith("jmdict-eng-")
        and a.get("name", "").endswith(".json.tgz")
        and "common" not in a.get("name", "")
        and "examples" not in a.get("name", "")
    ]
    if not candidates:
        raise RuntimeError("No JMdict English release asset found")
    asset = candidates[0]
    archive = ROOT / ".tmp-jmdict-eng.tgz"
    print("downloading JMdict", asset["name"])
    download(asset["browser_download_url"], archive)
    with tarfile.open(archive, "r:gz") as tf:
        members = [m for m in tf.getmembers() if m.isfile() and m.name.endswith(".json")]
        if not members:
            raise RuntimeError("JMdict archive has no JSON member")
        fh = tf.extractfile(members[0])
        if fh is None:
            raise RuntimeError("Could not read JMdict JSON member")
        data = json.load(fh)
    archive.unlink(missing_ok=True)
    out: dict[str, dict] = {}
    for entry in data.get("words", []):
        seq = str(entry.get("id", ""))
        if seq in seqs:
            out[seq] = entry
    print("JMdict sequence matches", len(out), "/", len(seqs))
    return out


def _jmdict_lexical_info(entry: dict | None, word: str, reading: str) -> dict | None:
    if not entry:
        return None
    blocked_misc = {"arch", "obs", "obsc", "rare", "dated", "hist"}
    kanji = entry.get("kanji", [])
    kana = entry.get("kana", [])
    kanji_match = [x for x in kanji if x.get("text") == word]
    kana_word_match = [x for x in kana if x.get("text") == word]
    reading_match = []
    for x in kana:
        if x.get("text") != reading:
            continue
        applies = x.get("appliesToKanji", [])
        if kanji_match and "*" not in applies and word not in applies:
            continue
        reading_match.append(x)
    if not reading_match and not (kana_word_match and word == reading):
        return None

    if kanji_match:
        common = any(x.get("common") for x in kanji_match)
    else:
        common = any(x.get("common") for x in reading_match + kana_word_match)
    best: list[tuple[int, dict]] = []
    for sense in entry.get("sense", []):
        pos = sense.get("partOfSpeech", [])
        if not _jmdict_pos_allowed(pos):
            continue
        if blocked_misc.intersection(sense.get("misc", [])):
            continue
        applies_k = sense.get("appliesToKanji", [])
        applies_r = sense.get("appliesToKana", [])
        if kanji_match and "*" not in applies_k and word not in applies_k:
            continue
        if "*" not in applies_r and reading not in applies_r and word not in applies_r:
            continue
        glosses: list[str] = []
        for g in sense.get("gloss", []):
            if g.get("lang") != "eng" or not g.get("text"):
                continue
            text = g["text"].strip()
            if text and text not in glosses:
                glosses.append(text)
            if len(glosses) >= 1:
                break
        gloss = concise_gloss("; ".join(glosses))
        if not gloss:
            continue
        score = 2 if common else 0
        if any(t in pos for t in {"n", "n-adv", "n-t"}):
            score += 1
        best.append((score, {"gloss": gloss, "common": common}))
    if not best:
        return None
    best.sort(key=lambda x: -x[0])
    return best[0][1]


def choose_japanese(jlpt_map: dict[str, str], existing: set[str]) -> list[dict]:
    raw_by_level: dict[str, list[dict]] = {}
    seqs: set[str] = set()
    known_bad = {"日本", "何か", "あっ", "時", "者", "事", "分", "円", "性", "自殺", "物体ない"}
    for target_level in JA_TARGETS:
        rows = csv.DictReader(io.StringIO(fetch_text(WALLER_URLS[target_level])))
        pool_seen: set[str] = set()
        raw: list[dict] = []
        for row in rows:
            kana = (row.get("kana") or "").strip()
            kanji = (row.get("kanji") or "").strip()
            seq = (row.get("jmdict_seq") or "").strip()
            word = kanji or kana
            if not seq or not valid_headword(word) or len(word) < 2:
                continue
            if word in existing or word in pool_seen or word in known_bad:
                continue
            if jlpt_map.get(word) != target_level:
                continue
            if any(x in word for x in JP_BAD_WORD_PARTS) or word.endswith(JP_PHRASE_ENDINGS):
                continue
            freq = zipf_frequency(word, "ja")
            min_freq = {"N3": 2.8, "N2": 2.4, "N1": 1.8}[target_level]
            max_freq = {"N3": 5.2, "N2": 5.0, "N1": 4.8}[target_level]
            if not (min_freq <= freq <= max_freq):
                continue
            reading = kana or word
            waller_gloss = concise_gloss((row.get("waller_definition") or "").strip())
            if not waller_gloss or "TODO" in waller_gloss.upper():
                continue
            raw.append({
                "word": word,
                "reading": reading,
                "seq": seq,
                "exam": target_level,
                "freq": freq,
                "waller_gloss": waller_gloss,
            })
            pool_seen.add(word)
            seqs.add(seq)
        raw_by_level[target_level] = raw

    jmdict = _load_jmdict_by_seq(seqs)
    selected: list[dict] = []
    used = set(existing)
    for target_level, wanted in JA_TARGETS.items():
        pool: list[dict] = []
        for item in raw_by_level[target_level]:
            if item["word"] in used:
                continue
            info = _jmdict_lexical_info(jmdict.get(item["seq"]), item["word"], item["reading"])
            if not info or not info["common"]:
                continue
            merged = {**item, **info}
            primary_gloss = item["waller_gloss"].split(";", 1)[0].strip()
            ja_en_overrides = {
                "ちゃんと": "properly",
                "まあまあ": "so-so; passable",
                "とんでもない": "unthinkable; outrageous",
                "どんなに": "how much; no matter how",
                "かわいそう": "pitiable; pitiful",
                "ジュース": "juice; soft drink",
                "高める": "to raise; to improve",
                "紅葉": "autumn leaves; fall foliage",
                "地元": "local area; hometown",
                "報道": "news report; reporting",
                "体験": "personal experience",
                "個別": "individual; separate",
                "果て": "end; limit",
                "貧乏": "poverty; poor",
            }
            merged["gloss"] = ja_en_overrides.get(item["word"], primary_gloss)
            pool.append(merged)
        pool.sort(key=lambda x: (-int(x["common"]), -x["freq"], len(x["word"]), x["word"]))
        common_count = sum(1 for x in pool if x["common"])
        print(target_level, "JMdict validated", len(pool), "common", common_count)
        if len(pool) < wanted:
            raise RuntimeError(f"not enough validated Japanese {target_level}: {len(pool)} < {wanted}")
        take = pool[:wanted]
        selected.extend(take)
        used.update(x["word"] for x in take)
        print(target_level, "selected", len(take))
    return selected

def local(tag: str) -> str:
    return tag.rsplit('}', 1)[-1]


def norm_att(value: str) -> str:
    return value.replace('_', '').replace('-', '').lower()


def direct_feat(node: ET.Element, name: str) -> str | None:
    wanted = norm_att(name)
    for child in node:
        if local(child.tag) != 'feat':
            continue
        if norm_att(child.attrib.get('att', child.attrib.get('name', ''))) != wanted:
            continue
        return child.attrib.get('val', child.attrib.get('value', '')) or ''.join(child.itertext())
    return None


def first_desc_feat(node: ET.Element, name: str) -> str | None:
    wanted = norm_att(name)
    for child in node.iter():
        if local(child.tag) != 'feat':
            continue
        if norm_att(child.attrib.get('att', child.attrib.get('name', ''))) == wanted:
            return child.attrib.get('val', child.attrib.get('value', '')) or ''.join(child.itertext())
    return None


def korean_equivalents(entry: ET.Element) -> tuple[list[str], list[str]]:
    eng: list[str] = []
    zh: list[str] = []
    for eq in entry.iter():
        if local(eq.tag) != 'Equivalent':
            continue
        lang = (direct_feat(eq, 'language') or '').strip().lower()
        lemma = (direct_feat(eq, 'lemma') or '').strip()
        if not lemma:
            continue
        if lang in {'영어', 'english', 'en'} and lemma not in eng:
            eng.append(lemma)
        if lang in {'중국어', '중국어(간체)', 'chinese', 'zh', 'zh-cn'} and lemma not in zh:
            zh.append(lemma)
    return eng[:3], zh[:3]


def choose_korean(grade_map: dict[str, str], existing: set[str]) -> list[dict]:
    tmp = ROOT / '.tmp-krdict'
    tmp.mkdir(exist_ok=True)
    paths: list[Path] = []
    for idx, url in enumerate(KRDICT_URLS):
        path = tmp / f'{idx}.xml'
        if not path.exists():
            print('downloading KRDICT', idx + 1)
            download(url, path)
        paths.append(path)

    # KRDICT stores homonyms as separate LexicalEntry records. LingoSleep only
    # has one card per spelling, so ambiguous spellings are unsafe: XML order can
    # otherwise select an obscure sense (for example a historical sense of 수상).
    # Count every dictionary entry first and only admit spellings that have one
    # lexical entry in the whole Korean dictionary.
    headword_counts: dict[str, int] = {}
    for path in paths:
        ctx = ET.iterparse(path, events=('start', 'end'))
        _, root = next(ctx)
        for event, elem in ctx:
            if event != 'end' or local(elem.tag) != 'LexicalEntry':
                continue
            word = None
            for child in elem:
                if local(child.tag) == 'Lemma':
                    word = direct_feat(child, 'writtenForm')
                    if word:
                        break
            word = (word or '').strip()
            if valid_headword(word):
                headword_counts[word] = headword_counts.get(word, 0) + 1
            elem.clear(); root.clear()

    print('KRDICT unambiguous headwords', sum(1 for n in headword_counts.values() if n == 1))

    pools: dict[str, list[dict]] = {k: [] for k in KO_TARGETS}
    seen_source: set[str] = set()
    known_bad = {"하", "은", "게", "과", "면", "적", "요", "자", "여", "자살"}
    for path in paths:
        ctx = ET.iterparse(path, events=('start', 'end'))
        _, root = next(ctx)
        for event, elem in ctx:
            if event != 'end' or local(elem.tag) != 'LexicalEntry':
                continue
            grade = direct_feat(elem, 'vocabularyLevel')
            lexical_unit = direct_feat(elem, 'lexicalUnit')
            pos = direct_feat(elem, 'partOfSpeech')
            if grade not in KO_TARGETS or lexical_unit != '단어' or pos not in KO_POS:
                elem.clear(); root.clear(); continue
            word = None
            for child in elem:
                if local(child.tag) == 'Lemma':
                    word = direct_feat(child, 'writtenForm')
                    if word:
                        break
            word = (word or '').strip()
            if not valid_headword(word) or len(word) < 2:
                elem.clear(); root.clear(); continue
            if headword_counts.get(word) != 1:
                elem.clear(); root.clear(); continue
            if word in existing or word in seen_source or word in known_bad or grade_map.get(word) != grade:
                elem.clear(); root.clear(); continue
            definition_ko = (first_desc_feat(elem, 'definition') or '').strip()
            if not definition_ko:
                elem.clear(); root.clear(); continue
            eng, zh = korean_equivalents(elem)
            pronunciation = (first_desc_feat(elem, 'pronunciation') or word).strip().replace('ː', '')
            freq = zipf_frequency(word, 'ko')
            min_freq = {'중급': 2.8, '고급': 2.0}[grade]
            max_freq = {'중급': 5.6, '고급': 5.2}[grade]
            if not (min_freq <= freq <= max_freq):
                elem.clear(); root.clear(); continue
            pools[grade].append({
                'word': word,
                'reading': pronunciation,
                'definition_ko': definition_ko,
                'gloss': concise_gloss('; '.join(eng)),
                'zh': '；'.join(zh[:2]),
                'grade': grade,
                'freq': freq,
            })
            seen_source.add(word)
            elem.clear(); root.clear()

    chosen: list[dict] = []
    used = set(existing)
    for grade, wanted in KO_TARGETS.items():
        pool = [x for x in pools[grade] if x['word'] not in used]
        pool.sort(key=lambda x: (-x['freq'], len(x['word']), x['word']))
        if len(pool) < wanted:
            raise RuntimeError(f"not enough unambiguous Korean {grade}: {len(pool)} < {wanted}")
        take = pool[:wanted]
        chosen.extend(take)
        used.update(x['word'] for x in take)
        print(grade, 'unambiguous candidates', len(pool), 'selected', len(take))
    return chosen


def _yomitan_short_gloss(node: object, lang: str) -> str | None:
    """Return the first dictionary headline gloss from Yomitan structured content.

    KRDICT Yomitan cards encode a short lexical translation as a language-tagged
    div whose immediate children are spans. Longer explanatory definitions are
    plain-string divs, so they are intentionally ignored here.
    """
    if isinstance(node, dict):
        if node.get('tag') == 'div' and node.get('lang') == lang:
            content = node.get('content')
            if (
                isinstance(content, list)
                and content
                and all(isinstance(x, dict) and x.get('tag') == 'span' for x in content)
            ):
                parts: list[str] = []
                for span in content:
                    value = span.get('content')
                    if not isinstance(value, str):
                        continue
                    value = value.strip()
                    if not value or re.fullmatch(r'\d+\.', value):
                        continue
                    parts.append(value)
                candidate = ''.join(parts).strip()
                if candidate:
                    return candidate
        content = node.get('content')
        if isinstance(content, list):
            for child in content:
                found = _yomitan_short_gloss(child, lang)
                if found:
                    return found
        elif isinstance(content, dict):
            found = _yomitan_short_gloss(content, lang)
            if found:
                return found
    elif isinstance(node, list):
        for child in node:
            found = _yomitan_short_gloss(child, lang)
            if found:
                return found
    return None


def _load_krdict_yomitan_glosses(url: str, wanted: set[str], lang: str) -> dict[str, str]:
    suffix = 'en' if lang == 'en' else 'zh'
    archive = ROOT / f'.tmp-krdict-yomitan-{suffix}.zip'
    print('downloading KRDICT Yomitan', suffix)
    download(url, archive)
    out: dict[str, str] = {}
    with zipfile.ZipFile(archive) as zf:
        for name in zf.namelist():
            if not name.startswith('term_bank_') or not name.endswith('.json'):
                continue
            rows = json.loads(zf.read(name).decode('utf-8'))
            for row in rows:
                if not isinstance(row, list) or len(row) < 6:
                    continue
                word = row[0]
                if word not in wanted or word in out:
                    continue
                gloss = _yomitan_short_gloss(row[5], lang)
                if gloss:
                    out[word] = gloss.strip()
    archive.unlink(missing_ok=True)
    print('KRDICT Yomitan', suffix, 'matched', len(out), '/', len(wanted))
    return out

def q(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


def write_ja(items: list[dict], zh_map: dict[str, str]) -> None:
    lines = [
        'import type { VocabItem } from "./vocabulary";',
        '',
        '// 2,300 exam-oriented Japanese headwords: N3 500, N2 1,050, N1 750.',
        '// JLPT level is cross-checked against the app map; candidates are ranked by modern corpus frequency.',
        'export const japaneseExamExpansion: VocabItem[] = [',
    ]
    counters = {k: 0 for k in JA_TARGETS}
    for item in items:
        level = item['exam']
        counters[level] += 1
        app_level = 'Intermediate' if level == 'N3' else 'Advanced'
        word = item['word']
        meaning_zh = zh_map[word]
        example = f'試験対策として「{word}」という語を復習しました。'
        lines += [
            '  {',
            f'    id: {q(f"ja-exam-{level.lower()}-{counters[level]:03d}")},',
            '    targetLanguage: "Japanese",',
            f'    targetText: {q(word)},',
            f'    meanings: {{ English: {q(item["gloss"])}, "Simplified Chinese": {q(meaning_zh)} }},',
            f'    reading: {q(item["reading"])},',
            f'    romanization: {q(jp_romaji(item["reading"]))},',
            f'    level: "{app_level}",',
            '    topic: "JLPT",',
            f'    examLevel: "{level}",',
            f'    exampleSentence: {q(example)},',
            f'    exampleTranslations: {{ English: {q(f"I reviewed the word {word!r} for exam preparation.")}, "Simplified Chinese": {q(f"为了备考，我复习了“{word}”这个词。")} }},',
            '  } as VocabItem,',
        ]
    lines.append('];')
    JA_OUT.write_text('\n'.join(lines) + '\n')


def write_ko(items: list[dict], zh_map: dict[str, str]) -> None:
    lines = [
        'import type { VocabItem } from "./vocabulary";',
        '',
        '// 1,700 exam-oriented Korean headwords: 중급 600, 고급 1,100.',
        '// All targets are KRDICT lexicalUnit=단어 entries and use the official learner vocabulary grade.',
        'export const koreanExamExpansion: VocabItem[] = [',
    ]
    counters = {k: 0 for k in KO_TARGETS}
    for item in items:
        grade = item['grade']
        counters[grade] += 1
        app_level = 'Intermediate' if grade == '중급' else 'Advanced'
        word = item['word']
        meaning_zh = item['zh'] or zh_map[item['gloss']]
        example = f"시험 준비를 하며 다음 단어를 복습했어요. {word}."
        prefix = 'mid' if grade == '중급' else 'adv'
        lines += [
            '  {',
            f'    id: {q(f"ko-exam-{prefix}-{counters[grade]:03d}")},',
            '    targetLanguage: "Korean",',
            f'    targetText: {q(word)},',
            f'    meanings: {{ English: {q(item["gloss"])}, "Simplified Chinese": {q(meaning_zh)} }},',
            f'    reading: {q(item["reading"])},',
            f'    romanization: {q(_ko_translit.translit(item["reading"]))},',
            f'    level: "{app_level}",',
            '    topic: "TOPIK",',
            f'    koreanGrade: "{grade}",',
            f'    exampleSentence: {q(example)},',
            f'    exampleTranslations: {{ English: {q(f"I reviewed the word {word!r} for exam preparation.")}, "Simplified Chinese": {q(f"为了备考，我复习了“{word}”这个词。")} }},',
            '  } as VocabItem,',
        ]
    lines.append('];')
    KO_OUT.write_text('\n'.join(lines) + '\n')


def wire_vocabulary() -> None:
    path = SRC / 'vocabulary.ts'
    text = path.read_text()
    if 'japaneseExamExpansion' not in text:
        anchor = 'import { validatedHeadwordExpansion } from "./vocabulary-validated-expansion";\n'
        text = text.replace(anchor, anchor + 'import { japaneseExamExpansion } from "./vocabulary-exam-expansion-ja";\nimport { koreanExamExpansion } from "./vocabulary-exam-expansion-ko";\n')
    if '  ...japaneseExamExpansion,' not in text:
        text = text.replace('  ...validatedHeadwordExpansion,\n', '  ...validatedHeadwordExpansion,\n  ...japaneseExamExpansion,\n  ...koreanExamExpansion,\n')
    path.write_text(text)


def main() -> None:
    jlpt_map = parse_ts_map(SRC / 'jlpt-level-map.ts')
    korean_map = parse_ts_map(SRC / 'korean-level-map.ts')
    ja_existing = existing_words('Japanese')
    ko_existing = existing_words('Korean')
    print('existing Japanese', len(ja_existing), 'Korean', len(ko_existing))

    japanese = choose_japanese(jlpt_map, ja_existing)
    korean = choose_korean(korean_map, ko_existing)

    if len(japanese) != 2300 or len(korean) != 1700:
        raise RuntimeError(f'wrong final counts: ja={len(japanese)} ko={len(korean)}')
    if len({x['word'] for x in japanese}) != 2300 or len({x['word'] for x in korean}) != 1700:
        raise RuntimeError('duplicate targets inside expansion')

    # Use the official KRDICT multilingual Yomitan exports for concise
    # learner-facing meanings. The Korean selection above already excludes
    # spellings with multiple LexicalEntry records, so term-only matching is
    # unambiguous here.
    ko_words = {x['word'] for x in korean}
    ko_en_official = _load_krdict_yomitan_glosses(KRDICT_YOMITAN_EN, ko_words, 'en')
    ko_zh_official = _load_krdict_yomitan_glosses(KRDICT_YOMITAN_ZH, ko_words, 'zh')

    missing_official_en: list[str] = []
    missing_official_zh: list[str] = []
    for item in korean:
        word = item['word']
        if word in ko_en_official:
            item['gloss'] = concise_gloss(ko_en_official[word]) or ko_en_official[word]
        else:
            missing_official_en.append(word)
        if word in ko_zh_official:
            item['zh'] = ko_zh_official[word].strip()
        else:
            missing_official_zh.append(word)

    if missing_official_en:
        print('KRDICT EN fallback words', len(missing_official_en), missing_official_en[:20])
        fallback = translate_many(missing_official_en, 'ko', 'en')
        for item in korean:
            if item['word'] in fallback:
                item['gloss'] = concise_gloss(fallback[item['word']]) or fallback[item['word']]
    if missing_official_zh:
        print('KRDICT ZH fallback words', len(missing_official_zh), missing_official_zh[:20])
        fallback = translate_many(missing_official_zh, 'ko', 'zh-CN')
        for item in korean:
            if item['word'] in fallback:
                item['zh'] = fallback[item['word']].strip()

    for item in korean:
        if not item['gloss'] or not item['zh']:
            raise RuntimeError(f"empty Korean meaning for {item['word']}")

    # Translating the Japanese headword directly gives a more natural compact
    # Chinese learner meaning than translating an English gloss (e.g. 人生 stays
    # 人生 instead of becoming the broader 生活).
    existing_ja_zh: dict[str, str] = {}
    if JA_OUT.exists():
        old_text = JA_OUT.read_text()
        pair_re = re.compile(
            r'targetText:\s*("(?:\\.|[^"\\])*").*?'
            r'meanings:\s*\{\s*English:\s*"(?:\\.|[^"\\])*",\s*'
            r'"Simplified Chinese":\s*("(?:\\.|[^"\\])*")\s*\}',
            re.S,
        )
        for m in pair_re.finditer(old_text):
            word = json.loads(m.group(1))
            zh = json.loads(m.group(2)).strip()
            if word and zh:
                existing_ja_zh[word] = zh

    ja_words = [x['word'] for x in japanese]
    ja_zh_map = {w: existing_ja_zh[w] for w in ja_words if w in existing_ja_zh}
    ja_missing_items = [x for x in japanese if x['word'] not in ja_zh_map]
    print('Japanese ZH meanings reused', len(ja_zh_map), 'new', len(ja_missing_items))
    gloss_zh = translate_many([x['gloss'] for x in ja_missing_items], 'en', 'zh-CN')
    ja_zh_overrides = {
        "全員": "全体人员；所有人",
        "ちゃんと": "好好地；妥当地",
        "重要": "重要；重要的",
        "戦い": "战斗；斗争",
        "エネルギー": "能量；精力",
        "美人": "美人；漂亮的人",
        "とんでもない": "荒唐的；出乎意料的",
        "どんなに": "多么；无论多么",
        "ジュース": "果汁；软饮料",
        "繰り返す": "重复；反复",
        "かわいそう": "可怜的",
        "まあまあ": "一般般；还可以",
        "割と": "比较；相对地",
        "そのほか": "其他；除此以外",
        "ボーナス": "奖金",
        "高める": "提高；提升",
        "紅葉": "红叶；秋叶",
        "大通り": "大街；主要街道",
        "熟語": "熟语；惯用语；汉字复合词",
        "括弧": "括号",
        "討つ": "讨伐；攻击；报仇",
        "偶数": "偶数",
        "地元": "当地；本地",
        "報道": "报道；新闻报道",
        "体験": "体验；亲身经历",
        "ジャンプ": "跳跃",
        "個別": "个别；单独",
        "果て": "尽头；终点",
        "装飾": "装饰",
        "褒美": "奖赏；奖励",
        "暫く": "一会儿；暂时",
        "負う": "承担；背负；欠",
        "貧乏": "贫穷；贫困",
    }
    for item in ja_missing_items:
        ja_zh_map[item['word']] = ja_zh_overrides.get(item['word'], gloss_zh[item['gloss']])
    for word, meaning in ja_zh_overrides.items():
        if word in ja_words:
            ja_zh_map[word] = meaning

    write_ja(japanese, ja_zh_map)
    write_ko(korean, {})
    wire_vocabulary()

    print('FINAL Japanese', {k: sum(1 for x in japanese if x['exam'] == k) for k in JA_TARGETS})
    print('FINAL Korean', {k: sum(1 for x in korean if x['grade'] == k) for k in KO_TARGETS})
    print('sample Japanese', [(x['word'], x['exam'], round(x['freq'], 2)) for x in japanese[:12]])
    print('sample Korean', [(x['word'], x['grade'], round(x['freq'], 2)) for x in korean[:12]])


if __name__ == '__main__':
    main()
