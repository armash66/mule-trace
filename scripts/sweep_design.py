#!/usr/bin/env python3
"""
R2 Sweep script for Evidence Ledger design compliance.
Replaces banned words, applies rename table, strips uppercase, shadows, and replaces hex colors with CSS variables.
"""

import os
import re

RENAME_PAIRS = [
    ("Mule Syndicate Detection Typologies", "Four ways stolen money moves"),
    ("Mule Syndicate Detection", "Four ways stolen money moves"),
    ("Fan-In / Fan-Out Accumulation Hub", "Collect and split"),
    ("Fan-In / Fan-Out Hubs", "Collect and split"),
    ("Fan-In / Fan-Out Hub", "Collect and split"),
    ("Fan-In / Fan-Out", "Collect and split"),
    ("Closed Cycle Layering Ring", "Round trip"),
    ("Time-Bounded Cycles (3-5 hops)", "Round trip"),
    ("Time-Bounded Cycles", "Round trip"),
    ("Cycle Layering", "Round trip"),
    ("Pass-Through High-Speed Transit Chain", "Quick relay"),
    ("Pass-Through High-Speed Chain", "Quick relay"),
    ("Pass-Through Chains", "Quick relay"),
    ("Pass-Through Chain", "Quick relay"),
    ("New-Account Cluster", "Same-device group"),
    ("Device/KYC Clusters", "Same-device group"),
    ("Device/KYC Cluster", "Same-device group"),
    ("New Account Cluster", "Same-device group"),
    ("Dormancy Awakenings", "Dormancy wake-up"),
    ("Dormancy Awakening", "Dormancy wake-up"),
    ("Alerts Queue", "Alerts"),
    ("Workspace", "Investigate"),
    ("Freeze Tracker", "Freezes"),
    ("Case File & STR", "Cases"),
    ("Heist Replay", "Replay"),
    ("Rules & Evasion", "Rules"),
    ("Model Metrics", "Accuracy"),
    ("Audit Trail", "Activity log"),
    ("Data Hub", "Data"),
    ("Mule Patterns", "How it works"),
    ("Risk score", "Risk"),
    ("Risk Score", "Risk"),
    ("risk_score", "risk_score"), # preserve code symbol
    ("Confirm mule", "Mark as mule"),
    ("Confirm Account", "Mark as mule"),
    ("Clear Account", "Not a mule"),
    ("Freeze first", "Cut here"),
    ("Why this score?", "Why this risk?"),
    ("Why this score", "Why this risk?"),
    ("tainted funds", "traced money"),
    ("Tainted Funds", "Traced money"),
    ("tainted balance", "traced money"),
    ("Tainted balance", "Traced money"),
    ("Tainted Balance", "Traced money"),
    ("Measured on synthetic data • Confirm before action", "Demo data. A person confirms every action."),
]

