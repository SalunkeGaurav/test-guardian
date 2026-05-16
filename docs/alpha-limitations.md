# TestGuardian Alpha Limitations

## Current Limitations

### Framework Support

- **Primary**: Playwright (TypeScript/JavaScript)
- **Experimental**: Cypress, Selenium (adapter-based)
- **Not Supported**: TestCafe, WebdriverIO, Puppeteer

### Test Types

- **Supported**: UI tests, API tests
- **Not Supported**: Visual regression tests, performance tests

### Healing Scope

- **Supported**: Locator failures, navigation issues, timing problems
- **Not Supported**: Logic errors, assertion failures, data issues

### Governance

- **Supported**: Confidence thresholds, safety validation, stability analysis
- **Not Supported**: Custom governance rules, ML-based confidence

### Corpus Execution

- **Supported**: Playwright repositories with standard structure
- **Not Supported**: Non-standard test frameworks, binary test files

### Developer Review

- **Supported**: Patch visualization, governance explanation, replay evidence
- **Not Supported**: Interactive review UI, real-time collaboration

## Known Issues

1. **Large Repository Performance**: Very large repositories (>1000 test files) may experience slower analysis
2. **Complex POM Patterns**: Deeply nested page object hierarchies may not be fully analyzed
3. **Dynamic Locators**: Locators generated at runtime may not be detected
4. **Custom Frameworks**: Custom test frameworks require adapter development

## Experimental Features

The following features are experimental and may change:

- Confidence calibration
- Healing benchmark
- Healing intelligence
- Pattern intelligence
- Adversarial testing
- Corpus execution engine
- Developer workflow
- CI failure validation
- Architecture cohesion audit
- Risk discrimination

## Future Work

- Expanded framework support
- Interactive developer review UI
- Custom governance rules
- ML-based confidence calibration
- Real-time collaboration
- Cloud-based corpus execution
- Integration with CI/CD pipelines

## Stability Guarantees

### Stable APIs

- Core interfaces (FrameworkAdapter, LocatorIndexProvider, etc.)
- Domain models (TestFile, Locator, Patch, etc.)
- Healing pipeline
- Patch generator

### Internal APIs

- Runtime orchestration
- Repository validation
- Execution lab
- Operational reliability

### Experimental APIs

- All features listed above as experimental
- Subject to change without notice
- Not covered by semver guarantees
