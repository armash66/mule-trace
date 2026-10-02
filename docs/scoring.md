# MuleTrace — Scoring & Explainability Engine

MuleTrace rejects opaque "black-box" fraud scoring. Every flagged entity receives a **deterministic 0–100 Risk Score**, a categorical **Risk Band**, and an **explainable breakdown** showing exactly which signals contributed points and which guards deducted penalties.

---

## 1. Core Mathematical Formula

For any account $A$, the risk score $R(A)$ is defined as:

$$R(A) = \operatorname{clamp}\left(\sum_{i} w_i \cdot S_i(A) - \sum_{j} G_j(A) + B_{\text{watchlist}}(A), \; 0, \; 100\right)$$

Where:
- $S_i(A) \in [0, 1]$: Normalized signal strength from detector $i$.
- $w_i \in [0, 100]$: Weight allocated to detector $i$.
- $G_j(A) \ge 0$: Penalty deducted by innocence guard $j$.
- $B_{\text{watchlist}}(A) \in \{0, 25\}$: Priority boost if previously flagged or present in known-mule database.

---

## 2. Default Detector Weights

| Detector | Weight ($w_i$) | Typology Detected |
| :--- | :---: | :--- |
| **FAN_IN_OUT** | 30 | Rapid aggregation from multiple senders followed by immediate disbursement. |
| **CYCLE** | 25 | Time-respecting circular layering loops returning funds to source. |
| **PASS_THROUGH** | 25 | Low-retention transit accounts forwarding $\ge 90\%$ within minutes. |
| **NEW_CLUSTER** | 15 | Newly opened accounts sharing device, IP, or KYC identifiers. |
| **BEHAVIORAL** | 10 | Velocity spikes, dormant account reactivations, after-hours bursts. |

---

## 3. Innocence Guards & Penalties ($G_j$)

To prevent false-positive harassment of legitimate businesses and families, MuleTrace evaluates guard criteria:

| Guard Name | Condition | Penalty Deduction | Reason Explanation Added |
| :--- | :--- | :---: | :--- |
| **Merchant Guard** | Consistent daytime inflows, established age (>180d) | -30 pts | "High transaction volume consistent with verified commercial merchant." |
| **Payroll Guard** | Periodic 1-to-many disbursements on month-end | -25 pts | "Scheduled cyclical transfers matching corporate payroll distribution." |
| **Family Pair Guard** | Long-standing reciprocal transfers between 2 accounts | -20 pts | "Bi-directional transfers consistent with shared household or family support." |
| **Public Wi-Fi Guard** | IP / Device shared by >50 distinct accounts | -15 pts | "Shared network identifier matches high-density public access point." |

---

## 4. Risk Bands & Operational SLA

| Risk Band | Score Range | Default SLA | Recommended Operational Action |
| :---: | :---: | :---: | :--- |
| **CRITICAL** | 85 – 100 | **2 Hours** | Immediate freeze priority; notify receiving bank branch. |
| **HIGH** | 70 – 84 | **6 Hours** | Prioritized investigation; review device linkage & KYC hashes. |
| **MEDIUM** | 40 – 69 | **24 Hours** | Standard analyst queue; cross-reference transaction notes. |
| **LOW** | 0 – 39 | **72 Hours** | Watchlist monitoring; automated suppression if no further activity. |
