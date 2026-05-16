# TestGuardian Repository Support

## Supported Frameworks

### Playwright (Primary)

- TypeScript/JavaScript test files
- `.spec.ts`, `.test.ts` patterns
- `playwright.config.ts`, `playwright.config.js`
- POM (Page Object Model) patterns
- API testing patterns

### Cypress (Adapter)

- `.spec.js`, `.spec.ts` patterns
- `cypress.config.js`, `cypress.config.ts`

### Selenium (Adapter)

- Java test files
- `pom.xml` projects

## Repository Categories

Based on corpus analysis of 105 repositories:

| Category | Repos | Compatibility | Notes |
|----------|-------|---------------|-------|
| Enterprise And Clean | 8 | 99.7% | Well-structured, minimal issues |
| JS And Brittle POM | 12 | 100% | JavaScript POM patterns |
| JS Legacy Brittle | 10 | 100% | Legacy JavaScript tests |
| Cucumber Hybrids | 6 | 100% | Cucumber + Playwright |
| Beginner And Chaotic | 15 | 100% | Beginner projects, varied quality |
| Enterprise Giant POMs | 4 | 100% | Large enterprise POMs |
| Wrapper Heavy Abstractions | 3 | 100% | Heavy abstraction layers |
| Chaotic Beginner Codegen | 25 | 98.8% | Codegen projects, some issues |
| Monorepos Lite | 3 | 99.9% | Monorepo structures |
| Iframe Modal Flaky | 2 | 100% | Iframe/modal handling |

## Compatibility Metrics

- **Parser Survivability**: 100% average
- **Compile Stability**: 99.86% average
- **Healing Recovery Rate**: 100% average
- **Governance Rejection Rate**: 0% average
- **Replay Instability**: 0% average

## Unsupported Patterns

- Non-Playwright test frameworks without adapters
- Binary test files
- Encrypted test files
- Test files with syntax errors that prevent parsing

## Repository Validation

Each repository is validated for:

1. Framework detection
2. Configuration file presence
3. Test file discovery
4. Parser compatibility
5. Compile stability
6. Governance compliance
