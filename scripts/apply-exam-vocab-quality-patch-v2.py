from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GEN = ROOT / "scripts" / "build-exam-vocab-expansion.py"

s = GEN.read_text()

# Japanese: keep one primary JMdict gloss. This prevents machine-translated
# multi-gloss strings such as "all members; all hands; everyone" from turning
# into awkward Chinese meanings while retaining the exact JMdict sense selected
# by the JLPT source's jmdict_seq.
old = '''            if len(glosses) >= 3:\n                break\n'''
new = '''            if len(glosses) >= 1:\n                break\n'''
if old not in s:
    raise SystemExit("JMdict gloss limit anchor not found")
s = s.replace(old, new, 1)

ko_start = s.index("def choose_korean(")
ko_end = s.index("\ndef q(", ko_start)

ko_block = r'''def choose_korean(grade_map: dict[str, str], existing: set[str]) -> list[dict]:
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
    known_bad = {"하", "은", "게", "과", "면", "적", "요", "자", "여"}
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
'''

s = s[:ko_start] + ko_block + s[ko_end:]

old_trans = '''    missing_ko_en = [x['definition_ko'] for x in korean if not x['gloss']]
    ko_en_by_definition = translate_many(missing_ko_en, 'ko', 'en') if missing_ko_en else {}
    missing_ko_zh = [x['definition_ko'] for x in korean if not x['zh']]
    ko_zh_by_definition = translate_many(missing_ko_zh, 'ko', 'zh-CN') if missing_ko_zh else {}
    for item in korean:
        if not item['gloss']:
            item['gloss'] = concise_gloss(ko_en_by_definition[item['definition_ko']])
        if not item['zh']:
            item['zh'] = ko_zh_by_definition[item['definition_ko']].strip()
        if not item['gloss'] or not item['zh']:
            raise RuntimeError(f"empty Korean meaning for {item['word']}")

    need_zh = [x['gloss'] for x in japanese]
    zh_map = translate_many(need_zh, 'en', 'zh-CN')
'''
new_trans = '''    # After ambiguous KRDICT spellings have been removed, translating the
    # headword itself gives a much shorter sleep-study meaning than translating
    # a full dictionary definition. Official equivalents still take priority.
    missing_ko_en = [x['word'] for x in korean if not x['gloss']]
    ko_en_by_word = translate_many(missing_ko_en, 'ko', 'en') if missing_ko_en else {}
    missing_ko_zh = [x['word'] for x in korean if not x['zh']]
    ko_zh_by_word = translate_many(missing_ko_zh, 'ko', 'zh-CN') if missing_ko_zh else {}
    for item in korean:
        if not item['gloss']:
            item['gloss'] = concise_gloss(ko_en_by_word[item['word']])
        if not item['zh']:
            item['zh'] = ko_zh_by_word[item['word']].strip()
        if not item['gloss'] or not item['zh']:
            raise RuntimeError(f"empty Korean meaning for {item['word']}")

    need_zh = [x['gloss'] for x in japanese]
    zh_map = translate_many(need_zh, 'en', 'zh-CN')
'''
if old_trans not in s:
    raise SystemExit("Korean translation block anchor not found")
s = s.replace(old_trans, new_trans, 1)

GEN.write_text(s)
print("PATCH_V2_APPLIED")
