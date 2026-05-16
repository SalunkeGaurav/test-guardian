# Demo Assets

Deterministic demo assets for TestGuardian workflows. All assets are reproducible and contain no random or time-dependent data.

## Available Assets

| Asset | Description |
|-------|-------------|
| `sample-analysis-report.json` | Sample analysis report from a Playwright project |
| `sample-healing-review-bundle.json` | Sample healing review bundle with accepted and rejected proposals |
| `sample-runtime-failure.json` | Sample runtime failure with healing proposal |
| `sample-governance-rejection.json` | Sample governance rejection with detailed explanation |
| `sample-recovery-flow.json` | Sample recovery flow showing step-by-step healing process |

## Usage

### View Analysis Report

```bash
cat demo-assets/sample-analysis-report.json | jq .
```

### Review Healing Bundle

```bash
cat demo-assets/sample-healing-review-bundle.json | jq '.proposals[] | {id, status, confidence}'
```

### Examine Governance Rejection

```bash
cat demo-assets/sample-governance-rejection.json | jq '.governanceDecision.gates[]'
```

### Trace Recovery Flow

```bash
cat demo-assets/sample-recovery-flow.json | jq '.recoveryFlow[] | {step, action, result}'
```

## Determinism Guarantee

All demo assets use `generatedAt: 0` and contain no random values. Running the same analysis on the same input will produce identical output.
