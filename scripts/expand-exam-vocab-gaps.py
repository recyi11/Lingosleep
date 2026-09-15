from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
BUILDER = ROOT / "scripts" / "build-exam-vocab-expansion.py"
JA_PATH = SRC / "vocabulary-exam-expansion-ja.ts"
KO_PATH = SRC / "vocabulary-exam-expansion-ko.ts"

JA_EXPECTED = {"N3": 500, "N2": 1050, "N1": 750}
KO_EXPECTED = {"중급": 600, "고급": 1100}


def _replace_once(s: str, old: str, new: str, marker: str) -> str:
    if marker in s:
        return s
    if old not in s:
        raise RuntimeError(f"builder patch anchor missing: {marker}")
    return s.replace(old, new, 1)


def patch_builder() -> None:
    s = BUILDER.read_text()

    replacements = [
        (
            'JA_TARGETS = {"N3": 200, "N2": 350, "N1": 250}',
            'JA_TARGETS = {"N3": 500, "N2": 1050, "N1": 750}',
        ),
        (
            'KO_TARGETS = {"중급": 250, "고급": 450}',
            'KO_TARGETS = {"중급": 600, "고급": 1100}',
        ),
        (
            '// 800 exam-oriented Japanese headwords: N3 200, N2 350, N1 250.',
            '// 2,300 exam-oriented Japanese headwords: N3 500, N2 1,050, N1 750.',
        ),
        (
            '// 700 exam-oriented Korean headwords: 중급 250, 고급 450.',
            '// 1,700 exam-oriented Korean headwords: 중급 600, 고급 1,100.',
        ),
        (
            'if len(japanese) != 800 or len(korean) != 700:',
            'if len(japanese) != 2300 or len(korean) != 1700:',
        ),
        (
            "if len({x['word'] for x in japanese}) != 800 or len({x['word'] for x in korean}) != 700:",
            "if len({x['word'] for x in japanese}) != 2300 or len({x['word'] for x in korean}) != 1700:",
        ),
    ]
    for old, new in replacements:
        if new not in s:
            if old not in s:
                raise RuntimeError(f"builder patch anchor missing: {old}")
            s = s.replace(old, new, 1)

    # The original builder only saw object-style VocabItem literals. Two bundled
    # sources store vocabulary in compact row arrays, so ignoring them can create
    # source-level duplicates that are merely hidden by the frontend deduper.
    old_existing_words = '''def existing_words(language: str) -> set[str]:
    pat = re.compile(rf'targetLanguage:\\s*"{language}"\\s*,\\s*targetText:\\s*"([^\"]+)"')
    words: set[str] = set()
    for p in SRC.glob("vocabulary*.ts"):
        if p.name in {"vocabulary.ts", JA_OUT.name, KO_OUT.name}:
            continue
        words.update(pat.findall(p.read_text()))
    return words
'''
    new_existing_words = '''def _decode_ts_string(raw: str) -> str:
    try:
        return json.loads('"' + raw + '"')
    except Exception:  # noqa: BLE001
        return raw


def existing_words(language: str) -> set[str]:
    pat = re.compile(rf'"?targetLanguage"?\\s*:\\s*"{language}"\\s*,\\s*"?targetText"?\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"')
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
            vals = re.findall(r'"((?:\\\\.|[^"\\\\])*)"', stripped)
            if p.name in {"vocabulary-basic-expansion.ts", "vocabulary-intermediate-curated-expansion.ts"} and len(vals) >= 8:
                raw = vals[4] if language == "Japanese" else vals[7]
                words.add(_decode_ts_string(raw))
            elif p.name == "vocabulary-noun-expansion.ts" and len(vals) >= 7:
                raw = vals[3] if language == "Japanese" else vals[6]
                words.add(_decode_ts_string(raw))
    return words
'''
    s = _replace_once(s, old_existing_words, new_existing_words, "def _decode_ts_string(raw: str)")

    # Translate Japanese headwords to Chinese in small newline batches. The prior
    # one-request-per-word implementation reliably hit the public endpoint's 429
    # threshold near the end of a 2,300-word run. Batching also gives us a stable
    # recursive fallback if a batch is segmented unexpectedly.
    old_translate_many = '''def translate_many(texts: list[str], source: str, target: str) -> dict[str, str]:
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
'''
    new_translate_many = '''def translate_many(texts: list[str], source: str, target: str) -> dict[str, str]:
    uniq = sorted({t for t in texts if t})
    out: dict[str, str] = {}

    def request_batch(batch: list[str]) -> dict[str, str]:
        joined = "\\n".join(batch)
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
'''
    s = _replace_once(s, old_translate_many, new_translate_many, "batch segmentation mismatch")

    # Keep the Chinese meanings already reviewed in the existing 800-word file;
    # only newly selected Japanese words need translation during this expansion.
    old_ja_translate = "    ja_zh_map = translate_many([x['word'] for x in japanese], 'ja', 'zh-CN')\n"
    new_ja_translate = '''    existing_ja_zh: dict[str, str] = {}
    if JA_OUT.exists():
        old_text = JA_OUT.read_text()
        pair_re = re.compile(
            r'targetText:\\s*("(?:\\\\.|[^"\\\\])*").*?'
            r'meanings:\\s*\\{\\s*English:\\s*"(?:\\\\.|[^"\\\\])*",\\s*'
            r'"Simplified Chinese":\\s*("(?:\\\\.|[^"\\\\])*")\\s*\\}',
            re.S,
        )
        for m in pair_re.finditer(old_text):
            word = json.loads(m.group(1))
            zh = json.loads(m.group(2)).strip()
            if word and zh:
                existing_ja_zh[word] = zh

    ja_words = [x['word'] for x in japanese]
    ja_zh_map = {w: existing_ja_zh[w] for w in ja_words if w in existing_ja_zh}
    ja_missing_zh = [w for w in ja_words if w not in ja_zh_map]
    print('Japanese ZH meanings reused', len(ja_zh_map), 'new', len(ja_missing_zh))
    ja_zh_map.update(translate_many(ja_missing_zh, 'ja', 'zh-CN'))
'''
    s = _replace_once(s, old_ja_translate, new_ja_translate, "Japanese ZH meanings reused")

    # Preserve the earlier decision to keep self-harm vocabulary out of the
    # relaxed-listening pool even if a source list happens to classify it for JLPT.
    if '"自殺"' not in s.split('known_bad =', 1)[1].split('}', 1)[0]:
        s = s.replace(
            'known_bad = {"日本", "何か", "あっ", "時", "者", "事", "分", "円", "性"}',
            'known_bad = {"日本", "何か", "あっ", "時", "者", "事", "分", "円", "性", "自殺", "物体ない"}',
            1,
        )
    if '"자살"' not in s.split('known_bad =', 2)[-1].split('}', 1)[0]:
        s = s.replace(
            'known_bad = {"하", "은", "게", "과", "면", "적", "요", "자", "여"}',
            'known_bad = {"하", "은", "게", "과", "면", "적", "요", "자", "여", "자살"}',
            1,
        )

    # EXAM_QUALITY_PATCH_V3
    old_common = '    common = any(x.get("common") for x in kanji_match + reading_match + kana_word_match)\n'
    new_common = '''    if kanji_match:
        common = any(x.get("common") for x in kanji_match)
    else:
        common = any(x.get("common") for x in reading_match + kana_word_match)
'''
    if old_common not in s:
        raise RuntimeError('JMdict common-surface anchor missing')
    s = s.replace(old_common, new_common, 1)

    old_raw = '''            reading = kana or word
            raw.append({
                "word": word,
                "reading": reading,
                "seq": seq,
                "exam": target_level,
                "freq": freq,
            })
'''
    new_raw = '''            reading = kana or word
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
'''
    if old_raw not in s:
        raise RuntimeError('Waller gloss anchor missing')
    s = s.replace(old_raw, new_raw, 1)

    old_select = '''            info = _jmdict_lexical_info(jmdict.get(item["seq"]), item["word"], item["reading"])
            if not info:
                continue
            pool.append({**item, **info})
'''
    new_select = '''            info = _jmdict_lexical_info(jmdict.get(item["seq"]), item["word"], item["reading"])
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
'''
    if old_select not in s:
        raise RuntimeError('Japanese common-only selection anchor missing')
    s = s.replace(old_select, new_select, 1)

    old_zh = '''    ja_words = [x['word'] for x in japanese]
    ja_zh_map = {w: existing_ja_zh[w] for w in ja_words if w in existing_ja_zh}
    ja_missing_zh = [w for w in ja_words if w not in ja_zh_map]
    print('Japanese ZH meanings reused', len(ja_zh_map), 'new', len(ja_missing_zh))
    ja_zh_map.update(translate_many(ja_missing_zh, 'ja', 'zh-CN'))
'''
    new_zh = '''    ja_words = [x['word'] for x in japanese]
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
'''
    if old_zh not in s:
        raise RuntimeError('Japanese gloss-to-Chinese anchor missing')
    s = s.replace(old_zh, new_zh, 1)

    # Avoid TypeScript constructing a 2,000+ member object-literal union.
    cast_anchor = "            '  },',\n"
    if cast_anchor not in s:
        raise RuntimeError('VocabItem cast anchor missing')
    s = s.replace(cast_anchor, "            '  } as VocabItem,',\n")

    s = s.replace('"性", "自殺"}', '"性", "自殺", "物体ない"}', 1)

    BUILDER.write_text(s)


