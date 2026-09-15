from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GEN = ROOT / "scripts" / "build-exam-vocab-expansion.py"

s = GEN.read_text()

if "import zipfile\n" not in s:
    s = s.replace("import xml.etree.ElementTree as ET\n", "import xml.etree.ElementTree as ET\nimport zipfile\n", 1)

urls_anchor = '''KRDICT_URLS = [
    "https://raw.githubusercontent.com/studioego/krdict-converted/master/upstream/0.xml",
    "https://raw.githubusercontent.com/studioego/krdict-converted/master/upstream/1.xml",
]
'''
urls_replacement = urls_anchor + '''KRDICT_YOMITAN_EN = "https://github.com/Lyroxide/yomitan-ko-dic/releases/download/1.0.0/KO-EN.KRDICT.No.Examples.zip"
KRDICT_YOMITAN_ZH = "https://github.com/Lyroxide/yomitan-ko-dic/releases/download/1.0.0/KO-ZH.KRDICT.No.Examples.zip"
'''
if "KRDICT_YOMITAN_EN" not in s:
    if urls_anchor not in s:
        raise SystemExit("KRDICT URL anchor not found")
    s = s.replace(urls_anchor, urls_replacement, 1)

helper_anchor = "\ndef q(s: str) -> str:\n"
helpers = r'''
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
'''
if "def _load_krdict_yomitan_glosses(" not in s:
    if helper_anchor not in s:
        raise SystemExit("helper insertion anchor not found")
    s = s.replace(helper_anchor, "\n" + helpers + helper_anchor, 1)

old_write_ja = "        meaning_zh = zh_map[item['gloss']]\n"
new_write_ja = "        meaning_zh = zh_map[word]\n"
if old_write_ja not in s:
    raise SystemExit("Japanese writer meaning anchor not found")
s = s.replace(old_write_ja, new_write_ja, 1)

main_start = s.index("    # After ambiguous KRDICT spellings have been removed")
main_end = s.index("\n    write_ja(japanese, zh_map)", main_start)
new_main = r'''    # Use the official KRDICT multilingual Yomitan exports for concise
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
    ja_zh_map = translate_many([x['word'] for x in japanese], 'ja', 'zh-CN')
'''
s = s[:main_start] + new_main + s[main_end:]
s = s.replace("    write_ja(japanese, zh_map)\n    write_ko(korean, zh_map)\n", "    write_ja(japanese, ja_zh_map)\n    write_ko(korean, {})\n", 1)

GEN.write_text(s)
print("PATCH_V3_APPLIED")
