#!/usr/bin/env bash
cd frontend/src 2>/dev/null || cd web/src || exit 1
BAD='rounded-(md|lg|xl|2xl|3xl|full)|shadow|uppercase|tracking-(wide|wider|widest)|gradient|backdrop-|(text|bg|border|ring|from|to|via)-(violet|purple|indigo|amber|yellow|orange|pink|rose|red|blue|sky|cyan|teal|emerald|green|lime|fuchsia)-[0-9]|#[0-9a-fA-F]{3,8}'
OUT=$(grep -rEn "$BAD" --include=*.tsx --include=*.ts --include=*.css . | grep -v 'styles/tokens.css' | grep -v 'lib/theme.ts')
if [ -n "$OUT" ]; then echo "$OUT"; echo "DESIGN RULES BROKEN"; exit 1; fi; echo "design ok"
