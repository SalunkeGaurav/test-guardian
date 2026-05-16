# TestGuardian

> **Deterministic test analysis and healing platform for Playwright and other testing frameworks.**

[![npm version](https://img.shields.io/badge/version-0.1.0--alpha-blue)](https://www.npmjs.com/package/testguardian)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.0%2B-blue)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-553%20passing-brightgreen)](tests/unit/)

---

## Overview

TestGuardian is a framework-agnostic automation healing platform that analyzes, repairs, and validates test suites **deterministically**. It detects fragile locators, generates safe patches, and provides confidence-governed healing proposals — all without AI, randomness, or autonomous behavior.

### Core Philosophy

1. **Deterministic by Design**: Every output is reproducible given the same inputs. No `Date.now()`, no `Math.random()`, no timing-based assertions.
2. **No Magic**: TestGuardian does not use AI or autonomous decision-making. All healing proposals are explainable and auditable.
3. **Safety First**: Every patch passes through confidence governance gates before acceptance. Unsafe proposals are rejected with clear explanations.
4. **Framework Agnostic**: Built on adapter architecture. Playwright is the primary adapter; Cypress and Selenium adapters are available.
5. **Developer in Control**: All healing proposals require developer review. TestGuardian suggests, you decide.

---

## Architecture

```
test-guardian/
├── src/
│   ├── interfaces/          # Core interface definitions
│   ├── models/              # Domain models (TestFile, Locator, Patch, etc.)
│   ├── adapters/            # Framework adapters (Playwright, Cypress, Selenium)
│   ├── core/                # Core functionality modules
│   │   ├── pipeline/        # Healing pipeline orchestration
│   │   ├── patcher/         # AST-aware patch generation & validation
│   │   ├── unified-runtime/ # Unified execution runtime
│   │   ├── repository-validator/ # Repository compatibility validation
│   │   ├── runtime-hardening/ # Browser runtime stability
│   │   ├── execution-lab/   # Test execution & evidence collection
│   │   ├── stabilization/   # Stabilization analysis & alpha readiness
│   │   ├── large-scale-corpus/ # Corpus-scale validation
│   │   ├── developer-review/ # Developer-facing review bundles
│   │   └── ...              # Additional modules
│   ├── public-api/          # Stable public API surface
│   └── core/storage/        # Centralized persistence utilities
├── cli/                     # CLI commands
├── examples/                # Quick-start examples
├── demo-assets/             # Demo workflow assets
└── tests/                   # 553 unit tests
```

### How Deterministic Healing Works

```
Test Failure Detected
        ↓
  Failure Analysis (deterministic parsing)
        ↓
  Healing Candidate Generation (rule-based, no AI)
        ↓
  Candidate Ranking (confidence scoring, reproducible)
        ↓
  Safety Validation (regression checks, side-effect analysis)
        ↓
  Governance Gate (threshold-based accept/reject)
        ↓
  Patch Generation (AST-aware, syntax-verified)
        ↓
  Developer Review (explainable, auditable)
        ↓
  Apply or Reject (developer decision)
```

Every step produces deterministic output. Run the same analysis twice, get the same results.

---

## Installation

```bash
npm install testguardian
# or
yarn add testguardian
# or
pnpm add testguardian
```

**Requirements:**
- Node.js >= 18.0.0
- npm >= 9.0.0
- Playwright >= 1.30.0 (for Playwright adapter)

---

## Quick Start

### 1. Initialize in Your Project

```bash
npx testguardian init
```

This creates a `.testguardian/` directory for reports and configuration.

### 2. Analyze Your Test Suite

```bash
npx testguardian analyze ./my-playwright-project
```

TestGuardian will:
- Detect your testing framework
- Discover test files
- Extract locators and page objects
- Identify fragile patterns
- Generate an analysis report

### 3. Run the Healing Pipeline

```bash
npx testguardian pipeline ./my-playwright-project
```

This executes the full healing pipeline:
- Analyzes test failures
- Generates healing candidates
- Validates patches for safety
- Produces governance-governed proposals

### 4. Review Healing Proposals

```bash
npx testguardian review --report .testguardian/pipeline/latest.json
```

Review generated healing proposals with full explainability.

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `testguardian init` | Initialize `.testguardian` in current project |
| `testguardian analyze <path>` | Analyze test framework and discover tests |
| `testguardian pipeline <path>` | Execute full healing pipeline |
| `testguardian review` | Generate developer-facing review bundles |
| `testguardian validate` | Validate healing proposals |
| `testguardian execution-lab` | Execute tests and collect evidence |
| `testguardian corpus-scale --corpus <path>` | Large-scale corpus validation |
| `testguardian stabilization --corpus <path>` | Stabilization analysis |
| `testguardian alpha-prepare` | Prepare alpha release with consolidated reports |

### CLI Options

All commands support:
- `--verbose` — Enable debug logging
- `--compact` — Compact output mode
- `--json` — Machine-readable JSON output

---

## Repository Validation

Validate real repository compatibility before running analysis:

```bash
npx testguardian validate-repo --path ./my-project --verbose
```

**Output:**
```
[tg][info][RepositoryValidator] Starting validation of: ./my-project
[tg][info][RepositoryValidator] Framework detected: Playwright
[tg][info][RepositoryValidator] Config found: playwright.config.ts
[tg][info][RepositoryValidator] Test files discovered: 12
[tg][info][RepositoryValidator] Validation complete. Status: supported
```

### Compatibility Statuses

| Status | Meaning |
|--------|---------|
| `supported` | Full compatibility, all features available |
| `partially-supported` | Some features available, limitations apply |
| `unsupported` | Framework not supported or critical issues found |

---

## Runtime Healing

Execute runtime healing for failing tests:

```bash
npx testguardian runtime-heal \
  --test ./tests/login.spec.ts \
  --line 42 \
  --locator "page.locator('#submit-btn')" \
  --project ./my-project
```

**Healing Flow:**
1. Captures the failing test execution
2. Generates alternative locator candidates
3. Validates each candidate in a sandbox
4. Returns the safest healing proposal

---

## Governance Model

TestGuardian uses a **confidence governance** system to ensure healing proposals meet quality thresholds:

### Governance Gates

1. **Confidence Threshold**: Minimum confidence score (default: 70%)
2. **Safety Validation**: Patches must pass regression checks
3. **Stability Analysis**: Detects flaky patterns
4. **Audit Trail**: All decisions are logged and explainable

### Example Governance Decision

```json
{
  "passed": true,
  "confidence": 0.85,
  "safetyPassed": true,
  "stabilityPassed": true,
  "auditTrail": [
    { "stage": "confidence-check", "decision": "accept", "score": 0.85 },
    { "stage": "safety-validation", "decision": "accept", "reason": "no regressions" },
    { "stage": "stability-analysis", "decision": "accept", "reason": "stable across 3 runs" }
  ]
}
```

---

## Alpha Limitations

TestGuardian is in **alpha**. The following limitations apply:

### Framework Support
- **Primary**: Playwright (TypeScript/JavaScript)
- **Experimental**: Cypress, Selenium (adapter-based)
- **Not Supported**: TestCafe, WebdriverIO, Puppeteer

### Healing Scope
- **Supported**: Locator failures, navigation issues, timing problems
- **Not Supported**: Logic errors, assertion failures, data issues

### Known Issues
- Large repositories (>1000 test files) may experience slower analysis
- Deeply nested POM hierarchies may not be fully analyzed
- Dynamic locators generated at runtime may not be detected
- Custom test frameworks require adapter development

See [docs/alpha-limitations.md](docs/alpha-limitations.md) for full details.

---

## Roadmap

### Alpha (Current)
- [x] Playwright adapter
- [x] Deterministic healing pipeline
- [x] Confidence governance
- [x] Patch generation and validation
- [x] Developer review bundles
- [x] Repository validation
- [x] Corpus-scale execution
- [x] Stabilization analysis
- [x] Alpha release preparation

### Beta (Planned)
- [ ] Cypress adapter (stable)
- [ ] Selenium adapter (stable)
- [ ] Interactive developer review UI
- [ ] Custom governance rules
- [ ] CI/CD integration templates
- [ ] Performance improvements for large repositories

### 1.0 (Future)
- [ ] ML-based confidence calibration (opt-in)
- [ ] Real-time collaboration
- [ ] Cloud-based corpus execution
- [ ] Visual regression test support
- [ ] Custom framework adapter SDK

---

## Supported Frameworks

| Framework | Status | Adapter | Notes |
|-----------|--------|---------|-------|
| Playwright | **Stable** | Built-in | TypeScript/JavaScript, full feature support |
| Cypress | Experimental | `adapters/cypress/` | Basic test discovery and analysis |
| Selenium | Experimental | `adapters/selenium/` | Java test file support |

---

## Report Examples

### Analysis Report

```json
{
  "framework": "playwright",
  "testFiles": 12,
  "totalTests": 47,
  "locators": {
    "total": 156,
    "fragile": 23,
    "stable": 133
  },
  "pageObjects": 8,
  "navigations": 34,
  "healingOpportunities": 15
}
```

### Healing Review Bundle

```json
{
  "reportId": "review-1",
  "totalProposals": 5,
  "accepted": 3,
  "rejected": 2,
  "proposals": [
    {
      "id": "patch-1",
      "originalLocator": "page.locator('#submit-btn')",
      "proposedLocator": "page.locator('[data-testid=\"submit\"]')",
      "confidence": 0.92,
      "safetyPassed": true,
      "explanation": "More specific selector with test ID attribute"
    }
  ]
}
```

---

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct, development process, and how to submit pull requests.

---

## License

TestGuardian is released under the [MIT License](LICENSE).

---

## Acknowledgments

- Built on the principles of deterministic testing
- Inspired by the Playwright community
- Designed for developers who value reproducibility and safety
