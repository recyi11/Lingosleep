import re
from pathlib import Path
from pykakasi import kakasi

vocab_path = Path("src/vocabulary-noun-expansion.ts")
text = vocab_path.read_text()
original = text

old_type = 'type NounPair = [topic: Topic, en: string, zh: string, ja: string, ko: string];'
new_type = 'type NounPair = [topic: Topic, en: string, zh: string, ja: string, jaReading: string, jaRomanization: string, ko: string];'
assert old_type in text, "NounPair type shape changed unexpectedly"
text = text.replace(old_type, new_type, 1)

old_sig = 'const makePair = (level: "Intermediate" | "Advanced", index: number, [topic, en, zh, ja, ko]: NounPair): VocabItem[] => {'
new_sig = 'const makePair = (level: "Intermediate" | "Advanced", index: number, [topic, en, zh, ja, jaReading, jaRomanization, ko]: NounPair): VocabItem[] => {'
assert old_sig in text, "makePair signature changed unexpectedly"
text = text.replace(old_sig, new_sig, 1)

old_ja = 'targetLanguage: "Japanese", targetText: ja, meanings: { English: en, "Simplified Chinese": zh }, reading: ja, romanization: "", level, topic,'
new_ja = 'targetLanguage: "Japanese", targetText: ja, meanings: { English: en, "Simplified Chinese": zh }, reading: jaReading, romanization: jaRomanization, level, topic,'
assert old_ja in text, "Japanese generated item shape changed unexpectedly"
text = text.replace(old_ja, new_ja, 1)

conv = kakasi()
row_re = re.compile(r'^(\s*)\["([^"]+)",\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]+)",\s*"([^"]+)"\],\s*$', re.M)
matches = list(row_re.finditer(text))
assert len(matches) == 250, f"Expected 250 noun concepts, found {len(matches)}"

def readings(value: str):
    parts = conv.convert(value)
    hira = "".join(p["hira"] for p in parts)
    roma = "".join(p["hepburn"] for p in parts)
    return hira, roma

def expand(match):
    indent, topic, en, zh, ja, ko = match.groups()
    hira, roma = readings(ja)
    return f'{indent}["{topic}", "{en}", "{zh}", "{ja}", "{hira}", "{roma}", "{ko}"],'

text = row_re.sub(expand, text)
assert text != original
vocab_path.write_text(text)

updated = vocab_path.read_text()
expanded_re = re.compile(r'^\s*\["([^"]+)",\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"\],\s*$', re.M)
rows = expanded_re.findall(updated)
assert len(rows) == 250, f"Expected 250 expanded concepts, found {len(rows)}"
cjk = re.compile(r"[一-龯々]")
bad = [(ja, reading) for _, _, _, ja, reading, _, _ in rows if cjk.search(reading)]
assert not bad, f"Readings still contain kanji: {bad[:10]}"
assert all(romanization.strip() for _, _, _, _, _, romanization, _ in rows)

reported = [(reading, romanization) for _, _, _, ja, reading, romanization, _ in rows if ja == "利害関係者"]
assert reported == [("りがいかんけいしゃ", "rigaikankeisha")], reported

main_path = Path("src/main.tsx")
main = main_path.read_text()
old_heading = '<h2>{currentItem?.targetText || t("Settling in")}</h2>'
new_heading = '<h2 className={currentItem ? `word-length-${Math.min(currentItem.targetText.length, 8)}` : undefined}>{currentItem?.targetText || t("Settling in")}</h2>'
assert old_heading in main
main = main.replace(old_heading, new_heading, 1)
old_meaning = '{currentItem.meanings[config.nativeLanguage]}：{currentItem.romanization}'
new_meaning = '{currentItem.meanings[config.nativeLanguage]}{currentItem.romanization ? `：${currentItem.romanization}` : ""}'
assert old_meaning in main
main = main.replace(old_meaning, new_meaning, 1)
main_path.write_text(main)

css_path = Path("src/styles.css")
css = css_path.read_text()
old_css = ".player-card h2 {\n  margin: 0;\n  font-size: 4.5rem;\n  line-height: 1;\n  letter-spacing: 0;\n}"
new_css = ".player-card h2 {\n  max-width: 100%;\n  margin: 0;\n  font-size: 4.5rem;\n  line-height: 1;\n  letter-spacing: 0;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: clip;\n}\n\n.player-card h2.word-length-5,\n.player-card h2.word-length-6 {\n  font-size: clamp(3rem, 12vw, 4rem);\n}\n\n.player-card h2.word-length-7,\n.player-card h2.word-length-8 {\n  font-size: clamp(2.25rem, 9.5vw, 3.25rem);\n}\n\n@media (max-width: 430px) {\n  .player-card h2.word-length-4 {\n    font-size: clamp(3.4rem, 15vw, 4.25rem);\n  }\n}"
assert old_css in css
css = css.replace(old_css, new_css, 1)
css_path.write_text(css)
