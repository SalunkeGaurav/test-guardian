# Experimental Features

Features in TestGuardian 0.1.0-alpha that are experimental and may change or be removed.

## What Does "Experimental" Mean?

Experimental features:
- Are functional and tested
- May have incomplete functionality
- May change without notice
- Are **not** covered by semver guarantees
- May be removed in future releases
- Should not be used in production workflows

## Experimental Modules

| Module | Description | Status |
|--------|-------------|--------|
| **Confidence Calibration** | Confidence score calibration and validation | Experimental |
| **Healing Benchmark** | Healing strategy benchmarking | Experimental |
| **Healing Intelligence** | Pattern-based healing intelligence | Experimental |
| **Pattern Intelligence** | Test pattern analysis and intelligence | Experimental |
| **Adversarial Testing** | Adversarial test generation and execution | Experimental |
| **Developer Workflow** | Developer workflow orchestration | Experimental |
| **CI Failure Validation** | CI failure classification and validation | Experimental |
| **Architecture Cohesion Audit** | Architecture cohesion and dependency analysis | Experimental |
| **Risk Discrimination** | Risk-based mutation and discrimination | Experimental |

## Experimental CLI Commands

| Command | Description | Notes |
|---------|-------------|-------|
| `testguardian stress-test` | Run adversarial stress tests | Requires fixtures |
| `testguardian pattern-intel` | Extract pattern intelligence | Analysis only |
| `testguardian healing-benchmark` | Run healing benchmark | Requires fixtures |
| `testguardian healing-intel` | Analyze healing failures | Requires benchmark data |
| `testguardian corpus` | Run corpus benchmarking | Legacy command |
| `testguardian calibrate` | Run confidence calibration | Analysis only |
| `testguardian workflow` | Simulate developer workflows | Simulation only |
| `testguardian risk-discrimination` | Run risk discrimination | Analysis only |
| `testguardian ci-failure-validation` | Run CI failure replay | Requires failure corpus |
| `testguardian cohesion-audit` | Run architecture audit | Analysis only |

## Experimental API Exports

All experimental modules are accessible via the `experimental` namespace:

```typescript
import { experimental } from 'testguardian';

// Experimental features
const confidenceCalibration = await experimental.ConfidenceCalibration();
const healingBenchmark = await experimental.HealingBenchmark();
const healingIntelligence = await experimental.HealingIntelligence();
const patternIntelligence = await experimental.PatternIntelligence();
const adversarialTester = await experimental.AdversarialTester();
const corpusExecution = await experimental.CorpusExecution();
const developerWorkflow = await experimental.DeveloperWorkflow();
const ciFailureValidation = await experimental.CIFailureValidation();
const architectureCohesionAudit = await experimental.ArchitectureCohesionAudit();
const riskDiscrimination = await experimental.RiskDiscrimination();
```

## Known Issues with Experimental Features

| Feature | Issue | Workaround |
|---------|-------|------------|
| Confidence Calibration | May produce inconsistent scores | Use stable confidence governance |
| Healing Benchmark | Requires specific fixture format | Use standard fixtures |
| Healing Intelligence | Limited pattern recognition | Manual review recommended |
| Pattern Intelligence | High memory usage for large projects | Limit project size |
| Adversarial Testing | May produce false positives | Review results manually |
| Developer Workflow | Simulation only, no real execution | Use for planning only |
| CI Failure Validation | Requires pre-classified failures | Classify failures first |
| Architecture Cohesion Audit | May miss complex dependencies | Manual audit recommended |
| Risk Discrimination | Complex output format | Use review bundles |

## Path to Stability

Experimental features may become stable in future releases if they:
1. Demonstrate consistent, reliable behavior
2. Receive positive community feedback
3. Have comprehensive test coverage
4. Are validated against real-world usage
5. Have stable, well-documented APIs

## Feedback

We welcome feedback on experimental features:
- Open a [GitHub issue](https://github.com/testguardian/testguardian/issues)
- Start a [discussion](https://github.com/testguardian/testguardian/discussions)
- Email [support@testguardian.dev](mailto:support@testguardian.dev)