# Map hex colors to tokens
HEX_MAP = {
    "#ffffff": "var(--paper)",
    "#FFFFFF": "var(--paper)",
    "#fff": "var(--paper)",
    "#FFF": "var(--paper)",
    "#111111": "var(--ink)",
    "#111113": "var(--ink)",
    "#121214": "var(--ink)",
    "#1a1a1d": "var(--ink)",
    "#1A1A1D": "var(--ink)",
    "#000000": "var(--ink)",
    "#000": "var(--ink)",
    "#6D4AFF": "var(--ink)",
    "#6d4aff": "var(--ink)",
    "#8668FF": "var(--ink)",
    "#8668ff": "var(--ink)",
    "#241E3B": "var(--paper-2)",
    "#F2EFFF": "var(--paper-2)",
    "#E8590C": "var(--signal)",
    "#e8590c": "var(--signal)",
    "#F76B15": "var(--signal)",
    "#f76b15": "var(--signal)",
    "#FF4A1C": "var(--signal)",
    "#ff4a1c": "var(--signal)",
    "#B42318": "var(--signal)",
    "#b42318": "var(--signal)",
    "#E53E3E": "var(--signal)",
    "#e53e3e": "var(--signal)",
    "#D9A441": "var(--ink-2)",
    "#d9a441": "var(--ink-2)",
    "#E5B84B": "var(--ink-2)",
    "#e5b84b": "var(--ink-2)",
    "#2F8F5B": "var(--ok)",
    "#2f8f5b": "var(--ok)",
    "#38A169": "var(--ok)",
    "#38a169": "var(--ok)",
    "#1F7A4D": "var(--ok)",
    "#1f7a4d": "var(--ok)",
    "#8A8A92": "var(--ink-2)",
    "#8a8a92": "var(--ink-2)",
    "#6E6E78": "var(--ink-2)",
    "#6e6e78": "var(--ink-2)",
    "#5B5B62": "var(--ink-2)",
    "#5b5b62": "var(--ink-2)",
    "#5A564D": "var(--ink-2)",
    "#5a564d": "var(--ink-2)",
    "#EDEDEF": "var(--paper)",
    "#ededef": "var(--paper)",
    "#9B9BA3": "var(--ink-2)",
    "#9b9ba3": "var(--ink-2)",
    "#E7E5E0": "var(--rule)",
    "#e7e5e0": "var(--rule)",
    "#D6D3CC": "var(--rule)",
    "#d6d3cc": "var(--rule)",
    "#CFCABD": "var(--rule)",
    "#cfcabd": "var(--rule)",
    "#2D2D33": "var(--rule)",
    "#2d2d33": "var(--rule)",
    "#3D3D45": "var(--rule)",
    "#3d3d45": "var(--rule)",
    "#FAFAF9": "var(--paper)",
    "#fafaf9": "var(--paper)",
    "#F5F5F4": "var(--paper-2)",
    "#f5f5f4": "var(--paper-2)",
    "#F2F1EE": "var(--paper-2)",
    "#f2f1ee": "var(--paper-2)",
    "#F5F2EA": "var(--paper)",
    "#f5f2ea": "var(--paper)",
    "#EDE9DD": "var(--paper-2)",
    "#ede9dd": "var(--paper-2)",
}

def clean_file(path: str):
    if not (path.endswith(".tsx") or path.endswith(".ts") or path.endswith(".css")):
        return
    if "styles/tokens.css" in path.replace("\\", "/") or "lib/theme.ts" in path.replace("\\", "/"):
        return

    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    orig = content

    # 1. Apply UI text renames
    for old, new in RENAME_PAIRS:
        content = content.replace(old, new)

    # 2. Strip textTransform: 'uppercase'
    content = re.sub(r"textTransform:\s*['\"]uppercase['\"],?\s*", "", content)
    content = re.sub(r"text-transform:\s*uppercase;?\s*", "", content)

    # 3. Strip tracking / letterSpacing
    content = re.sub(r"letterSpacing:\s*['\"][^'\"]+['\"],?\s*", "", content)

    # 4. Strip borderRadius and boxShadow
    content = re.sub(r"borderRadius:\s*['\"][^'\"]+['\"],?\s*", "", content)
    content = re.sub(r"boxShadow:\s*['\"][^'\"]+['\"],?\s*", "", content)

    # 5. Replace hex colors
    for hex_c, var_c in HEX_MAP.items():
        content = content.replace(f"'{hex_c}'", f"'{var_c}'")
        content = content.replace(f'"{hex_c}"', f'"{var_c}"')
        content = content.replace(f': {hex_c}', f': {var_c}')
        content = content.replace(f'={hex_c}', f'={var_c}')

    # 6. Catch any remaining hex patterns like #123456 or #123
    content = re.sub(r"#[0-9a-fA-F]{6}", "var(--ink)", content)
    content = re.sub(r"#[0-9a-fA-F]{3}", "var(--ink)", content)

    # 7. Strip Tailwind banned classes if in className
    banned_tw = [
        r"\brounded-(?:md|lg|xl|2xl|3xl|full|sm)\b",
        r"\bshadow-(?:sm|md|lg|xl|2xl|none)\b",
        r"\bshadow\b",
        r"\buppercase\b",
        r"\btracking-(?:wide|wider|widest|tight)\b",
        r"\bgradient\b",
        r"\bbackdrop-[^\s\"]+\b",
        r"\b(?:text|bg|border|ring|from|to|via)-(?:violet|purple|indigo|amber|yellow|orange|pink|rose|red|blue|sky|cyan|teal|emerald|green|lime|fuchsia)-[0-9]+\b",
    ]
    for b in banned_tw:
        content = re.sub(b, "", content)

    if content != orig:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {path}")

def main():
    target_dir = os.path.join("web", "src")
    for root, _, files in os.walk(target_dir):
        for file in files:
            clean_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
