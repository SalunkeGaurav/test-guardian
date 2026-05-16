# Known Limitations

TestGuardian is in **alpha**. The following limitations apply to this release.

## Framework Support

### Supported

| Framework | Status | Notes |
|-----------|--------|-------|
| Playwright (TypeScript) | **Stable** | Full feature support |
| Playwright (JavaScript) | **Stable** | Full feature support |
| Cypress | Experimental | Basic test discovery and analysis |
| Selenium (Java) | Experimental | Basic test file support |

### Not Supported

- TestCafe
- WebdriverIO
- Puppeteer
- Custom test frameworks (require adapter development)

## Test Types

### Supported

- UI tests (browser-based)
- API tests (Playwright API testing)

### Not Supported

- Visual regression tests
- Performance tests
- Accessibility tests
- Unit tests

## Healing Scope

### Supported

- Locator failures (broken selectors)
- Navigation issues (timing, async loading)
- Timing problems (race conditions, delays)
- DOM structure changes (element moved, renamed)

### Not Supported

- Logic errors (incorrect test assertions)
- Assertion failures (wrong expected values)
- Data issues (missing test data, API failures)
- Environment issues (missing dependencies, config errors)

## Governance

### Supported

- Confidence thresholds (configurable)
- Safety validation (regression checks)
- Stability analysis (flaky pattern detection)
- Audit trail (decision logging)

### Not Supported

- Custom governance rules
- ML-based confidence calibration
- Real-time governance updates
- Multi-project governance policies

## Performance

### Current Limits

- **Test Files**: Up to 500 files per project (tested)
- **Locators**: Up to 2000 locators per project (tested)
- **Corpus Size**: Up to 105 repositories (validated)

### Known Issues

- Large repositories (>1000 test files) may experience slower analysis
- Deeply nested POM hierarchies may not be fully analyzed
- Complex async patterns may require manual intervention
- Memory usage scales with project size

## Selector Detection

### Supported Patterns

- ID selectors: `#username`
- Class selectors: `.btn-primary`
- Attribute selectors: `[data-testid="submit"]`
- Text selectors: `page.getByText('Sign In')`
- Role selectors: `page.getByRole('button')`
- CSS selectors: `button[type="submit"]`
- XPath selectors: `page.locator('xpath=//button')`

### Limitations

- Dynamic locators generated at runtime may not be detected
- Locators inside eval() or dynamic strings may not be detected
- Complex CSS selectors with pseudo-classes may have limited analysis
- Custom locator strategies require adapter updates

## Developer Review

### Supported

- Patch visualization (diff view)
- Governance explanation (decision rationale)
- Replay evidence (execution traces)
- Confidence breakdown (scoring details)
- Rollback review (undo patches)

### Not Supported

- Interactive review UI (web-based)
- Real-time collaboration
- Approval workflows
- Integration with code review tools (GitHub, GitLab)

## Persistence

### Supported

- File-based storage (`.testguardian/` directory)
- JSON report format
- Atomic writes (safe concurrent access)

### Not Supported

- Database storage
- Cloud storage
- Real-time sync
- Multi-user access

## API Stability

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

*Internal APIs are subject to change without notice.*

### Experimental APIs

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

*Experimental APIs are not covered by semver guarantees and may be removed.*

## Roadmap

See [README.md#roadmap](../README.md#roadmap) for planned features and improvements.
