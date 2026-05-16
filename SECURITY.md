# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.0-alpha | Yes |

## Reporting a Vulnerability

We take the security of TestGuardian seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Reporting Process

1. **Do not open a public issue** for security vulnerabilities
2. Email us at [security@testguardian.dev](mailto:security@testguardian.dev) with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

3. We will acknowledge receipt of your report within 48 hours
4. We will provide a detailed response within 7 days with:
   - Confirmation of the vulnerability
   - Planned fix timeline
   - Credits (if you wish to be credited)

### What to Expect

- **48 hours**: Acknowledgment of your report
- **7 days**: Initial assessment and response
- **30 days**: Fix implementation and release (for critical vulnerabilities)
- **90 days**: Public disclosure (if fix is not ready)

### Security Best Practices

When using TestGuardian:

1. **Never commit `.testguardian/` reports** containing sensitive test data to public repositories
2. **Review all generated patches** before applying them to your codebase
3. **Run TestGuardian in a CI environment** with appropriate access controls
4. **Keep TestGuardian updated** to receive security patches

### Scope

This security policy covers:

- TestGuardian CLI and core modules
- Public API surface
- Persistence and storage utilities
- CLI commands and their outputs

Out of scope:

- Third-party dependencies (report to their maintainers)
- Example projects and demo assets
- Documentation content

### Recognition

We publicly acknowledge security researchers who responsibly disclose vulnerabilities (with their permission).
