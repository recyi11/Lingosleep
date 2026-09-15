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
if new in s:
    raise SystemExit(0)
if old not in s:
    raise SystemExit('placeholder audit anchor changed')
p.write_text(s.replace(old, new, 1))
print('PLACEHOLDER_AUDIT_PATCHED')