def run_builder() -> None:
    subprocess.run(["python", str(BUILDER)], cwd=ROOT, check=True)


def _decode(raw: str) -> str:
    return json.loads(raw)


def _object_targets(text: str, language: str) -> set[str]:
    pat = re.compile(
        rf'"?targetLanguage"?\s*:\s*"{language}"\s*,\s*"?targetText"?\s*:\s*("(?:\\.|[^"\\])*")'
    )
    return {_decode(x) for x in pat.findall(text)}


def _row_targets(path: Path, language: str) -> set[str]:
    if path.name not in {"vocabulary-basic-expansion.ts", "vocabulary-noun-expansion.ts", "vocabulary-intermediate-curated-expansion.ts"}:
        return set()
    out: set[str] = set()
    for line in path.read_text().splitlines():
        stripped = line.strip()
        if not stripped.startswith('["'):
            continue
        vals = re.findall(r'"((?:\\.|[^"\\])*)"', stripped)
        if path.name in {"vocabulary-basic-expansion.ts", "vocabulary-intermediate-curated-expansion.ts"} and len(vals) >= 8:
            raw = vals[4] if language == "Japanese" else vals[7]
        elif path.name == "vocabulary-noun-expansion.ts" and len(vals) >= 7:
            raw = vals[3] if language == "Japanese" else vals[6]
        else:
            continue
        out.add(json.loads('"' + raw + '"'))
    return out


