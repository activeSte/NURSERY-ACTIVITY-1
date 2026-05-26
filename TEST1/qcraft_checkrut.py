"""
QCRAFT-CONDCHECKRUT — TEST 1
Reads student data from Excel, produces pivot summary and output report.
"""

import zipfile
import xml.etree.ElementTree as ET
import math
from pathlib import Path
from datetime import date
from collections import defaultdict

SRC = Path(__file__).parent / "source" / "TEST_1_Microsoft_Excel_Worksheet.xlsx"
OUT_RTF = Path(__file__).parent / "output" / "TEST1OUTPUT_REPORT.rtf"
OUT_TXT = Path(__file__).parent / "output" / "TEST1OUTPUT_REPORT.txt"

# ── 1. Parse Excel ────────────────────────────────────────────────────────────

def _shared_strings(zf):
    try:
        tree = ET.parse(zf.open("xl/sharedStrings.xml"))
        ns = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
        return [
            "".join(t.text or "" for t in si.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t"))
            for si in tree.findall(".//s:si", ns)
        ]
    except KeyError:
        return []

def _cell_value(cell, shared):
    ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
    v = cell.find(f"{{{ns}}}v")
    if v is None or v.text is None:
        return ""
    t = cell.get("t", "")
    if t == "s":
        return shared[int(v.text)]
    return v.text

def load_students(path):
    students = []
    with zipfile.ZipFile(path) as zf:
        shared = _shared_strings(zf)
        ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
        tree = ET.parse(zf.open("xl/worksheets/sheet1.xml"))
        rows = {
            int("".join(filter(str.isdigit, row.get("r", "0")))): {
                cell.get("r", ""): _cell_value(cell, shared)
                for cell in row.findall(f"{{{ns}}}c")
            }
            for row in tree.findall(f".//{{{ns}}}row")
        }
    for r in range(41, 62):
        row = rows.get(r, {})
        id_val   = row.get(f"D{r}", "").strip()
        name     = row.get(f"E{r}", "").strip()
        score    = row.get(f"F{r}", "").strip()
        topic    = row.get(f"G{r}", "").strip()
        test_type= row.get(f"H{r}", "").strip()
        if name:
            students.append({
                "id": id_val, "name": name,
                "score": float(score) if score else 0.0,
                "topic": topic, "test_type": test_type
            })
    return students

# ── 2. Analytics ──────────────────────────────────────────────────────────────

def pivot(students):
    groups = defaultdict(list)
    for s in students:
        groups[s["topic"]].append(s)
    result = {}
    for topic, grp in sorted(groups.items()):
        scores = [s["score"] for s in grp]
        result[topic] = {
            "students": sorted(grp, key=lambda x: -x["score"]),
            "count": len(scores),
            "mean": sum(scores) / len(scores),
            "min": min(scores),
            "max": max(scores),
            "pass": sum(1 for sc in scores if sc >= 60),
            "fail": sum(1 for sc in scores if sc < 60),
        }
    return result

def grade(score):
    if score >= 85: return "OTTIMO"
    if score >= 75: return "BUONO"
    if score >= 65: return "DISCRETO"
    if score >= 60: return "SUFFICIENTE"
    if score >= 40: return "MEDIOCRE"
    return "INSUFFICIENTE"

def score_stats(scores):
    n = len(scores)
    mean = sum(scores) / n
    variance = sum((x - mean) ** 2 for x in scores) / n
    stdev = math.sqrt(variance)
    sorted_s = sorted(scores)
    median = sorted_s[n // 2] if n % 2 else (sorted_s[n//2-1] + sorted_s[n//2]) / 2
    # frequency distribution bands
    bands = [
        ("INSUFFICIENTE  [0-39]",  lambda s: s < 40),
        ("MEDIOCRE      [40-59]",  lambda s: 40 <= s < 60),
        ("SUFFICIENTE   [60-64]",  lambda s: 60 <= s < 65),
        ("DISCRETO      [65-74]",  lambda s: 65 <= s < 75),
        ("BUONO         [75-84]",  lambda s: 75 <= s < 85),
        ("OTTIMO        [85-100]", lambda s: s >= 85),
    ]
    dist = [(label, sum(1 for s in scores if fn(s))) for label, fn in bands]
    return {"n": n, "mean": mean, "median": median, "stdev": stdev,
            "min": min(scores), "max": max(scores), "dist": dist}

# ── 3. Report builders ────────────────────────────────────────────────────────

def bar(count, total, width=20):
    filled = round(width * count / total) if total else 0
    return "█" * filled + "░" * (width - filled)

def build_txt(students, piv):
    all_scores = [s["score"] for s in students]
    stats = score_stats(all_scores)

    # ── A: Alphabetical roster ────────────────────────────────────────────────
    alpha = sorted(students, key=lambda x: x["name"])
    lines = [
        "=" * 68,
        "QCRAFT-CONDCHECKRUT  —  OUTPUT REPORT  —  TEST 1",
        f"Generated : {date.today().isoformat()}",
        f"Engine    : Lux Claude Code (LCC)",
        "=" * 68,
        "",
        "─" * 68,
        "SECTION A — NOMINATIVO  (alphabetical order)",
        "─" * 68,
        f"  {'#':<4}{'ID':<5}{'NAME':<18}{'SCORE':>6}  {'GRADE':<14}  TOPIC",
    ]
    for i, s in enumerate(alpha, 1):
        lines.append(
            f"  {i:<4}{s['id']:<5}{s['name']:<18}{s['score']:>6.0f}  "
            f"{grade(s['score']):<14}  {s['topic']}"
        )

    # ── B: Score / VOTO elaboration ───────────────────────────────────────────
    ranked = sorted(students, key=lambda x: -x["score"])
    lines += [
        "",
        "─" * 68,
        "SECTION B — VOTO ELABORATION",
        "─" * 68,
        "",
        "  B1. Descriptive Statistics — all 21 students",
        f"      Mean        : {stats['mean']:.2f} / 100",
        f"      Median      : {stats['median']:.1f} / 100",
        f"      Std Dev     : {stats['stdev']:.2f}",
        f"      Min / Max   : {stats['min']:.0f} / {stats['max']:.0f}",
        f"      Pass (≥60)  : {sum(1 for sc in all_scores if sc >= 60)} / {stats['n']}"
        f"  ({100*sum(1 for sc in all_scores if sc >= 60)/stats['n']:.0f}%)",
        f"      Fail (<60)  : {sum(1 for sc in all_scores if sc < 60)} / {stats['n']}",
        "",
        "  B2. Frequency Distribution",
        f"  {'BAND':<26} {'N':>3}  HISTOGRAM",
    ]
    for label, count in stats["dist"]:
        lines.append(f"  {label:<26} {count:>3}  {bar(count, stats['n'])} "
                     f"({100*count/stats['n']:.0f}%)")

    lines += [
        "",
        "  B3. Per-Topic Statistics",
        f"  {'TOPIC':<30} {'N':>3}  {'MEAN':>6}  {'MED':>5}  {'σ':>5}  PASS",
    ]
    for topic, stat in piv.items():
        ts = score_stats([s["score"] for s in stat["students"]])
        lines.append(
            f"  {topic:<30} {ts['n']:>3}  {ts['mean']:>6.1f}  "
            f"{ts['median']:>5.1f}  {ts['stdev']:>5.2f}  "
            f"{stat['pass']}/{ts['n']}"
        )

    lines += [
        "",
        "  B4. Ranking by VOTO (descending)",
        f"  {'RK':<4}{'NAME':<18}{'SCORE':>6}  {'GRADE':<14}  TOPIC",
    ]
    for i, s in enumerate(ranked, 1):
        lines.append(
            f"  {i:<4}{s['name']:<18}{s['score']:>6.0f}  "
            f"{grade(s['score']):<14}  {s['topic']}"
        )

    # ── C: KPI dashboard ──────────────────────────────────────────────────────
    best_topic = max(piv, key=lambda t: piv[t]["mean"])
    weak_topic = min(piv, key=lambda t: piv[t]["mean"])
    lines += [
        "",
        "─" * 68,
        "SECTION C — KPI DASHBOARD",
        "─" * 68,
        f"  Total students   : {stats['n']}",
        f"  Overall mean     : {stats['mean']:.1f} / 100",
        f"  Overall median   : {stats['median']:.1f} / 100",
        f"  Std deviation    : {stats['stdev']:.2f}  (spread indicator)",
        f"  Pass rate        : {sum(1 for sc in all_scores if sc >= 60)}/{stats['n']}"
        f"  ({100*sum(1 for sc in all_scores if sc >= 60)/stats['n']:.0f}%)",
        f"  Top scorer       : {ranked[0]['name']}  [{ranked[0]['score']:.0f}]",
        f"  Lowest scorer    : {ranked[-1]['name']}  [{ranked[-1]['score']:.0f}]",
        f"  Strongest topic  : {best_topic}  (mean {piv[best_topic]['mean']:.1f})",
        f"  Weakest topic    : {weak_topic}  (mean {piv[weak_topic]['mean']:.1f})",
        "",
        "=" * 68,
        "END OF REPORT  —  QCRAFT-CONDCHECKRUT / RUT: R-U-T  —  LCC",
        "=" * 68,
    ]
    return "\n".join(lines)

def build_rtf(txt_report):
    body = txt_report.replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}")
    lines = body.split("\n")
    rtf_lines = "\n".join(r"\pard " + l + r"\par" for l in lines)
    return (
        r"{\rtf1\ansi\deff0"
        r"{\fonttbl{\f0\fmodern\fcharset0 Courier New;}}"
        r"{\colortbl;\red0\green0\blue0;}"
        r"\f0\fs20\cf1 " + rtf_lines + "}"
    )

# ── 4. Main ───────────────────────────────────────────────────────────────────

def main():
    OUT_TXT.parent.mkdir(parents=True, exist_ok=True)
    students = load_students(SRC)
    piv = pivot(students)
    txt = build_txt(students, piv)
    OUT_TXT.write_text(txt, encoding="utf-8")
    OUT_RTF.write_text(build_rtf(txt), encoding="utf-8")
    print(txt)
    print(f"\n[LCC] Reports written to {OUT_TXT.parent}/")

if __name__ == "__main__":
    main()
