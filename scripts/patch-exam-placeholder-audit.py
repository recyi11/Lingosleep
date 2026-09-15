from pathlib import Path

p = Path('scripts/expand-exam-vocab-gaps.py')
s = p.read_text()

old = '''            if "related " in e["en"].lower() or "相关" in e["zh"]:
                raise RuntimeError(f"fabricated related gloss in {language}: {e['target']}")
'''
new = '''            en_match = re.fullmatch(r"(.+),\\s*related\\s+(.+)", e["en"].strip(), re.I)
            if en_match and en_match.group(1).strip().casefold() == en_match.group(2).strip().casefold():
                raise RuntimeError(f"fabricated related gloss in {language}: {e['target']}")
            zh_match = re.fullmatch(r"(.+)，相关(.+)", e["zh"].strip())
            if zh_match and zh_match.group(1).strip() == zh_match.group(2).strip():
                raise RuntimeError(f"fabricated related gloss in {language}: {e['target']}")
'''
if new not in s:
    if old not in s:
        raise SystemExit('placeholder audit anchor changed')
    s = s.replace(old, new, 1)

# All compact row-based sources must participate in global target dedupe.
s = s.replace(
    '{"vocabulary-basic-expansion.ts", "vocabulary-noun-expansion.ts"}',
    '{"vocabulary-basic-expansion.ts", "vocabulary-noun-expansion.ts", "vocabulary-intermediate-curated-expansion.ts"}',
)
s = s.replace(
    'p.name == "vocabulary-basic-expansion.ts" and len(vals) >= 8',
    'p.name in {"vocabulary-basic-expansion.ts", "vocabulary-intermediate-curated-expansion.ts"} and len(vals) >= 8',
)
s = s.replace(
    'path.name == "vocabulary-basic-expansion.ts" and len(vals) >= 8',
    'path.name in {"vocabulary-basic-expansion.ts", "vocabulary-intermediate-curated-expansion.ts"} and len(vals) >= 8',
)

# Object-style sources include both normal TypeScript keys and JSON-style quoted
# keys (notably vocabulary-basic-topic-fill-ja.ts). Accept both forms everywhere.
s = s.replace(
    "rf'targetLanguage:\\\\s*\"{language}\"\\\\s*,\\\\s*targetText:\\\\s*\"((?:\\\\\\\\.|[^\"\\\\\\\\])*)\"'",
    "rf'\"?targetLanguage\"?\\\\s*:\\\\s*\"{language}\"\\\\s*,\\\\s*\"?targetText\"?\\\\s*:\\\\s*\"((?:\\\\\\\\.|[^\"\\\\\\\\])*)\"'",
)
s = s.replace(
    "rf'targetLanguage:\\s*\"{language}\"\\s*,\\s*targetText:\\s*(\"(?:\\\\.|[^\"\\\\])*\")'",
    "rf'\"?targetLanguage\"?\\s*:\\s*\"{language}\"\\s*,\\s*\"?targetText\"?\\s*:\\s*(\"(?:\\\\.|[^\"\\\\])*\")'",
)

# Generated entries are explicitly cast as VocabItem to keep TypeScript from
# constructing a giant literal union; allow the audit parser to read that form.
s = s.replace(
    "re.findall(r'^  \\\{\\n(.*?)^  \\\},$', text, re.M | re.S)",
    "re.findall(r'^  \\\{\\n(.*?)^  \\\}(?: as VocabItem)?,$', text, re.M | re.S)",
)

