# Contributing to TestGuardian

Thank you for your interest in contributing to TestGuardian! This document provides guidelines and instructions for contributing.

## Code of Conduct

This project follows a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How to Contribute

### Reporting Bugs

Before creating a bug report:

1. Check the [existing issues](https://github.com/testguardian/testguardian/issues) to see if the issue has already been reported
2. Collect information about the bug:
   - TestGuardian version
   - Node.js version
   - Operating system
   - Steps to reproduce
   - Expected vs actual behavior
   - Relevant logs or output

Create a bug report using the issue template with as much detail as possible.

### Suggesting Enhancements

Enhancement suggestions are welcome! Before submitting:

1. Check existing issues and the [roadmap](README.md#roadmap)
2. Ensure your suggestion aligns with TestGuardian's core philosophy:
   - Deterministic behavior
   - No AI or autonomous systems
   - Developer in control
   - Safety first

Create an enhancement suggestion using the issue template.

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run the test suite: `npm test`
5. Ensure all tests pass: `npx vitest run`
6. Run type checking: `npx tsc --noEmit`
7. Commit your changes with a clear message
8. Push to your fork: `git push origin feature/my-feature`
9. Open a Pull Request

### Commit Message Guidelines

We follow conventional commit messages:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(patcher): add AST-aware patch generation
fix(runtime): resolve stale context recovery issue
docs(readme): update installation instructions
test(pipeline): add healing pipeline integration tests
```

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/testguardian/testguardian.git
cd test-guardian

# Install dependencies
npm install

# Run tests
npm test

# Run type checking
npx tsc --noEmit
```

### Project Structure

```
test-guardian/
├── src/
│   ├── interfaces/          # Core interface definitions
│   ├── models/              # Domain models
│   ├── adapters/            # Framework adapters
│   ├── core/                # Core functionality modules
│   ├── public-api/          # Stable public API surface
│   └── core/storage/        # Centralized persistence
├── cli/                     # CLI commands
├── examples/                # Quick-start examples
├── demo-assets/             # Demo workflow assets
└── tests/                   # Test suite
```

### Core Modules

| Module | Description |
|--------|-------------|
| `pipeline/` | Healing pipeline orchestration |
| `patcher/` | AST-aware patch generation and validation |
| `unified-runtime/` | Unified execution runtime |
| `repository-validator/` | Repository compatibility validation |
| `runtime-hardening/` | Browser runtime stability |
| `execution-lab/` | Test execution and evidence collection |
| `stabilization/` | Stabilization analysis and alpha readiness |
| `large-scale-corpus/` | Corpus-scale validation |
| `developer-review/` | Developer-facing review bundles |

### Adding a New Feature

1. **Identify the module**: Determine which core module your feature belongs to
2. **Create types**: Add type definitions to the module's `types.ts` file
3. **Implement**: Add your implementation, following existing patterns
4. **Export**: Update the module's `index.ts` to export new types and classes
5. **Test**: Add unit tests in `tests/unit/`
6. **Document**: Update relevant documentation

### Design Principles

When contributing, follow these principles:

1. **Deterministic Behavior**: No `Date.now()`, `Math.random()`, or timing-based assertions
2. **No New Intelligence Engines**: Reuse existing modules only
3. **Zero Duplicated Persistence**: Use `src/core/storage/persistence-helper.ts`
4. **Stable Public API**: New exports must be categorized as stable, internal, or experimental
5. **Reproducible Outputs**: All outputs must be deterministic given the same inputs

### Testing

All contributions must include tests:

```bash
# Run all tests
npm test

# Run specific test file
npx vitest run tests/unit/my-module.test.ts

# Run tests in watch mode
npx vitest
```

### Code Style

- Use TypeScript for all new code
- Follow existing code conventions
- No comments unless explicitly requested
- Use descriptive variable and function names
- Keep functions focused and small

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Run full test suite
4. Create release tag
5. Publish to npm

## Questions?

- Check the [documentation](docs/)
- Open an [issue](https://github.com/testguardian/testguardian/issues)
- Read the [README](README.md)
