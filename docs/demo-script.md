# MuleTrace 3-Minute Live Demo Script

> **Demo Goal**: Walk an audience of fintech fraud heads, bank compliance teams, and hackathon judges through the full **Detect → Quantify → Act** workflow in under 3 minutes.
> **Honesty Reminders**: Point out that all data is synthetic sandbox data, scores are "flagged for review" and "recommended actions", and human confirmation is required before any freeze.

---

### Step 1: The Problem (0:00 – 0:25)
- **Visual**: Public landing screen (`/welcome`) with Scandinavian typography and clean graph illustration.
- **Narrative**:
  > *"In India today, mule networks move money faster than humans can review alerts. When a victim is defrauded, the funds aren't kept in one place — they're layered across 3 to 6 accounts within minutes using UPI and IMPS. Per-transaction rules miss this entirely because each individual transfer looks completely ordinary. The only signal is the topological shape of money flow across time. That's MuleTrace."*

### Step 2: Detect — The Alerts Queue (0:25 – 1:05)
- **Visual**: Open Sandbox (`/sandbox` or `/alerts`). Rapidpay-style minimalist table.
- **Action**: Highlight the top flagged account (`ACC_05001`).
- **Narrative**:
  > *"Here in the Alerts Queue, accounts aren't labeled 'guilty' — they're prioritized for review with explainable plain-language reasons. Notice the top alert: 'Received ₹4.2L from 11 accounts, forwarded 94% within 15 min to 6 accounts'. No black-box score without a reason. Zero decorative clutter."*

### Step 3: Quantify — Investigation Workspace (1:05 – 1:40)
- **Visual**: Investigation Workspace (`/workspace/ACC_05001`). 3-pane layout.
- **Center**: Cytoscape graph focusing on the 9-node ring.
- **Action**: Hover over edges to show transaction amounts and hop times. Look at the right pane.
- **Narrative**:
  > *"In the Investigation Workspace, we instantly see the ring topology: the fan-in from victims on the left and the rapid fan-out to mules on the right. MuleTrace's haircut taint model quantifies the exact stolen rupees: ₹4.2L entered, ₹70,000 already cashed out, and ₹3.5L currently in motion in the chain."*

### Step 4: Act — The Minimum-Cut Freeze Plan (1:40 – 2:25)
- **Visual**: Workspace center graph with the purple/orange "Freeze first" badge on the optimizer's selected account.
- **Action**: Click **"Freeze Plan"** or press keyboard shortcut `F`.
- **Narrative**:
  > *"Traditional response freezes every account blindly, creating customer distress and regulatory backlash. MuleTrace runs a capacitated minimum-cut algorithm: it computes the cheapest set of accounts to freeze that stops the maximum money. Freezing this single bottleneck account stops ₹4.1L of ₹4.8L before it reaches off-ramps."*
- **Action**: Click **"Heist Replay"** (`/replay/fan_1`). Scrub the timeline, then click **"Apply Recommended Freeze"**. Show the particle flow stopping downstream and the "₹ Stopped" counter count up.

### Step 5: Decide & Trust (2:25 – 3:00)
- **Visual**: Click **Confirm Mule** (`C`), enter a note ("Confirmed fan-in pass-through hub"), and click submit.
- **Action**: Show the toast with 5s Undo. Point out how Personalized PageRank immediately re-ranks neighboring accounts.
- **Drawer**: Click **"Why this score?"** to show SHAP bars and the counterfactual: *"Score drops below flag threshold if forward ratio were under 60%"*.
- **Closing**:
  > *"Every decision is recorded in an immutable audit trail with masked PII. MuleTrace gives fraud response teams the precision to stop mule rings in seconds with full human-in-the-loop compliance."*
