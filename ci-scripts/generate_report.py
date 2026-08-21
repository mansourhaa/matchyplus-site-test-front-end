#!/usr/bin/env python3
# builds a pipeline report in plain language (report.html + summary.md) for
# people who don't live in DevSecOps tooling all day. raw scan files get
# copied next to it for anyone who wants the details.
#
# usage: python3 generate_report.py --type dev|staging|prod --dest /path/to/output
# reads Jenkins' own env vars (BUILD_NUMBER, GIT_COMMIT, GIT_BRANCH, ...)

import argparse
import datetime
import glob
import html
import json
import os
import shutil
import subprocess

COMPONENTS = ("api", "app", "admin", "landing", "ai")


def env(name, default="(unknown)"):
    return os.environ.get(name, default) or default


# Set as a Jenkins global environment variable, not hardcoded here - matches
# the Jenkinsfile's REGISTRY_REPO, which is exported to this script's shell
# environment. No personal default: the Jenkinsfile's own Validate CI config
# stage already fails the build before this script runs if it's unset, so
# this just falls back to the same "(unknown)" placeholder as every other
# env() lookup in this file rather than any specific registry.
REGISTRY_REPO = env("REGISTRY_REPO")


def commit_author():
    sha = env("GIT_COMMIT", "")
    if not sha or sha == "(unknown)":
        return "(unknown)"
    try:
        out = subprocess.run(
            ["git", "show", "-s", "--format=%an", sha],
            capture_output=True, text=True, timeout=5,
        )
        return out.stdout.strip() or "(unknown)"
    except Exception:
        return "(unknown)"


