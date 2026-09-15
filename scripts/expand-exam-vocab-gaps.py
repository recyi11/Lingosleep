from __future__ import annotations

import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
BUILDER = ROOT / "scripts" / "build-exam-vocab-expansion.py"
README = ROOT / "README.md"
JA_PATH = SRC / "vocabulary-exam-expansion-ja.ts"
KO_PATH = SRC / "vocabulary-exam-expansion-ko.ts"


def patch_builder() -> None:
    s = BUILDER.read_text()
    replacements = [
        (
            'JA_TARGETS = {"N3": 200, "N2": 350, "N1": 250}',
            'JA_TARGETS = {"N3": 500, "N2": 1050, "N1": 750}',
        ),
        (
            'KO_TARGETS = {"중급": 250, "고급": 450}',
            'KO_TARGETS = {"중급": 600, "고급": 1100}',
        ),
        (
            '// 800 exam-oriented Japanese headwords: N3 200, N2 350, N1 250.',
            '// 2,300 exam-oriented Japanese headwords: N3 500, N2 1,050, N1 750.',
        ),
        (
            '// 700 exam-oriented Korean headwords: 중급 250, 고급 450.',
            '// 1,700 exam-oriented Korean headwords: 중급 600, 고급 1,100.',
        ),
        (
            'if len(japanese) != 800 or len(korean) != 700:',
            'if len(japanese) != 2300 or len(korean) != 1700:',
        ),
        (
            "if len({x['word'] for x in japanese}) != 800 or len({x['word'] for x in korean}) != 700:",
            "if len({x['word'] for x in japanese}) != 2300 or len({x['word'] for x in korean}) != 1700:",
        ),
    ]
    for old, new in replacements:
        if new in s:
            continue
        if old not in s:
            raise RuntimeError(f"builder patch anchor missing: {old}")
        s = s.replace(old, new, 1)
    BUILDER.write_text(s)


def run_builder() -> None:
    subprocess.run(["python", str(BUILDER)], cwd=ROOT, check=True)


def audit() -> None:
    ja = JA_PATH.read_text()
    ko = KO_PATH.read_text()

    expected = [
        (ja.count('targetLanguage: "Japanese"'), 2300, "Japanese count"),
        (ja.count('examLevel: "N3"'), 500, "N3 count"),
        (ja.count('examLevel: "N2"'), 1050, "N2 count"),
        (ja.count('examLevel: "N1"'), 750, "N1 count"),
        (ko.count('targetLanguage: "Korean"'), 1700, "Korean count"),
        (ko.count('koreanGrade: "중급"'), 600, "중급 count"),
        (ko.count('koreanGrade: "고급"'), 1100, "고급 count"),
    ]
    for actual, wanted, label in expected:
        if actual != wanted:
            raise RuntimeError(f"{label}: {actual} != {wanted}")

    jw = re.findall(r'targetText: "([^"]+)"', ja)
    kw = re.findall(r'targetText: "([^"]+)"', ko)
    if len(jw) != len(set(jw)) or len(jw) != 2300:
        raise RuntimeError("Japanese expansion contains duplicate targets")
    if len(kw) != len(set(kw)) or len(kw) != 1700:
        raise RuntimeError("Korean expansion contains duplicate targets")
    if any(len(w) < 2 or re.search(r"\s", w) for w in jw + kw):
        raise RuntimeError("non-standalone target found")

    ja_other: set[str] = set()
    ko_other: set[str] = set()
    for p in SRC.glob("vocabulary*.ts"):
        if p in {JA_PATH, KO_PATH, SRC / "vocabulary.ts"}:
            continue
        text = p.read_text()
        ja_other.update(
            re.findall(
                r'targetLanguage:\s*"Japanese"\s*,\s*targetText:\s*"([^"]+)"',
                text,
            )
        )
        ko_other.update(
            re.findall(
                r'targetLanguage:\s*"Korean"\s*,\s*targetText:\s*"([^"]+)"',
                text,
            )
        )
    ja_dupes = set(jw) & ja_other
    ko_dupes = set(kw) & ko_other
    if ja_dupes:
        raise RuntimeError(f"Japanese duplicates vs bundled sources: {sorted(ja_dupes)[:20]}")
    if ko_dupes:
        raise RuntimeError(f"Korean duplicates vs bundled sources: {sorted(ko_dupes)[:20]}")

    banned_ja = {"日本", "何か", "あっ", "時", "者", "事", "分", "円", "性"}
    banned_ko = {"하", "은", "게", "과", "면", "적", "요", "자", "여", "수상"}
    if banned_ja & set(jw):
        raise RuntimeError(f"banned Japanese targets: {banned_ja & set(jw)}")
    if banned_ko & set(kw):
        raise RuntimeError(f"banned Korean targets: {banned_ko & set(kw)}")

    for text in (ja, ko):
        for bad in ('English: ""', '"Simplified Chinese": ""', 'reading: ""', 'romanization: ""'):
            if bad in text:
                raise RuntimeError(f"empty generated field: {bad}")
        if re.search(r'English: "([^"\n]{1,80}), related \1"', text, re.I):
            raise RuntimeError("fake English related gloss found")
        if re.search(r'"Simplified Chinese": "([^"\n]{1,80})，相关\1"', text):
            raise RuntimeError("fake Chinese related gloss found")
    if "copper coin" in ja.lower():
        raise RuntimeError("known Japanese homophone mismatch found")
    if "ː" in ko:
        raise RuntimeError("unsupported Korean length mark found")

    print("GAP_EXPANSION_AUDIT_OK")
    print("Japanese=2300 N3=500 N2=1050 N1=750")
    print("Korean=1700 중급=600 고급=1100")
    print("Japanese sample:", jw[:30])
    print("Korean sample:", kw[:30])


def update_readme() -> None:
    s = README.read_text()
    old_table = """| Basic | 564 | 499 | 1,063 |
| Intermediate | 723 | 947 | 1,670 |
| Advanced | 1,268 | 902 | 2,170 |
| **Total** | **2,555** | **2,348** | **4,903** |"""
    new_table = """| Basic | 564 | 499 | 1,063 |
| Intermediate | 1,023 | 1,297 | 2,320 |
| Advanced | 2,468 | 1,552 | 4,020 |
| **Total** | **4,055** | **3,348** | **7,403** |"""
    if new_table not in s:
        if old_table not in s:
            raise RuntimeError("README vocabulary table anchor changed")
        s = s.replace(old_table, new_table, 1)

    old_ja = "**Japanese:** 800 additional JLPT-oriented headwords — N3 200, N2 350, N1 250."
    new_ja = "**Japanese:** 2,300 JLPT-oriented headwords — N3 500, N2 1,050, N1 750."
    if new_ja not in s:
        if old_ja not in s:
            raise RuntimeError("README Japanese coverage anchor changed")
        s = s.replace(old_ja, new_ja, 1)

    old_ko = "**Korean:** 700 additional exam-oriented headwords — learner grade `중급` 250 and `고급` 450."
    new_ko = "**Korean:** 1,700 exam-oriented headwords — learner grade `중급` 600 and `고급` 1,100."
    if new_ko not in s:
        if old_ko not in s:
            raise RuntimeError("README Korean coverage anchor changed")
        s = s.replace(old_ko, new_ko, 1)

    README.write_text(s)


def main() -> None:
    patch_builder()
    run_builder()
    audit()
    update_readme()


if __name__ == "__main__":
    main()
