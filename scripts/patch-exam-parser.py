from pathlib import Path

p = Path('scripts/expand-exam-vocab-gaps.py')
s = p.read_text()
old = r"    for block in re.findall(r'^  \{\n(.*?)^  \},$', text, re.M | re.S):"
new = r"    for block in re.findall(r'^  \{\n(.*?)^  \}(?: as VocabItem)?,$', text, re.M | re.S):"
if new not in s:
    if old not in s:
        raise SystemExit('generated-entry parser anchor changed')
    s = s.replace(old, new, 1)
p.write_text(s)
print('EXAM_TYPED_ENTRY_PARSER_PATCHED')
