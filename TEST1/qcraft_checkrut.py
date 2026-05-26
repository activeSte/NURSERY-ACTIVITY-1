"""
QCRAFT-CONDCHECKRUT — TEST 1
Reads student data from Excel, produces pivot summary and output report.
"""

import zipfile
import xml.etree.ElementTree as ET
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

# ── 3. Report builders ────────────────────────────────────────────────────────

def build_txt(students, piv):
    all_scores = [s["score"] for s in students]
    lines = [
        "=" * 68,
        "QCRAFT-CONDCHECKRUT  —  OUTPUT REPORT  —  TEST 1",
        f"Generated: {date.today().isoformat()}",
        "=" * 68,
        "",
        "QUEST : QUOTE E SCRITTURA / DESIGNAZIONE FILETTATURE / LINGUETTE",
        "ROLE  : Lux Claude Code (LCC)",
        "TYPE  : LINGUETTE E CHIAVETTE",
        "",
        "─" * 68,
        "PIVOT SUMMARY BY TOPIC",
        "─" * 68,
    ]
    for topic, stat in piv.items():
        lines += [
            f"\n  {topic}",
            f"  {'Students':12s} {stat['count']}",
            f"  {'Mean':12s} {stat['mean']:.1f}",
            f"  {'Min':12s} {stat['min']:.0f}",
            f"  {'Max':12s} {stat['max']:.0f}",
            f"  {'Pass (≥60)':12s} {stat['pass']}  |  Fail: {stat['fail']}",
        ]

    lines += [
        "",
        "─" * 68,
        "RANKING — ALL STUDENTS",
        "─" * 68,
        f"  {'#':<4}{'ID':<5}{'NAME':<18}{'SCORE':>6}  {'GRADE':<14}  TOPIC",
    ]
    ranked = sorted(students, key=lambda x: -x["score"])
    for i, s in enumerate(ranked, 1):
        lines.append(
            f"  {i:<4}{s['id']:<5}{s['name']:<18}{s['score']:>6.0f}  "
            f"{grade(s['score']):<14}  {s['topic']}"
        )

    lines += [
        "",
        "─" * 68,
        "OVERALL KPIs",
        "─" * 68,
        f"  Total students : {len(students)}",
        f"  Overall mean   : {sum(all_scores)/len(all_scores):.1f} / 100",
        f"  Pass rate      : {sum(1 for sc in all_scores if sc >= 60)}/{len(all_scores)} "
        f"({100*sum(1 for sc in all_scores if sc >= 60)/len(all_scores):.0f}%)",
        f"  Top scorer     : {ranked[0]['name']}  [{ranked[0]['score']:.0f}]",
        f"  Lowest scorer  : {ranked[-1]['name']}  [{ranked[-1]['score']:.0f}]",
        "",
        "=" * 68,
        "END OF REPORT  —  QCRAFT-CONDCHECKRUT / RUT: R-U-T",
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
