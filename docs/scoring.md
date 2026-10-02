# MuleTrace Scoring

Each account receives a deterministic score from 0 to 100. Detector signals add evidence and innocence guards reduce the score when a benign explanation is stronger.

Conceptually:

```text
score = clamp(signal evidence - guard penalties + watchlist context, 0, 100)
```

The exact weights are configured in `config.yaml` and applied by the backend scoring module. The UI shows the score together with the detector reasons so an analyst can review the evidence instead of relying on a black-box label.

## Detector Signals

- Fan-in and fan-out: many senders or receivers connected by a short time window.
- Cycles: money returns through a time-ordered account loop.
- Pass-through chains: accounts forward most incoming money quickly.
- New-account clusters: accounts share device, IP, or KYC attributes.
- Dormancy: an inactive account becomes active in a suspicious burst.

## Innocence Guards

Guards look for patterns that can resemble mule activity without being fraud, such as payroll, merchants, family transfers, and shared corporate devices. A guard should lower confidence and provide a plain explanation, not silently erase the underlying signal.

Scores are recommendations for review. They are not a legal finding.
