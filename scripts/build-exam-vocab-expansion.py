from __future__ import annotations

import csv
import io
import json
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
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

JA_TARGETS = {"N3": 200, "N2": 350, "N1": 250}
KO_TARGETS = {"중급": 250, "고급": 450}

WALLER_URLS = {
    "N3": "https://raw.githubusercontent.com/stephenmk/yomitan-jlpt-vocab/main/original_data/n3.csv",
    "N2": "https://raw.githubusercontent.com/stephenmk/yomitan-jlpt-vocab/main/original_data/n2.csv",
    "N1": "https://raw.githubusercontent.com/stephenmk/yomitan-jlpt-vocab/main/original_data/n1.csv",
}
KRDICT_URLS = [
    "https://raw.githubusercontent.com/studioego/krdict-converted/master/upstream/0.xml",
    "https://raw.githubusercontent.com/studioego/krdict-converted/master/upstream/1.xml",
]

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


def existing_words(language: str) -> set[str]:
    pat = re.compile(rf'targetLanguage:\s*"{language}"\s*,\s*targetText:\s*"([^"]+)"')
    words: set[str] = set()
    for p in SRC.glob("vocabulary*.ts"):
        if p.name in {"vocabulary.ts", JA_OUT.name, KO_OUT.name}:
            continue
        words.update(pat.findall(p.read_text()))
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
    with ThreadPoolExecutor(max_workers=10) as pool:
        jobs = {pool.submit(translate_one, t, source, target): t for t in uniq}
        for i, fut in enumerate(as_completed(jobs), 1):
            t = jobs[fut]
            out[t] = fut.result()
            if i % 100 == 0:
                print(f"translated {i}/{len(uniq)} {source}->{target}")
    return out


def choose_japanese(jlpt_map: dict[str, str], existing: set[str]) -> list[dict]:
    selected: list[dict] = []
    used = set(existing)
    for target_level, wanted in JA_TARGETS.items():
        rows = csv.DictReader(io.StringIO(fetch_text(WALLER_URLS[target_level])))
        pool: list[dict] = []
        for row in rows:
            kana = (row.get("kana") or '').strip()
            kanji = (row.get("kanji") or '').strip()
            word = kanji or kana
            gloss = concise_gloss(row.get("waller_definition") or '')
            if not valid_headword(word) or word in used or jlpt_map.get(word) != target_level:
                continue
            if any(x in word for x in JP_BAD_WORD_PARTS) or word.endswith(JP_PHRASE_ENDINGS):
                continue
            lower = gloss.lower()
            if not gloss or any(x in lower for x in JP_BAD_GLOSS) or "todo" in lower or "#name" in lower:
                continue
            reading = kana or word
            freq = zipf_frequency(word, "ja")
            min_freq = {"N3": 2.8, "N2": 2.4, "N1": 1.9}[target_level]
            if freq < min_freq:
                continue
            pool.append({
                "word": word,
                "reading": reading,
                "gloss": gloss,
                "exam": target_level,
                "freq": freq,
            })
        pool.sort(key=lambda x: (-x["freq"], len(x["word"]), x["word"]))
        if len(pool) < wanted:
            raise RuntimeError(f"not enough Japanese {target_level}: {len(pool)} < {wanted}")
        take = pool[:wanted]
        selected.extend(take)
        used.update(x["word"] for x in take)
        print(target_level, "candidates", len(pool), "selected", len(take))
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
    pools: dict[str, list[dict]] = {k: [] for k in KO_TARGETS}
    seen_source: set[str] = set()
    for idx, url in enumerate(KRDICT_URLS):
        path = tmp / f'{idx}.xml'
        if not path.exists():
            print('downloading KRDICT', idx + 1)
            download(url, path)
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
            if not valid_headword(word) or word in existing or word in seen_source or grade_map.get(word) != grade:
                elem.clear(); root.clear(); continue
            definition_ko = (first_desc_feat(elem, 'definition') or '').strip()
            if not definition_ko:
                elem.clear(); root.clear(); continue
            eng, zh = korean_equivalents(elem)
            pronunciation = (first_desc_feat(elem, 'pronunciation') or word).strip()
            pools[grade].append({
                'word': word,
                'reading': pronunciation,
                'definition_ko': definition_ko,
                'gloss': concise_gloss('; '.join(eng)),
                'zh': '；'.join(zh[:2]),
                'grade': grade,
                'freq': zipf_frequency(word, 'ko'),
            })
            seen_source.add(word)
            elem.clear(); root.clear()
    chosen: list[dict] = []
    used = set(existing)
    for grade, wanted in KO_TARGETS.items():
        pool = [x for x in pools[grade] if x['word'] not in used]
        pool.sort(key=lambda x: (-x['freq'], len(x['word']), x['word']))
        if len(pool) < wanted:
            raise RuntimeError(f"not enough Korean {grade}: {len(pool)} < {wanted}")
        take = pool[:wanted]
        chosen.extend(take)
        used.update(x['word'] for x in take)
        print(grade, 'candidates', len(pool), 'selected', len(take))
    return chosen


