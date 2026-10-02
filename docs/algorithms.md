# MuleTrace Algorithmic Specification

> **Honesty & Compliance Notice**: All algorithms and metrics documented herein are evaluated on synthetic datasets containing planted mule networks and decoy patterns. In production systems, flagged accounts represent **"recommended review actions"** and **never a determination of legal guilt**. Mules may be unwitting victims of coercion, phishing, or identity theft. A human compliance officer must independently verify evidence before initiating any regulatory account freeze.

---

## 1. Graph Construction

Transactions are modeled as a directed multigraph $G = (V, E)$, where:
- Each vertex $v \in V$ represents a bank account.
- Each directed edge $e = (u, v, k) \in E$ represents a distinct transfer from source account $u$ to destination account $v$ at UTC timestamp $t_e$ with monetary amount $A_e \in \mathbb{R}^+$ and channel $c_e \in \{\text{UPI}, \text{IMPS}, \text{NEFT}\}$.

Account nodes maintain auxiliary attribute vectors including KYC age, masked phone/address hashes, and device/IP identifiers.

---

## 2. Core Detectors

### 2.1 Fan-in / Fan-out Hubs (`fan.py`)
Identifies layering hubs designed to aggregate money from numerous victims and rapidly disperse it to downstream mules.
- **Criteria**:
  1. An account $h$ receives inflows from $\ge N$ distinct senders ($N \ge 6$) within time window $T_{\text{in}}$ (default 30 min):
     $$\text{Inflow}(h, [t, t + T_{\text{in}}]) = \sum_{e \in E_{\text{in}}(h)} A_e$$
  2. Within an overlapping disbursement window $T_{\text{out}}$ (default 60 min), $h$ forwards at least ratio $R$ (default $85\%$) of the inflow to $\ge M$ distinct receivers ($M \ge 3$):
     $$\text{Forward Ratio} = \frac{\text{Outflow}(h)}{\text{Inflow}(h)} \ge R$$
- **Decoy Avoidance**:
  - Payroll accounts pay hundreds of recipients but exhibit zero preceding sudden fan-in within $T_{\text{in}}$.
  - Merchants exhibit high inflow from many senders across days, but retain funds or transfer out on standard daily cycles without rapid fan-out.

### 2.2 Bounded Time-Ordered Cycles (`cycle.py`)
Circular routing designed to obfuscate audit trails and test mule liquidity.
- **Criteria**:
  - Directed simple cycles $C = (v_1, v_2, \dots, v_k, v_1)$ of bounded length $3 \le k \le 6$.
  - Strictly time-respecting: $t(v_i \to v_{i+1}) < t(v_{i+1} \to v_{i+2})$.
  - Completed within maximum elapsed window $T_{\text{cycle}} \le 60\text{ min}$.
  - Shrinking or near-constant amount ratio: $A_{i+1} \approx \lambda A_i$ where $\lambda \in [0.5, 1.02]$.
- **Deduplication**: Canonical cycle representation by minimum vertex rotation.

### 2.3 Pass-Through Chains (`chain.py`)
Rapid pass-through layering where accounts act as relay nodes holding minimal balance.
- **Criteria**:
  - Account receives $A_{\text{in}}$ at $t_{\text{in}}$ and sends $A_{\text{out}}$ at $t_{\text{out}}$ with gap $\Delta t = t_{\text{out}} - t_{\text{in}} \le 30\text{ min}$.
  - High pass-through ratio: $0.90 \le \frac{A_{\text{out}}}{A_{\text{in}}} \le 1.02$.
  - Retained balance after transfer: $\text{Balance} \le \text{₹}5,000$.
  - Connected sequences forming chains of length $\ge 3$ nodes.

### 2.4 New-Account Clusters (`cluster.py`)
Syndicates creating multiple accounts simultaneously using shared infrastructure.
- **Criteria**:
  - Disjoint-set union (Union-Find) on accounts opened within $\le 30\text{ days}$.
  - Edges formed by exact matches on:
    - Device ID (weight 1.0)
    - KYC Phone (weight 0.8)
    - Physical Address (weight 0.6)
    - IP Address (weight 0.5, discounting common NAT IPs shared by $> 10$ accounts).
  - Flags connected components of size $\ge 3$.

