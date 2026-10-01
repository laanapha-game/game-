#!/usr/bin/env python3
"""Turns the single-file demo build (dist-demo/game.html, the full game) into an Artifact page
body: the publish step adds its own doctype/head/body skeleton, so this keeps the
<title>, inline styles and scripts, and the body markup. Pillow-free, stdlib only.

  npm run build:demo && python3 tools/artifact_page.py OUT.html
"""
import re
import sys

src = open('dist-demo/game.html', encoding='utf-8').read()  # full game: scene 1 -> scene 2
head = re.search(r'<head>(.*?)</head>', src, re.S).group(1)
body = re.search(r'<body>(.*)</body>', src, re.S).group(1)
head = re.sub(r'<meta[^>]*>\s*', '', head)  # the skeleton brings charset + viewport
title = re.search(r'<title>.*?</title>', head, re.S).group(0)
head = head.replace(title, '')
title = '<title>Lannapha Trick or Treat</title>'  # the demo artifact's name; scene 1's page title differs
page = title + '\n<style>:root{color-scheme:dark;background:#000}html,body{height:100%;background:#000}</style>\n' + head + body
open(sys.argv[1], 'w', encoding='utf-8').write(page)
print(f'{sys.argv[1]}: {len(page) / 1e6:.2f} MB')
