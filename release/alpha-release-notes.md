# TestGuardian 0.1.0-alpha Release Notes

**Release Date:** 2026-05-16
**Version:** 0.1.0-alpha
**Status:** Alpha Release

---

## Overview

TestGuardian 0.1.0-alpha is the first public release of the deterministic test analysis and healing platform. This release provides automated test repair, confidence governance, and operational reliability analysis for Playwright and other testing frameworks.

## What's New

### Core Features

- **Deterministic Healing Pipeline**: Automated test healing with confidence governance
- **AST-Aware Patch Generation**: Safe, syntax-verified patch generation
- **Confidence Governance**: Deterministic confidence scoring and gating
- **Stability Analysis**: Test stability monitoring and reporting
- **Audit Trail**: Complete audit trail for all decisions
- **Repository Validation**: Framework detection and compatibility validation
- **Execution Lab**: Test execution and evidence collection
- **Developer Review**: Developer-facing review bundles
- **Production Readiness**: Production readiness assessment
- **Corpus Execution**: Large-scale corpus analysis
- **Stabilization Analysis**: Stabilization priorities and alpha readiness

### CLI Commands

- `testguardian init` - Initialize `.testguardian` in current project
- `testguardian analyze <path>` - Analyze test framework and discover tests
- `testguardian pipeline <path>` - Execute full healing pipeline
- `testguardian review` - Generate developer-facing review bundles
- `testguardian validate` - Validate healing proposals
- `testguardian execution-lab` - Execute tests and collect evidence
- `testguardian corpus-scale --corpus <path>` - Large-scale corpus validation
- `testguardian stabilization --corpus <path>` - Stabilization analysis
- `testguardian alpha-prepare` - Prepare alpha release with consolidated reports

### Framework Support

- **Playwright** (TypeScript/JavaScript) - Stable
- **Cypress** - Experimental adapter
- **Selenium** - Experimental adapter

### Validation Results

- **553 unit tests** passing across 23 test files
- **105 real repositories** validated
- **99% compatibility** rate
- **0 critical issues** found
- **100% stability score**

## Known Limitations

See [known-limitations.md](known-limitations.md) for full details.

### Framework Support

- Primary support for Playwright only
- Cypress and Selenium are experimental

### Healing Scope

- Locator failures, navigation issues, timing problems supported
- Logic errors, assertion failures, data issues not supported

### Performance

- Large repositories (>1000 test files) may experience slower analysis

## Installation

```bash
npm install testguardian
```

## Quick Start

```bash
npx testguardian init
npx testguardian analyze ./my-project
npx testguardian pipeline ./my-project
npx testguardian review
```

## Documentation

- [README](../README.md) - Overview and quick start
- [CLI Reference](../docs/cli-reference.md) - Complete CLI reference
- [Architecture Summary](../docs/architecture-summary.md) - Architecture overview
- [Governance Model](../docs/governance-model.md) - Confidence governance explanation
- [Alpha Limitations](../docs/alpha-limitations.md) - Current limitations

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines.

## License

MIT License - see [LICENSE](../LICENSE) for details.
