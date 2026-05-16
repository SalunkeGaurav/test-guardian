# Support

## Getting Help

### Documentation

- [README](README.md) — Overview, installation, quick start, and CLI reference
- [Contributing Guide](CONTRIBUTING.md) — How to contribute to TestGuardian
- [Architecture Summary](docs/architecture-summary.md) — Detailed architecture overview
- [CLI Reference](docs/cli-reference.md) — Complete CLI command reference
- [Operational Workflow](docs/operational-workflow.md) — How TestGuardian works
- [Repository Support](docs/repository-support.md) — Supported frameworks and repositories
- [Governance Model](docs/governance-model.md) — Confidence governance explanation
- [Runtime Healing](docs/runtime-healing.md) — Runtime healing process
- [Alpha Limitations](docs/alpha-limitations.md) — Current limitations and known issues

### Community

- **GitHub Issues**: [Report bugs or request features](https://github.com/testguardian/testguardian/issues)
- **Discussions**: [Ask questions and share ideas](https://github.com/testguardian/testguardian/discussions)

### Email Support

- **General**: [support@testguardian.dev](mailto:support@testguardian.dev)
- **Security**: [security@testguardian.dev](mailto:security@testguardian.dev)
- **Conduct**: [conduct@testguardian.dev](mailto:conduct@testguardian.dev)

## Support Tiers

### Community Support (Free)

- GitHub issues and discussions
- Documentation and examples
- Community-driven answers

### Priority Support (Planned)

- Direct email support
- Priority bug fixes
- Feature request prioritization
- *Available in future releases*

## Frequently Asked Questions

### Q: Is TestGuardian production-ready?

A: TestGuardian is currently in **alpha**. It is functional and has been validated against 105 real repositories, but some features are experimental and the API may change. See [Alpha Limitations](docs/alpha-limitations.md) for details.

### Q: Which testing frameworks are supported?

A: **Playwright** (TypeScript/JavaScript) is fully supported. **Cypress** and **Selenium** have experimental adapters. See [Repository Support](docs/repository-support.md) for details.

### Q: Does TestGuardian use AI?

A: **No.** TestGuardian is deterministic by design. All healing proposals are generated using rule-based analysis, not AI or machine learning. This ensures reproducibility and explainability.

### Q: How do I report a bug?

A: Open a [GitHub issue](https://github.com/testguardian/testguardian/issues) with:
- TestGuardian version
- Node.js version
- Steps to reproduce
- Expected vs actual behavior
- Relevant logs or output

### Q: How do I contribute?

A: See our [Contributing Guide](CONTRIBUTING.md) for detailed instructions.

### Q: Can I use TestGuardian in my CI/CD pipeline?

A: Yes! TestGuardian is designed for CI/CD integration. Use the `--json` flag for machine-readable output. See [CLI Reference](docs/cli-reference.md) for details.

### Q: Is my test data safe?

A: TestGuardian runs locally and does not transmit data externally. However, generated reports in `.testguardian/` may contain sensitive test data. Do not commit these reports to public repositories. See [Security Policy](SECURITY.md) for details.

## Response Times

| Channel | Expected Response |
|---------|------------------|
| GitHub Issues | 1-3 business days |
| GitHub Discussions | 1-5 business days |
| Email (General) | 3-5 business days |
| Email (Security) | 48 hours |

## Version Support

| Version | Status | Support Until |
|---------|--------|---------------|
| 0.1.0-alpha | Current | Until 0.2.0 release |
| Older versions | Unsupported | N/A |
