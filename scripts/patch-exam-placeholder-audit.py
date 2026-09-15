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

# There are three compact row-based vocabulary sources. They must participate in
# global target dedupe just like object-style VocabItem sources.
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

required = [
    'vocabulary-intermediate-curated-expansion.ts',
    'batch segmentation mismatch',
    'Japanese ZH meanings reused',
]
for marker in required:
    if marker not in s:
        raise SystemExit(f'missing expected audit marker: {marker}')

p.write_text(s)
print('EXAM_AUDIT_PATCHED')
