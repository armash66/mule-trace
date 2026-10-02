# MuleTrace Redesign: "Evidence Ledger"

This file REPLACES the design rules in BUILD_PLAN.md Part 4 and Part 5. If anything conflicts, this file wins.

## How to use with a weaker model
1. Do ONE step (R1 to R9) per session, on its own branch: `git switch -c redesign/r1-tokens`.
2. Start each session with: `Read REDESIGN.md. Do step R1 only. Touch only the files listed. Do not add features.`
3. After every step run `bash scripts/check-design.sh`. If it prints errors, fix them before committing.
4. Take a screenshot of the page and compare it with the "Done when" line.
5. If a session goes wrong: `git restore .` and restart it. Do not argue with the model.

## The theme in one paragraph
A paper-and-ink case ledger. Warm off-white paper, black ink, one hot orange-red used ONLY for risk and money. Big serif numbers, thin black rules instead of boxes, square corners, no shadows, no icons in colour. The selected row turns solid black. Confirming an account drops a rubber-stamp. That is the whole look. It is simple to code, easy to remember, and it does not look like a default AI dashboard.

## Exact tokens (use these values, invent nothing)
```
paper     #F5F2EA   page background
paper-2   #EDE9DD   hover background
ink       #111111   text, rules, buttons, selected rows
ink-2     #5A564D   secondary text
rule      #CFCABD   thin dividers
signal    #FF4A1C   risk, money at risk, button hover. NOTHING ELSE.
ok        #1F7A4D   the word "Cleared" only
```
Fonts: `Instrument Serif` for headlines and big numbers. `Inter` for body. `JetBrains Mono` for IDs, amounts, and small labels.
Sizes (only these four): label 12px mono, body 15px, headline 24px serif, hero number clamp(56px, 8vw, 96px) serif.
Corners: 0px everywhere. Shadows: none. Gradients: none. Uppercase text: none. Dark mode: removed.
Max 2 colours on any screen besides black and paper: signal, and ok only on the word Cleared.

## Word rules (write for a busy bank manager)
- Sentences of 14 words or fewer. Plain words. Sentence case. No stacked nouns.
- Banned words: typology, typologies, syndicate, intervene, calibration, telemetry, forensic, verdict, production, orchestration, leverage, mitigation, ecosystem, heuristic, tainted, forward ratio, behavioural.

### Rename table (replace everywhere in the UI)
| Old | New |
|---|---|
| Mule Syndicate Detection Typologies | Four ways stolen money moves |
| Fan-In / Fan-Out Accumulation Hub | Collect and split |
| Closed Cycle Layering Ring | Round trip |
| Pass-Through High-Speed Transit Chain | Quick relay |
| New-Account Cluster | Same-device group |
| Overview | Overview |
| Alerts Queue | Alerts |
| Workspace | Investigate |
| Freeze Tracker | Freezes |
| Case File & STR | Cases |
| Heist Replay | Replay |
| Rules & Evasion | Rules |
| Model Metrics | Accuracy |
| Audit Trail | Activity log |
| Data Hub | Data |
| Mule Patterns | How it works |
| Risk score | Risk |
| Confirm mule | Mark as mule |
| Clear | Not a mule |
| Freeze first | Cut here |
| Why this score? | Why this risk? |
| tainted funds / taint | traced money |
| Measured on synthetic data • Confirm before action | (move to footer, see R3) |

## Files the model should create or edit
`frontend/src/styles/tokens.css`, `frontend/src/lib/theme.ts`, `scripts/check-design.sh`, plus the pages named in each step.

---

## R1. Tokens, fonts and the design checker
Files: `tokens.css`, `tailwind.config.*`, `main.tsx`, `scripts/check-design.sh`.

