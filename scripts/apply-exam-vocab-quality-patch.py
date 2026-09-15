from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GEN = ROOT / "scripts" / "build-exam-vocab-expansion.py"

s = GEN.read_text()

if "import tarfile\n" not in s:
    s = s.replace("import re\n", "import re\nimport tarfile\n", 1)

ja_start = s.index("def choose_japanese(")
ja_end = s.index("\ndef local(", ja_start)

ja_block = r'''def _jmdict_pos_allowed(tags: list[str]) -> bool:
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

    common = any(x.get("common") for x in kanji_match + reading_match + kana_word_match)
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
            if len(glosses) >= 3:
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
    known_bad = {"日本", "何か", "あっ", "時", "者", "事", "分", "円", "性"}
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
            raw.append({
                "word": word,
                "reading": reading,
                "seq": seq,
                "exam": target_level,
                "freq": freq,
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
            if not info:
                continue
            pool.append({**item, **info})
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
'''

s = s[:ja_start] + ja_block + s[ja_end:]

ko_start = s.index("def choose_korean(")
ko_end = s.index("\ndef q(", ko_start)

ko_block = r'''def choose_korean(grade_map: dict[str, str], existing: set[str]) -> list[dict]:
    tmp = ROOT / '.tmp-krdict'
    tmp.mkdir(exist_ok=True)
    pools: dict[str, list[dict]] = {k: [] for k in KO_TARGETS}
    seen_source: set[str] = set()
    known_bad = {"하", "은", "게", "과", "면", "적", "요", "자", "여"}
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
            if not valid_headword(word) or len(word) < 2:
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
            raise RuntimeError(f"not enough Korean {grade}: {len(pool)} < {wanted}")
        take = pool[:wanted]
        chosen.extend(take)
        used.update(x['word'] for x in take)
        print(grade, 'validated candidates', len(pool), 'selected', len(take))
    return chosen
'''

s = s[:ko_start] + ko_block + s[ko_end:]

old_example = "example = f\"시험 준비를 하며 '{word}'라는 단어를 복습했어요.\""
new_example = "example = f\"시험 준비를 하며 다음 단어를 복습했어요. {word}.\""
if old_example not in s:
    raise SystemExit("Korean example anchor not found")
s = s.replace(old_example, new_example, 1)

old_main = '''    missing_ko_en = [x['definition_ko'] for x in korean if not x['gloss']]
    ko_en_by_definition = translate_many(missing_ko_en, 'ko', 'en') if missing_ko_en else {}
    for item in korean:
        if not item['gloss']:
            item['gloss'] = concise_gloss(ko_en_by_definition[item['definition_ko']])
        if not item['gloss']:
            raise RuntimeError(f"empty Korean English meaning for {item['word']}")

    need_zh = [x['gloss'] for x in japanese]
    need_zh += [x['gloss'] for x in korean if not x['zh']]
    zh_map = translate_many(need_zh, 'en', 'zh-CN')
'''
new_main = '''    missing_ko_en = [x['definition_ko'] for x in korean if not x['gloss']]
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
if old_main not in s:
    raise SystemExit("translation block anchor not found")
s = s.replace(old_main, new_main, 1)

GEN.write_text(s)
print("PATCH_APPLIED")
