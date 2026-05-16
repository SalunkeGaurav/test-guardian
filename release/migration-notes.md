# Migration Notes

Guidance for migrating to TestGuardian 0.1.0-alpha.

## From No Previous Version

This is the first public release. If you have been using TestGuardian internally, follow these steps:

### 1. Update Dependencies

```bash
npm install testguardian@0.1.0-alpha
```

### 2. Update CLI Commands

Old internal commands may have changed. Use the new CLI:

```bash
# New commands
npx testguardian init
npx testguardian analyze ./my-project
npx testguardian pipeline ./my-project
npx testguardian review
```

### 3. Update Report Paths

Reports are now stored in `.testguardian/` subdirectories:

| Old Path | New Path |
|----------|----------|
| `./reports/analysis.json` | `.testguardian/analysis/analysis-report.json` |
| `./reports/pipeline.json` | `.testguardian/pipeline/pipeline-result.json` |
| `./reports/healing.json` | `.testguardian/pipeline/healing-proposals.json` |
| `./reports/review.json` | `.testguardian/developer-review/review-bundle.json` |

### 4. Update API Imports

If you were importing internal modules directly, update to use the public API:

```typescript
// Old (internal)
import { HealingPipeline } from './src/core/pipeline';

// New (public)
import { HealingPipeline } from 'testguardian';
```

### 5. Review Experimental Features

Some features you may have used internally are now marked as experimental:

- Confidence calibration
- Healing benchmark
- Healing intelligence
- Pattern intelligence
- Adversarial testing
- Developer workflow
- CI failure validation
- Architecture cohesion audit
- Risk discrimination

These features are still available but are not covered by semver guarantees.

## Breaking Changes

### API Changes

- `src/index.ts` now exports only stable public APIs
- Internal modules are accessible via `internal` namespace
- Experimental modules are accessible via `experimental` namespace

### CLI Changes

- `testguardian corpus` renamed to `testguardian corpus-scale`
- `testguardian run` now requires `--repo` flag
- All commands now support `--verbose`, `--compact`, and `--json` flags

### Report Format Changes

- All reports now include `generatedAt: 0` for determinism
- Report IDs are now sequential counters instead of timestamps
- Schema version is included in all reports

## Non-Breaking Changes

- Core interfaces remain unchanged
- Domain models remain unchanged
- Healing pipeline behavior unchanged
- Patch generation behavior unchanged
- Confidence governance behavior unchanged

## Deprecations

The following are deprecated and will be removed in a future release:

| Deprecated | Replacement | Notes |
|------------|-------------|-------|
| `testguardian corpus` | `testguardian corpus-scale` | Legacy command |
| Internal module imports | `import { internal } from 'testguardian'` | Use public API |
| Timestamp-based report IDs | Sequential counter IDs | Deterministic output |

## Need Help?

- See [README.md](../README.md) for quick start
- See [SUPPORT.md](../SUPPORT.md) for support options
- Open a [GitHub issue](https://github.com/testguardian/testguardian/issues) for bugs