Prompt:
```
Step R1 only. Install: npm i @fontsource/instrument-serif @fontsource/inter @fontsource/jetbrains-mono. Import them in main.tsx. Create frontend/src/styles/tokens.css with exactly these CSS variables: --paper:#F5F2EA; --paper-2:#EDE9DD; --ink:#111111; --ink-2:#5A564D; --rule:#CFCABD; --signal:#FF4A1C; --ok:#1F7A4D.
Add these classes in tokens.css:
html,body{background:var(--paper);color:var(--ink);font:15px/1.5 Inter,system-ui,sans-serif}
*{border-radius:0 !important;box-shadow:none !important}
.serif{font-family:'Instrument Serif',Georgia,serif;font-weight:400}
.mono{font-family:'JetBrains Mono',monospace;font-size:12px;font-variant-numeric:tabular-nums}
.t-head{font-family:'Instrument Serif',Georgia,serif;font-size:24px;line-height:1.2}
.t-hero{font-family:'Instrument Serif',Georgia,serif;font-size:clamp(56px,8vw,96px);line-height:1}
.rule-top{border-top:2px solid var(--ink)} .rule{border-top:1px solid var(--rule)}
.row{padding:12px 16px;border-top:1px solid var(--rule);cursor:pointer;transition:background 100ms}
.row:hover{background:var(--paper-2)} .row[aria-selected="true"]{background:var(--ink);color:var(--paper)}
.btn{background:var(--ink);color:var(--paper);border:1px solid var(--ink);padding:8px 14px;font:500 14px Inter;cursor:pointer;transition:background 100ms}
.btn:hover{background:var(--signal);border-color:var(--signal)}
.btn-ghost{background:transparent;color:var(--ink);border:1px solid var(--ink)} .btn-ghost:hover{background:var(--ink);color:var(--paper);border-color:var(--ink)}
.dot{display:inline-block;width:8px;height:8px;background:var(--ink-2)} .dot.hot{background:var(--signal)}
.stamp{display:inline-block;border:2px solid var(--signal);color:var(--signal);font:600 13px 'JetBrains Mono',monospace;padding:2px 8px;transform:rotate(-4deg);animation:stampIn 200ms cubic-bezier(.2,0,0,1)}
@keyframes stampIn{from{transform:rotate(-4deg) scale(1.25);opacity:0}to{transform:rotate(-4deg) scale(1);opacity:1}}
@media (prefers-reduced-motion:reduce){*{animation:none !important;transition:none !important}}
In the tailwind config, replace the whole colour palette with: paper, paper2, ink, ink2, rule, signal, ok mapped to those variables. Delete the dark-mode toggle and all dark: classes.
Create lib/theme.ts exporting a function that reads those CSS variables with getComputedStyle (used later by the graph).
Create scripts/check-design.sh with this content:
#!/usr/bin/env bash
cd frontend/src || exit 1
BAD='rounded-(md|lg|xl|2xl|3xl|full)|shadow|uppercase|tracking-(wide|wider|widest)|gradient|backdrop-|(text|bg|border|ring|from|to|via)-(violet|purple|indigo|amber|yellow|orange|pink|rose|red|blue|sky|cyan|teal|emerald|green|lime|fuchsia)-[0-9]|#[0-9a-fA-F]{3,8}'
OUT=$(grep -rEn "$BAD" --include=*.tsx --include=*.ts --include=*.css . | grep -v 'styles/tokens.css' | grep -v 'lib/theme.ts')
if [ -n "$OUT" ]; then echo "$OUT"; echo "DESIGN RULES BROKEN"; exit 1; fi; echo "design ok"
Do not edit any page yet.
```
Done when: `npm run build` passes and the app background is cream paper.

## R2. Colour and wording sweep (find and replace only)
Prompt:
```
Step R2 only. Run bash scripts/check-design.sh and fix every line it reports: replace coloured Tailwind classes with ink, ink2, rule, signal or ok; remove uppercase and tracking classes; remove shadows, gradients and rounded classes; replace pill/badge backgrounds with plain text plus a .dot square. Then replace every UI string using the rename table in REDESIGN.md (search the whole frontend/src for the Old text). Remove every icon tile with a coloured background; keep only plain ink line icons or remove the icon. Do not change layout or logic.
```
Done when: the check script prints `design ok`.

