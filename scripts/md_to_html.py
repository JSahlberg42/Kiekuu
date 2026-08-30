#!/usr/bin/env python3
"""
Convert a Kiekuu markdown manual page to a static HTML page matching the
existing docs manual styling (dark theme, orange accents, cards).

Usage: python3 md_to_html.py <input.md> <output.html> <page_title> [back_links...]
  back_links: space-separated "url|label" pairs, rendered in the .back-link footer.

Uses the Python `markdown` library to avoid manual transcription typos.
"""
import re
import sys
import markdown

TEMPLATE_HEAD = """<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} — Kiekuu</title>
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
               max-width: 900px; margin: 0 auto; padding: 40px 20px;
               background: #0f172a; color: #e2e8f0; line-height: 1.6; }}
        h1 {{ color: #fb923c; margin-bottom: 8px; font-size: 2em; }}
        .subtitle {{ color: #94a3b8; margin-bottom: 32px; }}
        h2 {{ color: #fb923c; margin: 28px 0 12px 0; font-size: 1.5em; }}
        h3 {{ color: #fb923c; margin: 20px 0 8px 0; font-size: 1.15em; }}
        p {{ color: #cbd5e1; margin-bottom: 12px; }}
        .card {{ background: #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 16px;
                border: 1px solid #334155; }}
        .card h3 {{ margin-top: 0; }}
        strong {{ color: #e2e8f0; }}
        a {{ color: #60a5fa; text-decoration: none; }}
        a:hover {{ text-decoration: underline; }}
        .back-link {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #334155; }}
        .back-link a {{ color: #94a3b8; }}
        ul, ol {{ margin-left: 20px; margin-bottom: 16px; color: #cbd5e1; }}
        li {{ margin-bottom: 8px; }}
        hr {{ border: none; border-top: 1px solid #334155; margin: 28px 0; }}
        blockquote {{ border-left: 3px solid #fb923c; padding-left: 16px; color: #94a3b8;
                      margin: 16px 0; }}
    </style>
</head>
<body>
    {body}
    <div class="back-link">
        {back_links}
    </div>
</body>
</html>
"""


def convert(md_path, out_path, page_title, back_links=None):
    with open(md_path, encoding="utf-8") as f:
        md_text = f.read()

    # Strip Jekyll frontmatter (---\n ... \n---)
    md_text = re.sub(r"^---\n.*?\n---\n", "", md_text, flags=re.DOTALL)

    # Drop the trailing markdown back-link paragraph (e.g. "[← Takaisin ...](...)")
    # since the HTML .back-link footer handles navigation.
    md_text = re.sub(r"\n\n\[←[^\]]*\]\([^)]*\)\s*$", "\n", md_text)

    # Rewrite bare relative internal links to .html so GitHub Pages resolves them.
    # Matches "(ref)" or "(ref#anchor)" or "(ref.md)" -> "(ref.html...)".
    def fix_link(m):
        href = m.group(1) or m.group(2)
        if href.startswith(("http://", "https://", "#", "mailto:")):
            return m.group(0)
        # split off anchor
        base, _, anchor = href.partition("#")
        if base.endswith(".md"):
            base = base[:-3]
        if not base.endswith(".html") and not base == "":
            base = base + ".html"
        return "(" + base + (("#" + anchor) if anchor else "") + ")"

    md_text = re.sub(
        r"\]\(([^)#\s]+(?:#[^)\s]*)?)\)",
        fix_link,
        md_text,
    )
    # Also handle links that already end in .md written as [text](ref.md)
    md_text = re.sub(r"\]\(([^)#\s]+\.md)\)", lambda m: "](" + m.group(1)[:-3] + ".html)", md_text)

    # Convert markdown to HTML (safe-ish: this is trusted in-repo manual content)
    body_html = markdown.markdown(
        md_text, extensions=["extra", "sane_lists", "toc"]
    )

    # Wrap consecutive blocks into cards: split on h2 boundaries
    # Simple approach: turn each h2 section into a card, so the page reads well
    # on the dark theme. We'll keep h2 as section headers and let h3/p sit in
    # cards. To keep it simple and robust, we leave structure as-is but guarantee
    # links render correctly.

    if back_links is None:
        back_links = []

    links_html = " | ".join(
        f'<a href="{url}">{label}</a>' for url, label in back_links
    )

    title_html = page_title.replace("—", "&mdash;")

    html = TEMPLATE_HEAD.format(
        title=title_html, body=body_html, back_links=links_html
    )

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"Wrote {out_path} ({len(html)} bytes)")


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(__doc__)
        sys.exit(1)
    md_path, out_path, page_title = sys.argv[1], sys.argv[2], sys.argv[3]
    links = []
    for arg in sys.argv[4:]:
        if "|" in arg:
            url, label = arg.split("|", 1)
            links.append((url, label))
    convert(md_path, out_path, page_title, links)