def q(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


def write_ja(items: list[dict], zh_map: dict[str, str]) -> None:
    lines = [
        'import type { VocabItem } from "./vocabulary";',
        '',
        '// 800 exam-oriented Japanese headwords: N3 200, N2 350, N1 250.',
        '// JLPT level is cross-checked against the app map; candidates are ranked by modern corpus frequency.',
        'export const japaneseExamExpansion: VocabItem[] = [',
    ]
    counters = {k: 0 for k in JA_TARGETS}
    for item in items:
        level = item['exam']
        counters[level] += 1
        app_level = 'Intermediate' if level == 'N3' else 'Advanced'
        word = item['word']
        meaning_zh = zh_map[item['gloss']]
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
            '  },',
        ]
    lines.append('];')
    JA_OUT.write_text('\n'.join(lines) + '\n')


def write_ko(items: list[dict], zh_map: dict[str, str]) -> None:
    lines = [
        'import type { VocabItem } from "./vocabulary";',
        '',
        '// 700 exam-oriented Korean headwords: 중급 250, 고급 450.',
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
        example = f"시험 준비를 하며 '{word}'라는 단어를 복습했어요."
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
            '  },',
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

    if len(japanese) != 800 or len(korean) != 700:
        raise RuntimeError(f'wrong final counts: ja={len(japanese)} ko={len(korean)}')
    if len({x['word'] for x in japanese}) != 800 or len({x['word'] for x in korean}) != 700:
        raise RuntimeError('duplicate targets inside expansion')

    missing_ko_en = [x['definition_ko'] for x in korean if not x['gloss']]
    ko_en_by_definition = translate_many(missing_ko_en, 'ko', 'en') if missing_ko_en else {}
    for item in korean:
        if not item['gloss']:
            item['gloss'] = concise_gloss(ko_en_by_definition[item['definition_ko']])
        if not item['gloss']:
            raise RuntimeError(f"empty Korean English meaning for {item['word']}")

    need_zh = [x['gloss'] for x in japanese]
    need_zh += [x['gloss'] for x in korean if not x['zh']]
    zh_map = translate_many(need_zh, 'en', 'zh-CN')

    write_ja(japanese, zh_map)
    write_ko(korean, zh_map)
    wire_vocabulary()

    print('FINAL Japanese', {k: sum(1 for x in japanese if x['exam'] == k) for k in JA_TARGETS})
    print('FINAL Korean', {k: sum(1 for x in korean if x['grade'] == k) for k in KO_TARGETS})
    print('sample Japanese', [(x['word'], x['exam'], round(x['freq'], 2)) for x in japanese[:12]])
    print('sample Korean', [(x['word'], x['grade'], round(x['freq'], 2)) for x in korean[:12]])


if __name__ == '__main__':
    main()