## R3. App shell (sidebar, top bar, footer)
Files: `AppShell.tsx` and its children.
Prompt:
```
Step R3 only. Rebuild the app shell.
LEFT NAV (width 200px, background paper, right border 1px rule): wordmark "MuleTrace" at the top in .t-head (no logo tile, no version badge). Six text links, 15px, no group labels, no icons: Overview, Alerts, Investigate, Freezes, Cases, Data. Active link = solid ink background with paper text (use the same style as .row[aria-selected]). Below a 1px rule, a small label "More" in .mono and four links in 13px ink-2: How it works, Rules, Accuracy, Activity log.
TOP BAR (height 56px, bottom border 2px ink): left side shows the page title in .t-head. Right side shows, in order: "Dataset: {name}" as a plain text dropdown, a .btn "Add data", and the text "Search  ⌘K" in .mono. Remove the breadcrumb, the yellow status pill and the sun/moon button.
FOOTER (one line, .mono, ink-2, top border 1px rule): "Demo data. Nothing here is real. A person confirms every action."
Do not touch page contents.
```
Done when: nav has 6 links plus 4 small ones, top bar has 3 items, no coloured shapes.

## R4. "How it works" page (the screenshot page)
Prompt:
```
Step R4 only. Rebuild the page at the route currently called Mule Patterns. Title (use .t-head): "Four ways stolen money moves". Subtitle (15px, ink-2): "Each one looks normal alone. Together they give it away."
Replace the 4 cards with 4 ROWS separated by a 2px ink top border (.rule-top). No boxes, no rounded corners, no coloured tiles. Each row is a 3-column grid (80px / 1fr / 260px) with 32px padding:
 column 1: a big number 1,2,3,4 in .t-hero.
 column 2: the name in .t-head, then ONE sentence (body 15px), then a line in ink-2 starting "Not fraud when: ".
 column 3: an inline SVG diagram, viewBox 0 0 240 100, ink lines 1.5px, ink dots r=5, exactly ONE dot filled with var(--signal) r=7.
Copy:
1 Collect and split. "Many people pay one account. It sends the money on within minutes." Not fraud when: "It is payroll. Money only goes out."
2 Round trip. "Money travels in a circle and ends where it started." Not fraud when: "It is a refund days later."
3 Quick relay. "Each account passes nearly all the money on, fast." Not fraud when: "The account keeps a normal balance."
4 Same-device group. "New accounts that share one phone, device or address." Not fraud when: "It is a family on one home Wi-Fi."
Diagrams: 1 = five dots on the left, arrows into one signal dot in the middle, arrows out to four dots on the right. 2 = four dots in a square loop with arrowheads, one signal. 3 = five dots in a row joined by arrows, first one signal. 4 = four dots around a small rectangle labelled "1 device", the rectangle in signal.
Put the numbers (30 min, 6 senders, 80%) inside a closed <details> labelled "Settings" under each row, in .mono. Remove the "How false positives are suppressed" boxes and the "production rule calibration" lines.
Add one line at the bottom: a .btn "Try the demo" linking to Overview.
```
Done when: the page is mostly white space with big numbers and four small diagrams, and no sentence is longer than 14 words.

