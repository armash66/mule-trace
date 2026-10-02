#!/usr/bin/env bash
# run from the repo root
DIR=$( [ -d web/src ] && echo web/src || echo frontend/src )
OUT=$(grep -rEnif scripts/design-banned.txt --include=*.tsx --include=*.ts --include=*.css "$DIR" | grep -v 'styles/tokens.css' | grep -v 'lib/theme.ts')
if [ -n "$OUT" ]; then echo "$OUT"; echo "DESIGN RULES BROKEN"; exit 1; fi
echo "design ok"