def _other_targets(language: str) -> set[str]:
    out: set[str] = set()
    for path in SRC.glob("vocabulary*.ts"):
        if path in {JA_PATH, KO_PATH, SRC / "vocabulary.ts"}:
            continue
        text = path.read_text()
        out.update(_object_targets(text, language))
        out.update(_row_targets(path, language))
    return out


def _parse_map(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    for line in path.read_text().splitlines():
        m = re.match(r'^\s*("(?:\\.|[^"\\])*"):\s*"([^"]+)"', line)
        if m:
            out[json.loads(m.group(1))] = m.group(2)
    return out


def _parse_generated(text: str, language: str) -> list[dict[str, str]]:
    entries: list[dict[str, str]] = []
    for block in re.findall(r'^  \{\n(.*?)^  \}(?: as VocabItem)?,$', text, re.M | re.S):
        def prop(name: str) -> str:
            m = re.search(rf'^\s*{re.escape(name)}:\s*("(?:\\.|[^"\\])*")', block, re.M)
            if not m:
                raise RuntimeError(f"missing {name} in generated {language} entry")
            return json.loads(m.group(1))

        mm = re.search(
            r'meanings:\s*\{\s*English:\s*("(?:\\.|[^"\\])*"),\s*'
            r'"Simplified Chinese":\s*("(?:\\.|[^"\\])*")\s*\}',
            block,
        )
        if not mm:
            raise RuntimeError(f"missing meanings in generated {language} entry")

        entry = {
            "id": prop("id"),
            "target": prop("targetText"),
            "reading": prop("reading"),
            "romanization": prop("romanization"),
            "level": prop("level"),
            "topic": prop("topic"),
            "en": json.loads(mm.group(1)),
            "zh": json.loads(mm.group(2)),
        }
        if language == "Japanese":
            entry["grade"] = prop("examLevel")
        else:
            entry["grade"] = prop("koreanGrade")
        entries.append(entry)
    return entries


def _sample(entries: list[dict[str, str]], label: str) -> None:
    if not entries:
        return
    n = len(entries)
    indexes = sorted({0, 1, 2, n // 6, n // 3, n // 2, (2 * n) // 3, (5 * n) // 6, n - 3, n - 2, n - 1})
    rows = [
        {
            "word": entries[i]["target"],
            "reading": entries[i]["reading"],
            "en": entries[i]["en"],
            "zh": entries[i]["zh"],
        }
        for i in indexes
    ]
    print(f"AUDIT_SAMPLE {label} " + json.dumps(rows, ensure_ascii=False), flush=True)


def audit() -> None:
    ja_text = JA_PATH.read_text()
    ko_text = KO_PATH.read_text()
    ja = _parse_generated(ja_text, "Japanese")
    ko = _parse_generated(ko_text, "Korean")

    if len(ja) != sum(JA_EXPECTED.values()):
        raise RuntimeError(f"Japanese count: {len(ja)}")
    if len(ko) != sum(KO_EXPECTED.values()):
        raise RuntimeError(f"Korean count: {len(ko)}")

    for grade, wanted in JA_EXPECTED.items():
        actual = sum(1 for x in ja if x["grade"] == grade)
        if actual != wanted:
            raise RuntimeError(f"Japanese {grade}: {actual} != {wanted}")
    for grade, wanted in KO_EXPECTED.items():
        actual = sum(1 for x in ko if x["grade"] == grade)
        if actual != wanted:
            raise RuntimeError(f"Korean {grade}: {actual} != {wanted}")

    for entries, language in ((ja, "Japanese"), (ko, "Korean")):
        targets = [x["target"] for x in entries]
        ids = [x["id"] for x in entries]
        if len(targets) != len(set(targets)):
            raise RuntimeError(f"duplicate targets inside {language} expansion")
        if len(ids) != len(set(ids)):
            raise RuntimeError(f"duplicate ids inside {language} expansion")
        if any(len(w) < 2 or re.search(r"\s", w) for w in targets):
            raise RuntimeError(f"non-standalone {language} target found")
        for e in entries:
            if not all(e[k].strip() for k in ("target", "reading", "romanization", "en", "zh")):
                raise RuntimeError(f"empty generated field in {language}: {e}")
            if len(e["en"]) > 180 or len(e["zh"]) > 100:
                raise RuntimeError(f"overlong learner meaning in {language}: {e['target']}")
            en_match = re.fullmatch(r"(.+),\s*related\s+(.+)", e["en"].strip(), re.I)
            if en_match and en_match.group(1).strip().casefold() == en_match.group(2).strip().casefold():
                raise RuntimeError(f"fabricated related gloss in {language}: {e['target']}")
            zh_match = re.fullmatch(r"(.+)，相关(.+)", e["zh"].strip())
            if zh_match and zh_match.group(1).strip() == zh_match.group(2).strip():
                raise RuntimeError(f"fabricated related gloss in {language}: {e['target']}")

    # BAD_JA_GLOSS_GUARD_V3
    bad_pairs = {
        ("まあまあ", "很公平"),
        ("果て", "结束；四肢；极限"),
    }
    for e in ja:
        if (e["target"], e["zh"]) in bad_pairs:
            raise RuntimeError(f"known bad Japanese learner gloss: {e['target']} -> {e['zh']}")
        if e["target"] == "ジュース" and "deuce" in e["en"].lower():
            raise RuntimeError("secondary homograph sense leaked into ジュース")

    ja_targets = {x["target"] for x in ja}
    ko_targets = {x["target"] for x in ko}
    ja_dupes = ja_targets & _other_targets("Japanese")
    ko_dupes = ko_targets & _other_targets("Korean")
    if ja_dupes:
        raise RuntimeError(f"Japanese duplicates vs bundled sources: {sorted(ja_dupes)[:30]}")
    if ko_dupes:
        raise RuntimeError(f"Korean duplicates vs bundled sources: {sorted(ko_dupes)[:30]}")

    jlpt = _parse_map(SRC / "jlpt-level-map.ts")
    kr = _parse_map(SRC / "korean-level-map.ts")
    for e in ja:
        if jlpt.get(e["target"]) != e["grade"]:
            raise RuntimeError(
                f"JLPT mismatch {e['target']}: generated={e['grade']} map={jlpt.get(e['target'])}"
            )
        expected_level = "Intermediate" if e["grade"] == "N3" else "Advanced"
        if e["level"] != expected_level or e["topic"] != "JLPT":
            raise RuntimeError(f"Japanese level/topic mismatch: {e}")
        if re.search(r'[\u3040-\u30ff]', e["zh"]):
            raise RuntimeError(f"Japanese kana leaked into Chinese meaning: {e['target']} -> {e['zh']}")

    for e in ko:
        if kr.get(e["target"]) != e["grade"]:
            raise RuntimeError(
                f"Korean grade mismatch {e['target']}: generated={e['grade']} map={kr.get(e['target'])}"
            )
        expected_level = "Intermediate" if e["grade"] == "중급" else "Advanced"
        if e["level"] != expected_level or e["topic"] != "TOPIK":
            raise RuntimeError(f"Korean level/topic mismatch: {e}")
        if re.search(r'[\uac00-\ud7a3]', e["zh"]):
            raise RuntimeError(f"Hangul leaked into Chinese meaning: {e['target']} -> {e['zh']}")

    banned_ja = {"日本", "何か", "あっ", "時", "者", "事", "分", "円", "性", "自殺", "物体ない"}
    banned_ko = {"하", "은", "게", "과", "면", "적", "요", "자", "여", "수상", "자살"}
    if banned_ja & ja_targets:
        raise RuntimeError(f"banned Japanese targets: {sorted(banned_ja & ja_targets)}")
    if banned_ko & ko_targets:
        raise RuntimeError(f"banned Korean targets: {sorted(banned_ko & ko_targets)}")
    if "copper coin" in ja_text.lower():
        raise RuntimeError("known Japanese homophone mismatch found")
    if "ː" in ko_text:
        raise RuntimeError("unsupported Korean length mark found")

    ja_all = _other_targets("Japanese") | ja_targets
    ko_all = _other_targets("Korean") | ko_targets
    print(f"FINAL_UNIQUE_TOTALS Japanese={len(ja_all)} Korean={len(ko_all)} Total={len(ja_all) + len(ko_all)}", flush=True)
    print("GAP_EXPANSION_AUDIT_OK", flush=True)
    print("Japanese=2300 N3=500 N2=1050 N1=750", flush=True)
    print("Korean=1700 중급=600 고급=1100", flush=True)
    for grade in JA_EXPECTED:
        _sample([x for x in ja if x["grade"] == grade], f"Japanese-{grade}")
    for grade in KO_EXPECTED:
        _sample([x for x in ko if x["grade"] == grade], f"Korean-{grade}")


def main() -> None:
    patch_builder()
    run_builder()
    audit()


if __name__ == "__main__":
    main()