### 2.5 Dormancy Awakening (`dormancy.py`)
Sleeper mules opened $\ge 90\text{ days}$ ago that remain dormant until activated for a sudden large fraud operation.
- **Criteria**:
  - Account age $\ge 90\text{ days}$.
  - Cumulative volume during 7-day observation $\ge \text{₹}1,00,000$.
  - Single-burst concentration: $\ge 75\%$ of 7-day volume occurs in a single $< 4\text{ hour}$ window.
  - High pass-through forwarding: $0.80 \le \frac{\text{Outflow}}{\text{Inflow}} \le 1.15$.

---

## 3. Advanced Analytics

### 3.1 Proportional Haircut Taint Tracking (`taint.py`)
Quantifies how much stolen money currently resides in each account.
- **Formulation**:
  Given seed transfers $S = \{(u_0, v_0, t_0, A_0)\}$ of victim funds, we simulate the chronological event stream $E = (e_1, e_2, \dots, e_m)$ where $t_{e_i} \le t_{e_{i+1}}$.
  For each node $v$, we maintain $\text{TaintBalance}(v)$.
  When transfer $e = (u, v, t, A)$ occurs:
  $$\Delta_{\text{taint}} = \min(\text{TaintBalance}(u), A)$$
  $$\text{TaintBalance}(u) \leftarrow \text{TaintBalance}(u) - \Delta_{\text{taint}}$$
  $$\text{TaintBalance}(v) \leftarrow \text{TaintBalance}(v) + \Delta_{\text{taint}}$$
- **Cycle Invariance**: Taint allocations cannot exceed total initial victim funds.
- **Outputs**: $\text{TaintedIn}$, $\text{TaintedOut}$, $\text{TaintedRemaining}$, and $\text{CashedOut}$.

### 3.2 Minimum-Cut Freeze Optimizer (`freeze_optimizer.py`)
Computes the cheapest set of accounts to freeze to stop the maximum amount of tainted money before cash-out.
- **Reduction from Vertex Cut to Edge Cut**:
  1. Each candidate mule node $v$ is split into $v_{\text{in}}$ and $v_{\text{out}}$.
  2. Directed internal edge $(v_{\text{in}}, v_{\text{out}})$ is assigned capacity $c(v) = \text{StoppableRupees}(v)$.
  3. Every transaction $(u, v)$ creates edge $(u_{\text{out}}, v_{\text{in}})$ with capacity $\infty$.
  4. Super-source $S^*$ connects to seed accounts; terminal cash-out sinks connect to super-sink $T^*$.
  5. The minimum $S^*-T^*$ cut partition $(S, T)$ yields cut edges $(v_{\text{in}}, v_{\text{out}})$ corresponding exactly to the optimal account freeze set.
- **Tie-Breaks**: Deterministic ordering by stoppable rupees descending, then degree, then alphanumeric ID.

### 3.3 Personalized PageRank Risk Propagation (`propagation.py`)
Guilt-by-association scoring seeded from analyst-confirmed mules.
- **Formulation**:
  Random walk with restart on graph $G$:
  $$\mathbf{p} = (1 - \alpha) \mathbf{s} + \alpha \mathbf{P}^T \mathbf{p}$$
  where:
  - Teleportation seed vector $\mathbf{s}_u = \frac{1}{|M_{\text{confirmed}}|}$ if $u \in M_{\text{confirmed}}$, else $0$.
  - Cleared benign accounts $u \in C_{\text{cleared}}$ are clamped to weight $0$ and receive zero risk boost.
- **Re-ranking**: Triage decisions instantly update the priority queue.

### 3.4 Community Discovery via Louvain (`communities.py`)
Uncovers emergent syndicates matching no predefined rule template.
- Optimizes graph modularity $Q$ with resolution parameter $\gamma = 1.0$.
- Scores communities by internal volume ratio $\frac{V_{\text{internal}}}{V_{\text{total}}}$, graph density, and average risk score.

### 3.5 SHAP Explanations & Counterfactuals (`explain.py`)
Provides transparent, defensible explanations for every scored account:
- Evaluates marginal feature contributions against tree ensembles.
- Synthesizes counterfactual statements indicating the minimal operational change required for the account to drop below the flagging threshold.