## R5. Overview (the first screen judges see)
Prompt:
```
Step R5 only. Rebuild Overview with this exact layout and nothing else.
Row A (rule-top, padding 40px 0): left 60%: label "Stolen money still moving" in .mono, then the amount in .t-hero coloured var(--signal), e.g. "₹4.8L" (real value from the API; count up from 0 over 600ms once on load). Under it one sentence in ink-2: "Across 3 rings. 2 accounts can be frozen to stop most of it." Right 40%: a small ring graph (reuse the graph component, 260px high, no controls) that draws itself once (lines draw in sequence, 60ms apart, the top account in signal).
Row B (rule-top): three equal columns separated by 1px vertical rules. Each: a number in .t-hero (use 56px) and a .mono label below. Labels: "Open alerts", "Marked as mule", "Marked not a mule".
Row C (rule-top): "Do this next" in .mono, one sentence in .t-head (e.g. "Freeze 2 accounts in ring 8821 to stop ₹4.1L."), and a .btn "See the plan".
Row D (rule-top): "Top alerts" in .mono, then a list of 5 .row items: account ID in .mono, one plain sentence, risk number right-aligned in .mono (signal colour only if above 80). Clicking a row opens Investigate.
No charts, no extra cards, no icons.
```
Done when: the page has one huge orange number, three big black numbers, one sentence and one list.

## R6. Alerts and Investigate panels
Prompt:
```
Step R6 only. Alerts: a plain table using .row items, header text in .mono ink-2, columns: Account (.mono), Why (one sentence, 14 words max), Risk (.mono), Status (.dot + word). Selected row = .row[aria-selected=true]. No coloured chips; patterns shown as plain text.
Investigate right panel: the plain sentence in .t-head at the top (largest text on the panel), then risk as "Risk 94" in .t-hero at 56px signal colour, then two buttons: .btn "Mark as mule" and .btn-ghost "Not a mule" (a short note is required). After a decision, show <span class="stamp">MARKED AS MULE</span> next to the account ID, or the word "Cleared" in var(--ok) with the same stamp style in ok colour. Below, three plain text tabs: Evidence, Details, History, with a 2px ink underline on the active one. Remove all other badges and boxes.
```
Done when: confirming an account shows a stamp that lands with a small scale-in.

## R7. Graph look
Prompt:
```
Step R7 only. Restyle the Cytoscape graph using colours read from lib/theme.ts. Canvas background = paper. Nodes: ink circles, size 10 to 22 by degree, no border. The top-risk node: signal fill, size 26. Neighbour nodes: paper fill with 1px ink border. Edges: 1px ink at 0.5 opacity, small arrowheads. Labels only on hover and on the top node, in JetBrains Mono 11px. On select, fade everything outside the ring to 0.15 opacity over 250ms and fit the view in 400ms. Replace the "Freeze first" badge with a small label "Cut here · saves ₹4.1L" in .mono next to the chosen node (value comes from the API), with a 1px ink line to the node. Remove minimap, hull shading, dashed perimeter and any tooltip boxes with colour.
```
Done when: the graph is black dots on paper with exactly one orange node.

## R8. Data page
Prompt:
```
Step R8 only. Restyle the Data page without changing its logic. The dropzone: 2px dashed ink border, paper background, centred text "Drop your files here" in .t-head and "CSV, Excel, JSON or ZIP. Or paste data." in ink-2. On drag-over: solid ink border and paper-2 background (no colour). Step list shown as plain text "1 Select  2 Match  3 Check  4 Run" in .mono with the current step underlined 2px ink. Warnings = plain text with the word "Check" and a .dot; errors = word "Fix" in signal. Table rows use .row. File chips = plain mono text with an "x" button. Progress = a 2px ink line growing over a 1px rule line.
```
Done when: nothing on the page is coloured except an error word.

## R9. Final sweep
Prompt:
```
Step R9 only. Run bash scripts/check-design.sh until it prints design ok. Open every route and check: only paper, ink and signal colours; four font sizes; no rounded corners; no uppercase; every sentence 14 words or fewer; every page has loading, empty and error text in plain words. List anything you could not fix. Do not add features.
```

## Final checklist (human)
- [ ] Squint at the page: do you see one big serif number and one orange thing?
- [ ] Can a stranger say what MuleTrace does after 5 seconds on Overview?
- [ ] No page has more than two non-grey colours.
- [ ] The word list in "Banned words" appears nowhere. Search for it.
- [ ] Marking an account shows the stamp. The graph shows a "Cut here" label.