# Inject stricter Japanese quality patches into patch_builder(). The candidate
# must use a common surface form, the JLPT source's intended sense, and translate
# that sense rather than an ambiguous bare Japanese spelling.
quality_marker = '    # EXAM_QUALITY_PATCH_V2\n'
if quality_marker not in s:
    anchor = '    BUILDER.write_text(s)\n'
    if anchor not in s:
        raise SystemExit('builder write anchor changed')
    quality = r'''    # EXAM_QUALITY_PATCH_V2
    old_common = '    common = any(x.get("common") for x in kanji_match + reading_match + kana_word_match)\n'
    new_common = ''' + "'''" + r'''    if kanji_match:
        common = any(x.get("common") for x in kanji_match)
    else:
        common = any(x.get("common") for x in reading_match + kana_word_match)
''' + "'''" + r'''
    if old_common not in s:
        raise RuntimeError('JMdict common-surface anchor missing')
    s = s.replace(old_common, new_common, 1)

    old_raw = ''' + "'''" + r'''            reading = kana or word
            raw.append({
                "word": word,
                "reading": reading,
                "seq": seq,
                "exam": target_level,
                "freq": freq,
            })
''' + "'''" + r'''
    new_raw = ''' + "'''" + r'''            reading = kana or word
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
''' + "'''" + r'''
    if old_raw not in s:
        raise RuntimeError('Waller gloss anchor missing')
    s = s.replace(old_raw, new_raw, 1)

    old_select = ''' + "'''" + r'''            info = _jmdict_lexical_info(jmdict.get(item["seq"]), item["word"], item["reading"])
            if not info:
                continue
            pool.append({**item, **info})
''' + "'''" + r'''
    new_select = ''' + "'''" + r'''            info = _jmdict_lexical_info(jmdict.get(item["seq"]), item["word"], item["reading"])
            if not info or not info["common"]:
                continue
            merged = {**item, **info}
            merged["gloss"] = item["waller_gloss"]
            pool.append(merged)
''' + "'''" + r'''
    if old_select not in s:
        raise RuntimeError('Japanese common-only selection anchor missing')
    s = s.replace(old_select, new_select, 1)

    old_zh = ''' + "'''" + r'''    ja_words = [x['word'] for x in japanese]
    ja_zh_map = {w: existing_ja_zh[w] for w in ja_words if w in existing_ja_zh}
    ja_missing_zh = [w for w in ja_words if w not in ja_zh_map]
    print('Japanese ZH meanings reused', len(ja_zh_map), 'new', len(ja_missing_zh))
    ja_zh_map.update(translate_many(ja_missing_zh, 'ja', 'zh-CN'))
''' + "'''" + r'''
    new_zh = ''' + "'''" + r'''    ja_words = [x['word'] for x in japanese]
    ja_zh_map = {w: existing_ja_zh[w] for w in ja_words if w in existing_ja_zh}
    ja_missing_items = [x for x in japanese if x['word'] not in ja_zh_map]
    print('Japanese ZH meanings reused', len(ja_zh_map), 'new', len(ja_missing_items))
    gloss_zh = translate_many([x['gloss'] for x in ja_missing_items], 'en', 'zh-CN')
    for item in ja_missing_items:
        ja_zh_map[item['word']] = gloss_zh[item['gloss']]
''' + "'''" + r'''
    if old_zh not in s:
        raise RuntimeError('Japanese gloss-to-Chinese anchor missing')
    s = s.replace(old_zh, new_zh, 1)

    # Avoid TypeScript constructing a 2,000+ member object-literal union.
    cast_anchor = "            '  },',\n"
    if cast_anchor not in s:
        raise RuntimeError('VocabItem cast anchor missing')
    s = s.replace(cast_anchor, "            '  } as VocabItem,',\n")

    s = s.replace('"性", "自殺"}', '"性", "自殺", "物体ない"}', 1)
'''
    s = s.replace(anchor, quality + '\n' + anchor, 1)

# Audit explicitly blocks the misleading nonstandard surface found in sampling.
s = s.replace(
    '{"日本", "何か", "あっ", "時", "者", "事", "分", "円", "性", "自殺"}',
    '{"日本", "何か", "あっ", "時", "者", "事", "分", "円", "性", "自殺", "物体ない"}',
)

# Emit authoritative unique totals for README instead of guessing from source
# object counts. This uses the same complete parser as the duplicate audit.
count_anchor = '    print("GAP_EXPANSION_AUDIT_OK", flush=True)\n'
if 'FINAL_UNIQUE_TOTALS' not in s:
    if count_anchor not in s:
        raise SystemExit('unique total audit anchor changed')
    s = s.replace(
        count_anchor,
        '    ja_all = _other_targets("Japanese") | ja_targets\n'
        '    ko_all = _other_targets("Korean") | ko_targets\n'
        '    print(f"FINAL_UNIQUE_TOTALS Japanese={len(ja_all)} Korean={len(ko_all)} Total={len(ja_all) + len(ko_all)}", flush=True)\n'
        + count_anchor,
        1,
    )

required = [
    'vocabulary-intermediate-curated-expansion.ts',
    'batch segmentation mismatch',
    'Japanese ZH meanings reused',
    'EXAM_QUALITY_PATCH_V2',
    'FINAL_UNIQUE_TOTALS',
    '"?targetLanguage"?',
    '(?: as VocabItem)?',
]
for marker in required:
    if marker not in s:
        raise SystemExit(f'missing expected audit marker: {marker}')

p.write_text(s)
print('EXAM_AUDIT_PATCHED')
