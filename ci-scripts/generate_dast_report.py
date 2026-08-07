#!/usr/bin/env python3
# merges the staging OWASP ZAP + k6 results into one readable HTML page.
# same spirit as generate_report.py: written for people who won't open raw
# JSON, with the raw files copied alongside for those who will.
#
# usage: python3 generate_dast_report.py --dest /path/to/output
# reads Jenkins' own env vars (BUILD_NUMBER, GIT_COMMIT, GIT_BRANCH, ...)

import argparse
import datetime
import glob
import html
import json
import os
import shutil

ZAP_DIR = "reports/zap"
K6_DIR = "reports/k6"

# ZAP riskcode -> (label, css class). 0/1 are noise-level in a baseline scan,
# 2/3 are what someone should actually look at.
RISK_LEVELS = {
    "3": ("High", "sev-high"),
    "2": ("Medium", "sev-med"),
    "1": ("Low", "sev-low"),
    "0": ("Informational", "sev-info"),
}


def env(name, default="(unknown)"):
    return os.environ.get(name, default) or default


def load_json(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def zap_findings():
    """Flatten every zap-*.json into (target, risk, name, count, desc, solution)."""
    findings = []
    scanned_targets = []
    for path in sorted(glob.glob(os.path.join(ZAP_DIR, "zap-*.json"))):
        data = load_json(path)
        if not data:
            continue
        for site in data.get("site", []):
            target = site.get("@name") or os.path.basename(path)
            scanned_targets.append(target)
            for alert in site.get("alerts", []):
                findings.append({
                    "target": target,
                    "riskcode": str(alert.get("riskcode", "0")),
                    "name": alert.get("name", "(unnamed alert)"),
                    "count": len(alert.get("instances", [])),
                    "desc": alert.get("desc", ""),
                    "solution": alert.get("solution", ""),
                })
    # highest risk first, then noisiest
    findings.sort(key=lambda f: (-int(f["riskcode"] or 0), -f["count"]))
    return findings, scanned_targets


def k6_summary():
    data = load_json(os.path.join(K6_DIR, "k6-summary.json"))
    if not data:
        return None
    metrics = data.get("metrics", {})

    def metric(name, key, default=None):
        return (metrics.get(name) or {}).get(key, default)

    checks = metrics.get("checks") or {}
    passes = checks.get("passes", 0) or 0
    fails = checks.get("fails", 0) or 0
    total_checks = passes + fails

    return {
        "requests": metric("http_reqs", "count", 0),
        "rps": metric("http_reqs", "rate", 0),
        # k6 writes the percentile key literally as "p(95)"
        "p95": metric("http_req_duration", "p(95)", 0),
        "avg": metric("http_req_duration", "avg", 0),
        "max": metric("http_req_duration", "max", 0),
        "failed_rate": metric("http_req_failed", "rate", 0),
        "checks_passed": passes,
        "checks_failed": fails,
        "checks_rate": (passes / total_checks * 100) if total_checks else 0,
    }


def strip_html(text, limit=400):
    """ZAP descriptions arrive as HTML fragments; flatten for a table cell."""
    out = []
    depth = 0
    for ch in text or "":
        if ch == "<":
            depth += 1
        elif ch == ">":
            depth = max(0, depth - 1)
        elif depth == 0:
            out.append(ch)
    flat = " ".join("".join(out).split())
    return flat[:limit] + ("..." if len(flat) > limit else "")


CSS = """
:root {
  --bg: #ffffff; --fg: #1a1d23; --muted: #5c6370; --line: #e3e6ea;
  --card: #f7f8fa; --accent: #2f6feb;
  --high: #d1242f; --med: #bc4c00; --low: #1a7f37; --info: #57606a;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0d1117; --fg: #e6edf3; --muted: #9198a1; --line: #30363d;
    --card: #161b22; --accent: #4493f8;
    --high: #f85149; --med: #db6d28; --low: #3fb950; --info: #8b949e;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0; padding: 2rem 1.25rem; background: var(--bg); color: var(--fg);
  font: 15px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
.wrap { max-width: 1000px; margin: 0 auto; }
h1 { font-size: 1.6rem; margin: 0 0 .25rem; }
h2 { font-size: 1.15rem; margin: 2.25rem 0 .75rem; padding-bottom: .4rem; border-bottom: 1px solid var(--line); }
.sub { color: var(--muted); margin: 0 0 1.5rem; font-size: .9rem; }
.meta { display: flex; flex-wrap: wrap; gap: .5rem 1.5rem; padding: .9rem 1.1rem;
        background: var(--card); border: 1px solid var(--line); border-radius: 8px; font-size: .88rem; }
.meta div { white-space: nowrap; }
.meta span { color: var(--muted); }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: .75rem; margin: 1rem 0; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: .9rem 1rem; }
.card .n { font-size: 1.5rem; font-weight: 600; }
.card .l { color: var(--muted); font-size: .82rem; }
.table-scroll { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: .89rem; }
th, td { text-align: left; padding: .6rem .7rem; border-bottom: 1px solid var(--line); vertical-align: top; }
th { color: var(--muted); font-weight: 600; white-space: nowrap; }
.pill { display: inline-block; padding: .1rem .55rem; border-radius: 999px; font-size: .78rem;
        font-weight: 600; color: #fff; white-space: nowrap; }
.sev-high { background: var(--high); } .sev-med { background: var(--med); }
.sev-low  { background: var(--low); }  .sev-info { background: var(--info); }
.empty { padding: 1.1rem; background: var(--card); border: 1px solid var(--line);
         border-radius: 8px; color: var(--muted); }
.ok { color: var(--low); font-weight: 600; }
footer { margin-top: 2.5rem; padding-top: 1rem; border-top: 1px solid var(--line);
         color: var(--muted); font-size: .82rem; }
code { background: var(--card); padding: .1rem .35rem; border-radius: 4px; font-size: .85em; }
"""


def render(findings, targets, k6, generated_at):
    e = html.escape
    counts = {c: 0 for c in RISK_LEVELS}
    for f in findings:
        counts[f["riskcode"]] = counts.get(f["riskcode"], 0) + 1

    parts = [
        "<!DOCTYPE html><html lang='en'><head><meta charset='utf-8'>",
        "<meta name='viewport' content='width=device-width, initial-scale=1'>",
        "<title>Matchy+ Staging DAST &amp; Performance</title>",
        f"<style>{CSS}</style></head><body><div class='wrap'>",
        "<h1>Staging security &amp; performance</h1>",
        "<p class='sub'>OWASP ZAP baseline scan and k6 load test, run against the "
        "staging environment right after it was deployed.</p>",
        "<div class='meta'>",
        f"<div><span>Build</span> #{e(env('BUILD_NUMBER'))}</div>",
        f"<div><span>Branch</span> {e(env('GIT_BRANCH'))}</div>",
        f"<div><span>Commit</span> <code>{e(env('GIT_COMMIT')[:12])}</code></div>",
        f"<div><span>Image tag</span> <code>{e(env('IMAGE_TAG'))}</code></div>",
        f"<div><span>Generated</span> {e(generated_at)}</div>",
        "</div>",
    ]

    # ---- ZAP ----
    parts.append("<h2>OWASP ZAP &mdash; baseline scan</h2>")
    if not findings and not targets:
        parts.append("<div class='empty'>No ZAP results were produced. The scan "
                     "stage may have been skipped or failed before writing a report.</div>")
    else:
        parts.append("<div class='cards'>")
        for code in ("3", "2", "1", "0"):
            label, cls = RISK_LEVELS[code]
            parts.append(
                f"<div class='card'><div class='n {cls.replace('sev-', 'txt-')}'>"
                f"{counts.get(code, 0)}</div><div class='l'>{label}</div></div>"
            )
        parts.append("</div>")
        if targets:
            parts.append("<p class='sub'>Scanned: " +
                         ", ".join(f"<code>{e(t)}</code>" for t in dict.fromkeys(targets)) + "</p>")

        high_med = [f for f in findings if f["riskcode"] in ("3", "2")]
        if not high_med:
            parts.append("<div class='empty'><span class='ok'>No High or Medium "
                         "risk alerts.</span> Lower-severity findings are listed below.</div>")

        parts.append("<div class='table-scroll'><table><thead><tr>"
                     "<th>Risk</th><th>Alert</th><th>Target</th><th>Count</th>"
                     "<th>What it means</th></tr></thead><tbody>")
        for f in findings:
            label, cls = RISK_LEVELS.get(f["riskcode"], ("Unknown", "sev-info"))
            parts.append(
                f"<tr><td><span class='pill {cls}'>{label}</span></td>"
                f"<td>{e(f['name'])}</td><td><code>{e(f['target'])}</code></td>"
                f"<td>{f['count']}</td><td>{e(strip_html(f['desc']))}</td></tr>"
            )
        parts.append("</tbody></table></div>")

    # ---- k6 ----
    parts.append("<h2>k6 &mdash; load test</h2>")
    if not k6:
        parts.append("<div class='empty'>No k6 summary was produced. The load "
                     "test stage may have been skipped or failed before writing results.</div>")
    else:
        parts.append("<div class='cards'>")
        for value, label in (
            (f"{int(k6['requests']):,}", "Requests"),
            (f"{k6['rps']:.1f}/s", "Throughput"),
            (f"{k6['p95']:.0f} ms", "p95 latency"),
            (f"{k6['avg']:.0f} ms", "Average latency"),
            (f"{k6['max']:.0f} ms", "Slowest request"),
            (f"{k6['failed_rate'] * 100:.2f}%", "Failed requests"),
            (f"{k6['checks_rate']:.1f}%", "Checks passed"),
        ):
            parts.append(f"<div class='card'><div class='n'>{e(value)}</div>"
                         f"<div class='l'>{e(label)}</div></div>")
        parts.append("</div>")
        parts.append(
            f"<p class='sub'>{k6['checks_passed']} checks passed, "
            f"{k6['checks_failed']} failed. Thresholds: p95 under 1500&nbsp;ms, "
            "under 5% failed requests, over 95% checks passing. A breach marks the "
            "build unstable rather than failing it.</p>"
        )

    parts.append(
        "<footer>Neither of these stages blocks a deploy. ZAP runs a passive "
        "baseline scan (no attack traffic) and k6 applies deliberately modest "
        "load, because staging shares a 4-core host with the CI that builds it "
        "&mdash; heavier load would measure host contention, not the app. Raw "
        "<code>zap-*.json</code>, <code>zap-*.html</code> and "
        "<code>k6-summary.json</code> files are archived next to this report."
        "</footer></div></body></html>"
    )
    return "\n".join(parts)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dest", required=True)
    args = parser.parse_args()

    os.makedirs(args.dest, exist_ok=True)

    findings, targets = zap_findings()
    k6 = k6_summary()
    generated_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with open(os.path.join(args.dest, "index.html"), "w", encoding="utf-8") as f:
        f.write(render(findings, targets, k6, generated_at))

    # copy the raw artefacts next to the summary so the detail is one click away
    for src_dir in (ZAP_DIR, K6_DIR):
        if not os.path.isdir(src_dir):
            continue
        for name in os.listdir(src_dir):
            src = os.path.join(src_dir, name)
            if os.path.isfile(src):
                try:
                    shutil.copy2(src, os.path.join(args.dest, name))
                except Exception:
                    pass

    print(f"DAST report written to {args.dest}/index.html "
          f"({len(findings)} ZAP alerts, k6 {'present' if k6 else 'missing'})")


if __name__ == "__main__":
    main()
