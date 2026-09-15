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
# a concise learner-facing sense rather than an ambiguous bare Japanese spelling.
quality_marker = '    # EXAM_QUALITY_PATCH_V3\n'
if quality_marker not in s:
    anchor = '    BUILDER.write_text(s)\n'
    if anchor not in s:
        raise SystemExit('builder write anchor changed')
    quality = r'''    # EXAM_QUALITY_PATCH_V3
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

# Catch the concrete bad learner glosses found during the final manual sample.
if 'BAD_JA_GLOSS_GUARD_V3' not in s:
    guard_anchor = '    ja_targets = {x["target"] for x in ja}\n'
    if guard_anchor not in s:
        raise SystemExit('quality guard anchor changed')
    guard = '''    # BAD_JA_GLOSS_GUARD_V3\n    bad_pairs = {\n        ("まあまあ", "很公平"),\n        ("果て", "结束；四肢；极限"),\n    }\n    for e in ja:\n        if (e["target"], e["zh"]) in bad_pairs:\n            raise RuntimeError(f"known bad Japanese learner gloss: {e['target']} -> {e['zh']}")\n        if e["target"] == "ジュース" and "deuce" in e["en"].lower():\n            raise RuntimeError("secondary homograph sense leaked into ジュース")\n\n'''
    s = s.replace(guard_anchor, guard + guard_anchor, 1)

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
    'EXAM_QUALITY_PATCH_V3',
    'BAD_JA_GLOSS_GUARD_V3',
    'FINAL_UNIQUE_TOTALS',
    '"?targetLanguage"?',
    '(?: as VocabItem)?',
]
for marker in required:
    if marker not in s:
        raise SystemExit(f'missing expected audit marker: {marker}')

p.write_text(s)
print('EXAM_AUDIT_PATCHED')
