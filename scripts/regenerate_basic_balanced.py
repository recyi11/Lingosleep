import re
from collections import Counter, defaultdict
from pathlib import Path
from pykakasi import kakasi

source = Path('scripts/generate_basic_curated_expansion.py').read_text()
raw = source.split("RAW = r'''", 1)[1].split("'''", 1)[0]
candidates = []
for line in raw.strip().splitlines():
    parts = [p.strip() for p in line.split('|')]
    if len(parts) != 6:
        raise ValueError(f'Bad candidate row: {line}')
    candidates.append(parts)

# Compare only against the original Basic course data. The generated expansion itself
# is being replaced by this script, so it must not exclude its previous contents.
existing = {'Japanese': set(), 'Korean': set()}
object_re = re.compile(r'targetLanguage:\s*"(Japanese|Korean)".*?targetText:\s*"([^"]+)".*?level:\s*"Basic"', re.S)
text = Path('src/vocabulary-basic.ts').read_text()
for lang, target in object_re.findall(text):
    existing[lang].add(target)

available = defaultdict(list)
seen_ja = set()
seen_ko = set()
for topic, pos, en, zh, ja, ko in candidates:
    if ja in existing['Japanese'] or ko in existing['Korean']:
        continue
    if ja in seen_ja or ko in seen_ko:
        continue
    available[topic].append((topic, pos, en, zh, ja, ko))
    seen_ja.add(ja)
    seen_ko.add(ko)

# 250 concepts = 500 language entries. The quota intentionally preserves a large
# verb block while keeping Basic strongly grounded in everyday nouns.
quotas = {
    'food': 35,
    'travel': 35,
    'daily life': 60,
    'work': 30,
    'school': 30,
    'anime/drama': 15,
    'common verbs': 45,
}
assert sum(quotas.values()) == 250

selected = []
for topic, quota in quotas.items():
    pool = available[topic]
    if len(pool) < quota:
        raise SystemExit(f'Not enough unique {topic} candidates: have {len(pool)}, need {quota}')
    selected.extend(pool[:quota])

assert len(selected) == 250
assert len({r[4] for r in selected}) == 250
assert len({r[5] for r in selected}) == 250

conv = kakasi()
def reading_and_romaji(value: str):
    parts = conv.convert(value)
    return ''.join(p['hira'] for p in parts), ''.join(p['hepburn'] for p in parts)

def q(value: str):
    return value.replace('\\', '\\\\').replace('"', '\\"')

lines = [
    'import type { Topic, VocabItem } from "./vocabulary";',
    '',
    '// Curated Basic expansion: 250 standalone concepts x Japanese/Korean = 500 entries.',
    '// High-frequency standalone vocabulary only; no modifier+noun combinatorial filler.',
    'type BasicRow = [topic: Topic, pos: "noun" | "verb", en: string, zh: string, ja: string, jaReading: string, jaRomanization: string, ko: string];',
    '',
    'const rows: BasicRow[] = [',
]
for topic, pos, en, zh, ja, ko in selected:
    reading, romaji = reading_and_romaji(ja)
    lines.append(f'  ["{q(topic)}", "{q(pos)}", "{q(en)}", "{q(zh)}", "{q(ja)}", "{q(reading)}", "{q(romaji)}", "{q(ko)}"],')
lines += [
    '];',
    '',
    'export const basicCuratedExpansion: VocabItem[] = rows.flatMap(([topic, pos, en, zh, ja, jaReading, jaRomanization, ko], index) => {',
    '  const suffix = String(index + 1).padStart(3, "0");',
    '  return [',
    '    { id: `ja-basic-curated-${suffix}`, targetLanguage: "Japanese", targetText: ja, meanings: { English: en, "Simplified Chinese": zh }, reading: jaReading, romanization: jaRomanization, level: "Basic", topic, exampleSentence: `「${ja}」を覚えます。`, exampleTranslations: { English: `I am learning the word “${en}”.`, "Simplified Chinese": `我在学习“${zh}”这个词。` } },',
    '    { id: `ko-basic-curated-${suffix}`, targetLanguage: "Korean", targetText: ko, meanings: { English: en, "Simplified Chinese": zh }, reading: ko, romanization: "", level: "Basic", topic, exampleSentence: `“${ko}”라는 단어를 배워요.`, exampleTranslations: { English: `I am learning the word “${en}”.`, "Simplified Chinese": `我在学习“${zh}”这个词。` } },',
    '  ];',
    '});',
    '',
]
Path('src/vocabulary-basic-expansion.ts').write_text('\n'.join(lines))
print('Generated balanced Basic expansion: 250 concepts / 500 entries')
for topic, count in sorted(Counter(r[0] for r in selected).items()):
    print(f'  {topic}: {count}')
