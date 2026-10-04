#!/usr/bin/env python3
"""Turns the single-file demo build (dist-demo/game.html, the full game: scene 1 -> 2 -> 3)
into an Artifact page body: the publish step adds its own doctype/head/body skeleton, so
this keeps the <title>, inline styles and scripts, and the body markup. Stdlib only.

Inside the Artifact viewer window.open returns null for most viewers, so the page gets a
small fallback first: when window.open is refused, the link opens through a real
<a target="_blank"> click (scenes 1 and 2 use window.open for tickets and Instagram; scene 3
already opens its links that way).

  npm run build:demo && python3 tools/artifact_page.py OUT.html ["Title"]
"""
import re
import sys

src = open('dist-demo/game.html', encoding='utf-8').read()
head = re.search(r'<head>(.*?)</head>', src, re.S).group(1)
body = re.search(r'<body>(.*)</body>', src, re.S).group(1)
head = re.sub(r'<meta[^>]*>\s*', '', head)  # the skeleton brings charset + viewport (viewport-fit=cover)
head = re.sub(r'<title>.*?</title>\s*', '', head, flags=re.S)
title = sys.argv[2] if len(sys.argv) > 2 else 'ลานนภา Halloween Fest'

SHIM = """<script>
(function () {
  var open = window.open;
  window.open = function (url, target, features) {
    var w = null;
    try { w = open.call(window, url, target, features); } catch (e) {}
    if (w || !url) return w;
    var a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    document.body.appendChild(a); a.click(); a.remove();
    return null;
  };
})();
</script>"""

page = (
    f'<title>{title}</title>\n'
    '<style>:root{color-scheme:dark;background:#000}html,body{height:100%;background:#000}</style>\n'
    + SHIM + '\n' + head + body
)
open(sys.argv[1], 'w', encoding='utf-8').write(page)
print(f'{sys.argv[1]}: {len(page) / 1e6:.2f} MB')
