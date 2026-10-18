#!/usr/bin/env python3
"""Fail fast on security regressions in the generated GitHub Pages release."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ERRORS: list[str] = []
WARNINGS: list[str] = []


def error(path: Path, message: str) -> None:
    ERRORS.append(f"{path.relative_to(ROOT)}: {message}")


def warning(path: Path, message: str) -> None:
    WARNINGS.append(f"{path.relative_to(ROOT)}: {message}")


html_files = [ROOT / "index.html", ROOT / "explorer.html", ROOT / "404.html"]
data_files = sorted((ROOT / "data").glob("*.json")) + sorted((ROOT / "data").glob("*.geojson"))

required_csp = {
    "index.html": ("object-src 'none'", "base-uri 'self'", "form-action 'none'", "connect-src 'self'"),
    "explorer.html": ("object-src 'none'", "base-uri 'self'", "form-action 'none'", "connect-src 'self'"),
    "404.html": ("object-src 'none'", "base-uri 'self'", "form-action 'none'", "connect-src 'self'"),
}

secret_patterns = {
    "GitHub token": re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b"),
    "AWS access key": re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    "private key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "generic API key assignment": re.compile(
        r"""(?ix)\b(?:api[_-]?key|client[_-]?secret|access[_-]?token)\b
            \s*[:=]\s*["'][A-Za-z0-9._~+/=-]{16,}["']"""
    ),
}

for path in data_files:
    text = path.read_text(encoding="utf-8")
    if re.search(r"</script", text, re.IGNORECASE):
        error(path, "contains '</script', which can break out of embedded script data")
    if re.search(r"javascript\s*:", text, re.IGNORECASE):
        error(path, "contains a javascript: URL")
    for label, pattern in secret_patterns.items():
        if pattern.search(text):
            error(path, f"looks like it contains a {label}")

for path in html_files:
    text = path.read_text(encoding="utf-8")

    csp_match = re.search(
        r"""<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>""",
        text,
        re.IGNORECASE,
    )
    if not csp_match:
        error(path, "missing Content-Security-Policy meta tag")
    else:
        csp_tag = csp_match.group(0)
        for directive in required_csp[path.name]:
            if directive not in csp_tag:
                error(path, f"CSP is missing {directive!r}")
        if "'unsafe-inline'" in csp_tag:
            warning(path, "CSP still permits 'unsafe-inline'; keep this until inline JS/CSS is externalized")

    if re.search(r"""<script\b[^>]*\bsrc\s*=\s*["']https?://""", text, re.IGNORECASE):
        error(path, "loads runtime JavaScript from an external origin")
    if re.search(r"javascript\s*:", text, re.IGNORECASE):
        error(path, "contains a javascript: URL")

    for tag in re.findall(r"""<a\b[^>]*\btarget\s*=\s*["']_blank["'][^>]*>""", text, re.IGNORECASE):
        rel = re.search(r"""\brel\s*=\s*["']([^"']*)["']""", tag, re.IGNORECASE)
        if not rel or "noopener" not in rel.group(1).lower().split():
            error(path, "target=_blank link is missing rel=noopener")

    for label, pattern in secret_patterns.items():
        if pattern.search(text):
            error(path, f"looks like it contains a {label}")

index = (ROOT / "index.html").read_text(encoding="utf-8")
if "document.querySelector(location.hash)" in index:
    error(ROOT / "index.html", "uses location.hash directly as a CSS selector")

if WARNINGS:
    print("Warnings:")
    for item in WARNINGS:
        print(f"  - {item}")

if ERRORS:
    print("Security guard failed:")
    for item in ERRORS:
        print(f"  - {item}")
    sys.exit(1)

print(f"Security guard passed: checked {len(html_files)} HTML files and {len(data_files)} data files.")
