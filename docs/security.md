# MuleTrace — Security Architecture, Threat Model & Compliance

MuleTrace is engineered with a **Security-First, Privacy-Preserving** architecture designed to satisfy strict banking secrecy laws, the **Digital Personal Data Protection (DPDP) Act 2023**, and **FIU-IND Anti-Money Laundering (AML)** guidelines.

---

## 1. Threat Model & Mitigations

| Threat ID | Threat Vector | Risk Level | MuleTrace Mitigation |
| :--- | :--- | :---: | :--- |
| **TH-01** | **Insider Threat / Rogue Analyst** altering investigation records | Critical | **Cryptographic Hash Chain**: SHA-256 forward-linked audit trail. Modifying a DB row breaks verification. |
| **TH-02** | **Unauthorized Freeze Actions** by individual operator | High | **Dual-Control (Maker-Checker)**: Operators cannot approve their own freeze orders or threshold changes. |
| **TH-03** | **PII Scraping / Bulk Data Harvesting** | High | **Default Masking (`ACC-****4821`)**: Full account details require a logged justification with 60-second auto-expiry. |
| **TH-04** | **JWT Algorithm Confusion (`alg: none`)** | Critical | Strict JWT validation rejecting `none` algorithm or mismatched signing secrets. |
| **TH-05** | **Account Enumeration / Credential Stuffing** | Medium | Generic error responses (`Invalid username or password`) + exponential lockout after 5 consecutive failures. |
| **TH-06** | **CSV Injection / Formula Injection** | Medium | Prepending safe single quotes (`'`) to cells starting with `=`, `+`, `-`, `@` during CSV exports. |
| **TH-07** | **In-Transit Eavesdropping** | High | HTTPS mandatory in production; strict CORS policy limited to approved origins. |

---

## 2. OWASP Top 10 Alignment Matrix

- **A01: Broken Access Control**: Strict Role-Based Access Control (RBAC) enforced via FastAPI dependencies across all routes (`analyst`, `lead`, `compliance`, `admin`, `auditor`). Read-only auditor role blocked from mutations.
- **A02: Cryptographic Failures**: Passwords hashed using salted `bcrypt`. PII data (phone, address, PAN) stored only as cryptographic hashes (`kyc_*_hash`).
- **A03: Injection**: SQLAlchemy 2.0 parameterized queries eliminate SQL injection. Dynamic CSV inputs validated via strict Pydantic schemas.
- **A04: Insecure Design**: Proportional fund tracing prevents naive premature freezes; dual-authorization required for irreversible operational actions.
- **A05: Security Misconfiguration**: Default development secrets rejected in production mode; debug stack traces omitted from client responses.

---

## 3. Data Classification

| Data Tier | Examples | Storage Policy | Masking / Access Policy |
| :--- | :--- | :--- | :--- |
| **Tier 1: PII** | Account numbers, customer names | Masked in UI, unmasked on demand | Masked by default (`ACC-****1234`). Unmask logged in audit chain. |
| **Tier 2: Financial** | Amounts, timestamps, balances | Plaintext in secure DB | Accessible only to authenticated investigators. |
| **Tier 3: Audit** | User actions, timestamps, hashes | Immutable append-only ledger | Verifiable by auditors; non-deletable. |

---

## 4. Residual Risks & Future Scope (Production Readiness)
1. **Enterprise SSO / SAML / OIDC**: Currently supports JWT with refresh tokens. Enterprise Azure AD / Okta integration planned for v3.1.
2. **Hardware Security Module (HSM)**: Audit chain signing key currently managed via environment secrets; migration to cloud KMS / HSM planned.
3. **Web Application Firewall (WAF)**: Production deployments should be fronted by Cloudflare or AWS WAF for Layer 7 DDoS mitigation.