def load_json(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def semgrep_summary():
    data = load_json("reports/semgrep/semgrep-report.json")
    if data is None:
        return None
    results = data.get("results", [])
    by_sev = {}
    for r in results:
        sev = r.get("extra", {}).get("severity", "UNKNOWN")
        by_sev[sev] = by_sev.get(sev, 0) + 1
    return {"total": len(results), "by_severity": by_sev}


def trivy_summary():
    out = {}
    for comp in COMPONENTS:
        data = load_json(f"reports/trivy/trivy-{comp}-report.json")
        if data is None:
            continue
        counts = {}
        for res in data.get("Results", []) or []:
            for v in res.get("Vulnerabilities", []) or []:
                sev = v.get("Severity", "UNKNOWN")
                counts[sev] = counts.get(sev, 0) + 1
        out[comp] = counts
    return out or None


def zap_summary():
    data = load_json("reports/zap/zap-report.json")
    if data is None:
        return None
    counts = {}
    for site in data.get("site", []) or []:
        for alert in site.get("alerts", []) or []:
            risk = alert.get("riskdesc", "Unknown").split(" ")[0]
            counts[risk] = counts.get(risk, 0) + 1
    return counts


def k6_summary():
    data = load_json("reports/k6/k6-summary.json")
    if data is None:
        return None
    m = data.get("metrics", {})
    dur = m.get("http_req_duration", {})
    failed = m.get("http_req_failed", {})
    return {
        "requests": m.get("http_reqs", {}).get("count"),
        "p95_ms": dur.get("p(95)"),
        "avg_ms": dur.get("avg"),
        "error_rate": failed.get("value"),
    }


def badge(ok, ok_text="PASSED", bad_text="NEEDS ATTENTION"):
    if ok:
        return '<span class="badge ok">%s</span>' % ok_text
    return '<span class="badge warn">%s</span>' % bad_text


# ---------------------------------------------------------------------------
# Detail tables.
#
# The summaries above answer "how many". These answer "which ones". A count
# plus a pointer to a multi-megabyte JSON file is not something anyone reads,
# and an UNSTABLE build shows on GitHub as a red cross - whoever clicks through
# needs the finding on screen, not a filename.
#
# Every table is capped. Trivy across five images can produce thousands of
# rows, and a page that takes a minute to open is the same as no page at all.
# The raw JSON stays archived next to the report for anyone who needs all of it.
# ---------------------------------------------------------------------------

SEVERITY_ORDER = {"CRITICAL": 0, "HIGH": 1, "ERROR": 1, "MEDIUM": 2,
                  "WARNING": 2, "LOW": 3, "INFO": 4, "INFORMATIONAL": 4,
                  "UNKNOWN": 5}
ROW_CAP = 200


def _sev_key(s):
    return SEVERITY_ORDER.get(str(s).upper(), 9)


def _sev_class(s):
    s = str(s).upper()
    if s == "CRITICAL":
        return "sev-crit"
    if s in ("HIGH", "ERROR"):
        return "sev-high"
    if s in ("MEDIUM", "WARNING"):
        return "sev-med"
    if s == "LOW":
        return "sev-low"
    return "sev-info"


def _short(text, limit=180):
    text = " ".join(str(text or "").split())
    return text if len(text) <= limit else text[: limit - 1] + "..."


def table(headers, rows, sev_col=0, empty="Nothing found."):
    if not rows:
        return '<p class="none">%s</p>' % html.escape(empty)
    capped = rows[:ROW_CAP]
    head = "".join("<th>%s</th>" % html.escape(h) for h in headers)
    body = []
    for r in capped:
        cls = _sev_class(r[sev_col]) if sev_col is not None and len(r) > sev_col else ""
        cells = "".join(
            '<td class="%s">%s</td>' % (cls if i == sev_col else "", html.escape(str(c)))
            for i, c in enumerate(r)
        )
        body.append("<tr>%s</tr>" % cells)
    more = ""
    if len(rows) > ROW_CAP:
        more = ('<p class="none">Showing the %d most severe of %d. The rest are in '
                'the raw JSON archived with this report.</p>' % (ROW_CAP, len(rows)))
    return ('<div class="tablewrap"><table class="data"><thead><tr>%s</tr></thead>'
            '<tbody>%s</tbody></table></div>%s' % (head, "".join(body), more))


def semgrep_findings():
    data = load_json("reports/semgrep/semgrep-report.json")
    if data is None:
        return None
    rows = []
    for r in data.get("results", []) or []:
        extra = r.get("extra", {}) or {}
        rows.append([
            extra.get("severity", "UNKNOWN"),
            _short(r.get("check_id", ""), 60),
            "%s:%s" % (r.get("path", ""), (r.get("start", {}) or {}).get("line", "")),
            _short(extra.get("message", "")),
        ])
    rows.sort(key=lambda r: (_sev_key(r[0]), r[1]))
    return rows


def trivy_findings():
    out = {}
    for comp in COMPONENTS:
        data = load_json("reports/trivy/trivy-%s-report.json" % comp)
        if data is None:
            continue
        rows = []
        for res in data.get("Results", []) or []:
            for v in res.get("Vulnerabilities", []) or []:
                rows.append([
                    v.get("Severity", "UNKNOWN"),
                    v.get("VulnerabilityID", ""),
                    _short(v.get("PkgName", ""), 40),
                    _short(v.get("InstalledVersion", ""), 30),
                    _short(v.get("FixedVersion", "") or "no fix yet", 30),
                    _short(v.get("Title", "") or v.get("Description", ""), 130),
                ])
        rows.sort(key=lambda r: (_sev_key(r[0]), r[1]))
        out[comp] = rows
    return out or None


def zap_findings():
    rows = []
    found = False
    for path in sorted(glob.glob("reports/zap/*.json")):
        data = load_json(path)
        if data is None:
            continue
        found = True
        target = os.path.basename(path).replace("zap-", "").replace(".json", "")
        for site in data.get("site", []) or []:
            for a in site.get("alerts", []) or []:
                rows.append([
                    (a.get("riskdesc", "Unknown") or "Unknown").split(" ")[0],
                    _short(a.get("name", ""), 70),
                    target,
                    str(len(a.get("instances", []) or [])),
                    _short(a.get("solution", "") or a.get("desc", "")),
                ])
    if not found:
        return None
    rows.sort(key=lambda r: (_sev_key(r[0]), r[1]))
    return rows


def k6_metrics():
    data = load_json("reports/k6/k6-summary.json")
    if data is None:
        return None
    rows = []
    for name, m in sorted((data.get("metrics", {}) or {}).items()):
        if not isinstance(m, dict):
            continue
        vals = []
        for key in ("count", "rate", "value", "avg", "min", "med", "p(90)", "p(95)", "max"):
            v = m.get(key)
            if v is None:
                continue
            vals.append("%s=%.2f" % (key, v) if isinstance(v, float) else "%s=%s" % (key, v))
        th = m.get("thresholds")
        if isinstance(th, dict) and th:
            state = "met" if all(bool(x) for x in th.values()) else "BREACHED"
        else:
            state = "-"
        rows.append([state, name, ", ".join(vals) or "-"])
    rows.sort(key=lambda r: (r[0] != "BREACHED", r[1]))
    return rows


def detail_sections():
    out = []

    sg = semgrep_findings()
    if sg is not None:
        out.append("<h2>Code scan (Semgrep)</h2>" + table(
            ["Severity", "Rule", "Location", "What it found"], sg,
            empty="No code-level findings."))

    tv = trivy_findings()
    if tv:
        out.append("<h2>Container vulnerabilities (Trivy)</h2>")
        for comp, rows in tv.items():
            crit = sum(1 for r in rows if str(r[0]).upper() == "CRITICAL")
            high = sum(1 for r in rows if str(r[0]).upper() == "HIGH")
            out.append(
                '<h3>%s <span class="count">%d total, %d critical, %d high</span></h3>'
                % (html.escape(comp), len(rows), crit, high)
                + table(["Severity", "CVE", "Package", "Installed", "Fixed in", "Summary"],
                        rows, empty="No vulnerabilities reported for this image."))

    zp = zap_findings()
    if zp is not None:
        out.append("<h2>Running-app scan (OWASP ZAP)</h2>" + table(
            ["Risk", "Alert", "Target", "Instances", "How to fix"], zp,
            empty="No alerts raised."))

    k6 = k6_metrics()
    if k6 is not None:
        out.append("<h2>Load test (k6)</h2>" + table(
            ["Threshold", "Metric", "Values"], k6, sev_col=None,
            empty="No load test run for this build."))

    if not out:
        return ('<h2>Details</h2><p class="none">No scan output was produced for this '
                'build, which usually means it stopped before the scan stages ran.</p>')
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--type", required=True, choices=["dev", "staging", "prod"])
    ap.add_argument("--dest", required=True)
    args = ap.parse_args()

    os.makedirs(args.dest, exist_ok=True)

    sha = env("GIT_COMMIT")[:7]
    image_tag = env("IMAGE_TAG")
    branch = env("GIT_BRANCH", env("BRANCH_NAME"))
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    meta = [
        ("Build number", env("BUILD_NUMBER")),
        ("Branch", branch),
        ("What triggered it", f"Push to {branch}"),
        ("Triggered by", commit_author()),
        ("Code version (commit)", sha),
        ("Report generated", now),
        ("API image", f"{REGISTRY_REPO}:api-{image_tag}"),
        ("Web app image", f"{REGISTRY_REPO}:app-{image_tag}"),
        ("AI service image", f"{REGISTRY_REPO}:ai-{image_tag}"),
    ]

    sections = []

    sg = semgrep_summary()
    if sg is not None:
        noteworthy = sum(v for k, v in sg["by_severity"].items() if k in ("ERROR", "HIGH"))
        detail = ", ".join(f"{v} {k.lower()}" for k, v in sorted(sg["by_severity"].items())) or "no findings"
        sections.append((
            "Source code security scan (Semgrep)",
            "An automatic tool read through the application source code looking for known "
            "insecure coding patterns (the kind attackers exploit).",
            badge(noteworthy == 0, "NO HIGH-RISK FINDINGS", f"{noteworthy} HIGH-RISK FINDINGS"),
            f"Total findings: {sg['total']} ({detail}). Full details: semgrep/semgrep-report.json",
        ))

    sections.append((
        "Lint and automated tests",
        "The codebase was checked for style/quality issues (lint) and the automated test "
        "suite was run across the api, app, and ai packages.",
        badge(True, "PASSED"),
        "The pipeline stops here if either step fails, so a report only exists for a passing run.",
    ))

    tv = trivy_summary()
    if tv is not None:
        crit = sum(c.get("CRITICAL", 0) for c in tv.values())
        parts = []
        for comp, counts in tv.items():
            d = ", ".join(f"{v} {k.lower()}" for k, v in sorted(counts.items())) or "none found"
            parts.append(f"{comp}: {d}")
        sections.append((
            "Known-vulnerability scan of the built images (Trivy)",
            "Each packaged application (container image) was checked against a database of "
            "publicly known vulnerabilities in the libraries it ships with.",
            badge(crit == 0, "NO CRITICAL VULNERABILITIES", f"{crit} CRITICAL VULNERABILITIES"),
            "; ".join(parts) + ". Full details: trivy/*.json",
        ))

    sections.append((
        "Digital signature (Cosign)",
        "The api, app, and ai images were cryptographically signed. This proves the exact "
        "images running in this environment were built by this pipeline and have not been "
        "tampered with.",
        badge(True, "SIGNED"),
        f"Verify anytime with: cosign verify --key cosign.pub {REGISTRY_REPO}:api-{image_tag}",
    ))

    if args.type == "dev":
        sections.append((
            "Images pushed to the registry",
            "api, app, and ai images were built, scanned, signed, and pushed. This pipeline "
            "stops here - dev does not deploy anywhere, it only proves the build is clean.",
            badge(True, "PUSHED"),
            f"Tagged {image_tag} in {REGISTRY_REPO}. Promote via a PR from dev to staging when ready.",
        ))

    if args.type in ("staging", "prod"):
        ns = "matchyplus-staging" if args.type == "staging" else "matchyplus-production"
        env_name = "staging" if args.type == "staging" else "production"
        sections.append((
            f"Deployment to {env_name}",
            f"The images built by this pipeline were deployed to the {ns} namespace, and the "
            "pipeline verified the rollout completed and the app answers requests.",
            badge(True, "DEPLOYED & VERIFIED"),
            "Deployed via a version-controlled change to the Kustomize overlay (GitOps) - "
            "every deployment is traceable and reversible.",
        ))

    if args.type == "staging":
        zp = zap_summary()
        if zp is not None:
            high = zp.get("High", 0)
            detail = ", ".join(f"{v} {k.lower()}-risk" for k, v in sorted(zp.items())) or "no alerts"
            sections.append((
                "Attack simulation on the running app (OWASP ZAP)",
                "A security tool actively probed the running staging application the way a "
                "real attacker would (injections, misconfigurations, information leaks...).",
                badge(high == 0, "NO HIGH-RISK ALERTS", f"{high} HIGH-RISK ALERTS"),
                f"Alerts: {detail}. Readable report: zap/zap-report.html (open in a browser).",
            ))
        k6 = k6_summary()
        if k6 is not None:
            p95 = k6.get("p95_ms")
            err = k6.get("error_rate")
            ok = (p95 is not None and p95 < 800) and (err is not None and err < 0.01)
            p95_txt = f"{p95:.0f} ms" if isinstance(p95, (int, float)) else "n/a"
            err_txt = f"{err*100:.2f}%" if isinstance(err, (int, float)) else "n/a"
            sections.append((
                "Load test (k6)",
                "The staging application was put under simulated user traffic (up to 20 "
                "simultaneous users) to check it stays fast and stable under load.",
                badge(ok, "PERFORMANCE OK", "THRESHOLDS EXCEEDED"),
                f"Requests served: {k6.get('requests', 'n/a')}. 95% of responses were faster than "
                f"{p95_txt} (target: under 800 ms). Error rate: {err_txt} (target: under 1%). "
                "Raw numbers: k6/k6-summary.json",
            ))

    if args.type == "prod":
        sections.append((
            "PRODUCTION release",
            "This release was promoted through dev and staging via review and merge, then "
            "built and deployed from the main branch.",
            badge(True, "RELEASED"),
            "Rollback: revert the image-bump commit in the GitOps repo and let ArgoCD "
            "reconcile back to the previous version.",
        ))

    # ---------- HTML ----------
    rows = "\n".join(
        f"<tr><th>{html.escape(k)}</th><td>{html.escape(str(v))}</td></tr>" for k, v in meta
    )
    cards = "\n".join(
        f"""<div class="card">
  <h3>{html.escape(title)} {verdict}</h3>
  <p class="what">{html.escape(what)}</p>
  <p class="detail">{html.escape(detail)}</p>
</div>"""
        for title, what, verdict, detail in sections
    )
    title = {"dev": "Build & security check report",
             "staging": "Staging validation report",
             "prod": "Production release record"}[args.type]
    details = detail_sections()
    doc = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>{title} — build #{env('BUILD_NUMBER')}</title>
<style>
 body {{ font-family: system-ui, Segoe UI, Arial, sans-serif; margin: 2rem auto; max-width: 860px;
        color: #1c2733; line-height: 1.5; padding: 0 1rem; }}
 h1 {{ border-bottom: 3px solid #2a6fdb; padding-bottom: .4rem; }}
 table {{ border-collapse: collapse; width: 100%; margin: 1rem 0 2rem; }}
 th, td {{ text-align: left; padding: .45rem .7rem; border-bottom: 1px solid #e3e8ee; }}
 th {{ width: 240px; color: #51606f; font-weight: 600; }}
 .card {{ border: 1px solid #e3e8ee; border-radius: 10px; padding: 1rem 1.2rem; margin: 1rem 0;
         box-shadow: 0 1px 3px rgba(20,40,80,.06); }}
 .card h3 {{ margin: 0 0 .5rem; font-size: 1.05rem; }}
 .badge {{ font-size: .75rem; font-weight: 700; padding: .2rem .55rem; border-radius: 99px;
          vertical-align: middle; margin-left: .5rem; }}
 .badge.ok {{ background: #e2f5e9; color: #157347; }}
 .badge.warn {{ background: #fdecec; color: #b02a37; }}
 .what {{ margin: .2rem 0; }}
 .detail {{ margin: .2rem 0 0; color: #51606f; font-size: .92rem; }}
 footer {{ margin-top: 2rem; color: #8a97a5; font-size: .85rem; }}
 h2 {{ margin-top: 2.5rem; border-bottom: 2px solid #e3e8ee; padding-bottom: .3rem; }}
 h3 {{ margin: 1.5rem 0 .4rem; font-size: 1rem; }}
 .count {{ font-weight: 400; color: #8a97a5; font-size: .85rem; margin-left: .4rem; }}
 .none {{ color: #157347; background: #e2f5e9; padding: .5rem .8rem;
         border-radius: 6px; font-size: .9rem; }}
 /* wide tables scroll inside their own box rather than pushing the page sideways */
 .tablewrap {{ overflow-x: auto; margin: .5rem 0 1.5rem; }}
 table.data {{ font-size: .85rem; margin: 0; }}
 table.data th {{ width: auto; background: #f6f8fa; position: sticky; top: 0;
                 white-space: nowrap; }}
 table.data td {{ vertical-align: top; }}
 table.data tbody tr:hover {{ background: #f9fbfd; }}
 .sev-crit, .sev-high, .sev-med, .sev-low, .sev-info {{
   font-weight: 700; white-space: nowrap; }}
 .sev-crit {{ color: #8b0000; }}
 .sev-high {{ color: #b02a37; }}
 .sev-med  {{ color: #b8860b; }}
 .sev-low  {{ color: #51606f; }}
 .sev-info {{ color: #8a97a5; }}
</style></head><body>
<h1>{title}</h1>
<p>This report explains, in plain language, everything that was checked and done for this
release of <strong>Matchy+</strong>. Green badges mean the check passed.</p>
<table>{rows}</table>
{cards}
<h1 style="margin-top:3rem">Findings in detail</h1>
<p>Every finding from every scanner, worst first. This is the same data as the raw
JSON files archived beside this report, rendered so it can actually be read.</p>
{details}
<footer>Generated automatically by the Matchy+ CI/CD platform (Jenkins).
Raw technical scan files are stored next to this report for specialist review.</footer>
</body></html>"""
    with open(os.path.join(args.dest, "report.html"), "w", encoding="utf-8") as f:
        f.write(doc)

    # ---------- Markdown (terminal-friendly twin) ----------
    md = [f"# {title} — build #{env('BUILD_NUMBER')}", ""]
    for k, v in meta:
        md.append(f"- **{k}**: {v}")
    md.append("")
    for t, what, verdict, detail in sections:
        state = "PASSED" if 'class="badge ok"' in verdict else "NEEDS ATTENTION"
        md += [f"## {t} — {state}", "", what, "", f"> {detail}", ""]
    with open(os.path.join(args.dest, "summary.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(md))

    # copy raw scan outputs alongside
    if os.path.isdir("reports"):
        for item in os.listdir("reports"):
            if item == "final":
                continue
            src = os.path.join("reports", item)
            dst = os.path.join(args.dest, item)
            if os.path.isdir(src):
                shutil.copytree(src, dst, dirs_exist_ok=True)
            else:
                shutil.copy2(src, dst)

    print(f"Report written to {args.dest} (report.html + summary.md)")


if __name__ == "__main__":
    main()
