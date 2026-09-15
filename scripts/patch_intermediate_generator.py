from pathlib import Path

path = Path('scripts/generate_intermediate_curated_expansion.py')
text = path.read_text()

old_parse = "for line in RAW.strip().splitlines():\n    parts = [p.strip() for p in line.split('|')]"
new_parse = "for line in RAW.strip().splitlines():\n    if not line.strip():\n        continue\n    parts = [p.strip() for p in line.split('|')]"
if old_parse in text:
    text = text.replace(old_parse, new_parse, 1)

start = text.index('selected = []\nseen_ja = set()\nseen_ko = set()')
end_marker = 'assert len(selected) == 250'
end = text.index(end_marker, start) + len(end_marker)

replacement = '''selected = []
seen_ja = set()
seen_ko = set()

def is_fresh(row):
    _, _, _, _, ja, ko = row
    return (
        ja not in existing['Japanese']
        and ko not in existing['Korean']
        and ja not in seen_ja
        and ko not in seen_ko
    )

# Preserve intended topic balance wherever the current repository still has fresh headwords.
for topic, quota in QUOTAS.items():
    accepted = []
    for row in by_topic[topic]:
        if not is_fresh(row):
            continue
        accepted.append(row)
        seen_ja.add(row[4])
        seen_ko.add(row[5])
        if len(accepted) == quota:
            break
    selected.extend(accepted)
    print(f'{topic}: selected {len(accepted)} / target {quota}')

# Fill shortfalls from other curated categories rather than forcing low-quality filler.
if len(selected) < 250:
    for row in candidates:
        if len(selected) == 250:
            break
        if not is_fresh(row):
            continue
        selected.append(row)
        seen_ja.add(row[4])
        seen_ko.add(row[5])

if len(selected) != 250:
    raise SystemExit(f'Only {len(selected)} globally fresh curated concepts available; need 250')'''

text = text[:start] + replacement + text[end:]
path.write_text(text)
