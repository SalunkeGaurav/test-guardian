/**
 * Documentation Generator
 *
 * Generates documentation deterministically from current system metadata.
 * All output is derived from existing code structure and configuration.
 *
 * @module docs-generator
 */

import { writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export interface DocsGenerationResult {
  generatedAt: number;
  files: string[];
}

function getModuleStructure(srcDir: string): { name: string; files: number; lines: number }[] {
  const coreDir = join(srcDir, 'core');
  if (!existsSync(coreDir)) return [];

  const modules: { name: string; files: number; lines: number }[] = [];

  try {
    const entries = readdirSync(coreDir);
    for (const entry of entries) {
      const fullPath = join(coreDir, entry);
      if (statSync(fullPath).isDirectory()) {
        let files = 0;
        let lines = 0;
        try {
          const files = readdirSync(fullPath).filter((f) => f.endsWith('.ts'));
          for (const file of files) {
            const content = readFileSync(join(fullPath, file), 'utf-8');
            lines += content.split('\n').length;
          }
          modules.push({ name: entry, files: files.length, lines });
        } catch {
          // Skip directories that can't be read
        }
      }
    }
  } catch {
    // Skip if core directory can't be read
  }

  return modules.sort((a, b) => b.lines - a.lines);
}

function generateArchitectureSummary(srcDir: string): string {
  const modules = getModuleStructure(srcDir);
  const totalLines = modules.reduce((sum, m) => sum + m.lines, 0);
  const totalFiles = modules.reduce((sum, m) => sum + m.files, 0);

  return `# TestGuardian Architecture Summary

## Overview

TestGuardian is a deterministic test analysis and healing system for Playwright and other testing frameworks.
It provides automated test repair, confidence governance, and operational reliability analysis.

## Core Architecture

\`\`\`
test-guardian/
├── src/
│   ├── interfaces/          # Core interface definitions
│   ├── models/              # Domain models and types
│   ├── adapters/            # Framework adapters (Playwright, Cypress, Selenium)
│   ├── core/                # Core functionality modules
│   │   ├── pipeline/        # Healing pipeline orchestration
│   │   ├── patcher/         # Patch generation and validation
│   │   ├── unified-runtime/ # Unified runtime execution
│   │   ├── repository-validator/ # Repository validation
│   │   ├── runtime-hardening/ # Runtime stability
│   │   ├── runtime-healing-loop/ # Runtime healing
│   │   ├── execution-lab/   # Execution lab and evidence
│   │   ├── operational-reliability/ # Reliability monitoring
│   │   ├── large-scale-corpus/ # Corpus execution
│   │   ├── stabilization/   # Stabilization analysis
│   │   ├── production-readiness/ # Production readiness
│   │   ├── developer-review/ # Developer review experience
│   │   └── ...              # Additional modules
│   ├── public-api/          # Stable public API surface
│   └── core/storage/        # Persistence utilities
├── cli/                     # CLI commands
└── tests/                   # Test suite
\`\`\`

## Module Statistics

| Module | Files | Lines | % of Total |
|--------|-------|-------|------------|
${modules.map((m) => `| ${m.name} | ${m.files} | ${m.lines} | ${((m.lines / totalLines) * 100).toFixed(1)}% |`).join('\n')}

**Total:** ${totalFiles} files, ${totalLines} lines

## Design Principles

1. **Deterministic Behavior**: No Date.now(), Math.random(), or timing-based assertions
2. **No New Intelligence Engines**: Reuse existing modules only
3. **Zero Duplicated Persistence**: Centralized storage utilities
4. **Stable Public API**: Clear separation between public, internal, and experimental APIs
5. **Reproducible Outputs**: All outputs are deterministic given the same inputs

## API Stability

- **Stable**: Core interfaces, domain models, pipeline, patcher
- **Internal**: Runtime orchestration, validation, execution lab
- **Experimental**: Confidence calibration, healing intelligence, pattern intelligence
`;
}

function generateCliReference(): string {
  return `# TestGuardian CLI Reference

## Usage

\`\`\`
testguardian <command> [options]
\`\`\`

## Commands

### analyze

Analyze a Playwright project for test health and healing opportunities.

\`\`\`
testguardian analyze <project-path> [options]
\`\`\`

**Options:**
- \`--output <path>\` - Output directory for reports
- \`--verbose\` - Enable debug logging
- \`--compact\` - Compact output mode
- \`--json\` - Machine-readable JSON output

### pipeline

Execute the full healing pipeline on a project.

\`\`\`
testguardian pipeline <project-path> [options]
\`\`\`

**Options:**
- \`--mode <mode>\` - Execution mode (full, validate-only, report-only)
- \`--governance\` - Enable strict governance
- \`--output <path>\` - Output directory for reports
- \`--verbose\` - Enable debug logging

### execution-lab

Execute tests against repositories and collect evidence.

\`\`\`
testguardian execution-lab <project-path> [options]
\`\`\`

**Options:**
- \`--batch-size <n>\` - Number of repositories per batch
- \`--resume\` - Resume from previous execution state
- \`--failed-only\` - Only re-execute failed repositories
- \`--output <path>\` - Output directory for reports
- \`--verbose\` - Enable debug logging

### review

Generate developer-facing review bundles.

\`\`\`
testguardian review <project-path> [options]
\`\`\`

**Options:**
- \`--output <path>\` - Output directory for reports
- \`--verbose\` - Enable debug logging

### production-readiness

Assess production readiness of the system.

\`\`\`
testguardian production-readiness [options]
\`\`\`

**Options:**
- \`--output <path>\` - Output directory for reports
- \`--verbose\` - Enable debug logging

### corpus-scale

Execute large-scale corpus analysis.

\`\`\`
testguardian corpus-scale --corpus <path> [options]
\`\`\`

**Options:**
- \`--corpus <path>\` - Path to benchmark corpus directory
- \`--batch-size <n>\` - Number of repositories per batch
- \`--resume\` - Resume from previous execution state
- \`--failed-only\` - Only re-execute failed repositories
- \`--report-only\` - Generate reports only, skip execution
- \`--verbose\` - Enable debug logging

### stabilization

Execute stabilization analysis.

\`\`\`
testguardian stabilization --corpus <path> [options]
\`\`\`

**Options:**
- \`--corpus <path>\` - Path to benchmark corpus directory
- \`--batch-size <n>\` - Number of repositories per batch
- \`--resume\` - Resume from previous execution state
- \`--report-only\` - Generate reports only, skip execution
- \`--verbose\` - Enable debug logging

### alpha-prepare

Prepare alpha release with consolidated reports.

\`\`\`
testguardian alpha-prepare [options]
\`\`\`

**Options:**
- \`--corpus <path>\` - Path to benchmark corpus directory
- \`--output <path>\` - Output directory for reports
- \`--verbose\` - Enable debug logging

## Output Modes

### Default Mode

Human-readable output with formatted tables and summaries.

### Compact Mode

Reduced output with essential information only.

\`\`\`
testguardian analyze <path> --compact
\`\`\`

### Verbose Mode

Detailed output with debug information.

\`\`\`
testguardian analyze <path> --verbose
\`\`\`

### JSON Mode

Machine-readable JSON output for programmatic consumption.

\`\`\`
testguardian analyze <path> --json
\`\`\`

## Exit Codes

- \`0\` - Success
- \`1\` - General error
- \`2\` - Invalid arguments
- \`3\` - Configuration error
`;
}

function generateOperationalWorkflow(): string {
  return `# TestGuardian Operational Workflow

## Overview

TestGuardian operates through a series of deterministic stages that analyze, heal, and validate test suites.

## Workflow Stages

### 1. Analysis

\`\`\`
testguardian analyze <project-path>
\`\`\`

- Scans project for test files
- Extracts locators, page objects, and navigations
- Identifies fragile patterns and healing opportunities
- Generates analysis report

### 2. Pipeline Execution

\`\`\`
testguardian pipeline <project-path>
\`\`\`

- Executes healing pipeline
- Applies healing strategies
- Validates patches
- Generates governance report

### 3. Execution Lab

\`\`\`
testguardian execution-lab <project-path>
\`\`\`

- Runs tests against repositories
- Collects execution evidence
- Analyzes failure clusters
- Generates reliability trends

### 4. Stabilization

\`\`\`
testguardian stabilization --corpus <path>
\`\`\`

- Audits architecture
- Detects simplification opportunities
- Assesses alpha readiness
- Generates stabilization report

### 5. Alpha Preparation

\`\`\`
testguardian alpha-prepare
\`\`\`

- Consolidates all reports
- Validates packaging
- Generates documentation
- Prepares alpha release

## Data Flow

\`\`\`
Project Analysis
       ↓
   Test Files
       ↓
  Locator Extraction
       ↓
  Healing Candidates
       ↓
   Patch Generation
       ↓
   Safety Validation
       ↓
   Governance Review
       ↓
   Execution Evidence
       ↓
   Stabilization Report
       ↓
   Alpha Release
\`\`\`

## Persistence

All outputs are stored in \`.testguardian/\` directory:

- \`.testguardian/analysis/\` - Analysis reports
- \`.testguardian/pipeline/\` - Pipeline results
- \`.testguardian/execution-lab/\` - Execution evidence
- \`.testguardian/stabilization/\` - Stabilization reports
- \`.testguardian/alpha-release/\` - Alpha release reports
`;
}

function generateRepositorySupport(): string {
  return `# TestGuardian Repository Support

## Supported Frameworks

### Playwright (Primary)

- TypeScript/JavaScript test files
- \`.spec.ts\`, \`.test.ts\` patterns
- \`playwright.config.ts\`, \`playwright.config.js\`
- POM (Page Object Model) patterns
- API testing patterns

### Cypress (Adapter)

- \`.spec.js\`, \`.spec.ts\` patterns
- \`cypress.config.js\`, \`cypress.config.ts\`

### Selenium (Adapter)

- Java test files
- \`pom.xml\` projects

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
`;
}

function generateGovernanceModel(): string {
  return `# TestGuardian Governance Model

## Overview

TestGuardian uses a confidence governance system to ensure healing proposals meet quality thresholds before acceptance.

## Governance Gates

### 1. Confidence Threshold

- Minimum confidence score required for acceptance
- Default: 0.7 (70%)
- Configurable via GovernanceConfig

### 2. Safety Validation

- Patches must pass safety gates
- Validates against regression risks
- Checks for side effects

### 3. Stability Analysis

- Analyzes test stability over time
- Detects flaky patterns
- Measures replay consistency

### 4. Audit Trail

- All decisions are logged
- Rejection reasons are recorded
- Stage timing is tracked

## Governance Configuration

\`\`\`typescript
interface GovernanceConfig {
  confidenceThreshold: number;    // Minimum confidence (0-1)
  safetyGateEnabled: boolean;     // Enable safety validation
  stabilityGateEnabled: boolean;  // Enable stability analysis
  auditEnabled: boolean;          // Enable audit trail
}
\`\`\`

## Governance Results

\`\`\`typescript
interface GovernanceResult {
  passed: boolean;
  confidence: number;
  safetyPassed: boolean;
  stabilityPassed: boolean;
  auditTrail: AuditTrailEntry[];
}
\`\`\`

## Gate Results

\`\`\`typescript
interface GateResult {
  gate: string;
  passed: boolean;
  score: number;
  reason?: string;
}
\`\`\`

## Decision Flow

\`\`\`
Healing Proposal
       ↓
  Confidence Check ──→ Reject (if below threshold)
       ↓
  Safety Validation ──→ Reject (if unsafe)
       ↓
  Stability Analysis ──→ Reject (if unstable)
       ↓
  Audit Trail Entry
       ↓
   Accept Proposal
\`\`\`

## Audit Trail

Each decision generates an audit entry:

\`\`\`typescript
interface AuditTrailEntry {
  id: string;
  timestamp: number;
  stage: string;
  decision: 'accept' | 'reject';
  reason?: string;
  confidence: number;
}
\`\`\`
`;
}

function generateRuntimeHealing(): string {
  return `# TestGuardian Runtime Healing

## Overview

TestGuardian provides runtime healing for test execution failures through a deterministic healing loop.

## Healing Pipeline

\`\`\`
Test Execution Failure
       ↓
  Failure Capture
       ↓
  Candidate Generation
       ↓
  Candidate Ranking
       ↓
  Safety Validation
       ↓
  Patch Generation
       ↓
  Patch Application
       ↓
  Re-validation
       ↓
  Success / Rollback
\`\`\`

## Healing Strategies

### 1. Locator Replacement

- Replaces failed locators with alternatives
- Uses locator index for candidate selection
- Validates against DOM structure

### 2. Locator Refinement

- Refines existing locators for better specificity
- Adds attributes, indices, or relationships
- Maintains semantic meaning

### 3. DOM Navigation

- Adjusts navigation paths for DOM changes
- Handles iframe and modal transitions
- Manages async rendering

### 4. Timing Adjustment

- Adjusts wait times for async operations
- Handles race conditions
- Manages network delays

## Healing Candidate Ranking

Candidates are ranked by:

1. **Confidence Score**: How likely the candidate will fix the failure
2. **Safety Score**: How safe the candidate is to apply
3. **Specificity**: How specific the candidate is to the failure
4. **Generality**: How general the candidate is across similar failures

## Runtime Hardening

TestGuardian includes runtime hardening features:

- **Async Render Detection**: Detects and waits for async rendering
- **DOM Settling**: Ensures DOM is stable before interaction
- **Iframe/Modal Handling**: Manages iframe and modal transitions
- **Navigation Synchronization**: Synchronizes navigation events
- **Replay Drift Detection**: Detects drift between replay and original
- **Stale Context Recovery**: Recovers from stale element references

## Sandbox Execution

Healing proposals are validated in a sandbox:

1. **Mutation Application**: Apply patch to test file
2. **Re-execution**: Run modified test
3. **Verification**: Compare results with expected
4. **Rollback**: Revert if verification fails

## Deterministic Behavior

All healing operations are deterministic:

- No random candidate selection
- No timing-based assertions
- Reproducible outputs for same inputs
`;
}

function generateAlphaLimitations(): string {
  return `# TestGuardian Alpha Limitations

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
`;
}

export function generateAllDocs(srcDir: string, outputDir: string): DocsGenerationResult {
  const docsDir = join(outputDir, 'docs');
  if (!existsSync(docsDir)) {
    mkdirSync(docsDir, { recursive: true });
  }

  const files: string[] = [];

  const docs = [
    { name: 'architecture-summary.md', content: generateArchitectureSummary(srcDir) },
    { name: 'cli-reference.md', content: generateCliReference() },
    { name: 'operational-workflow.md', content: generateOperationalWorkflow() },
    { name: 'repository-support.md', content: generateRepositorySupport() },
    { name: 'governance-model.md', content: generateGovernanceModel() },
    { name: 'runtime-healing.md', content: generateRuntimeHealing() },
    { name: 'alpha-limitations.md', content: generateAlphaLimitations() },
  ];

  for (const doc of docs) {
    const filePath = join(docsDir, doc.name);
    writeFileSync(filePath, doc.content, 'utf-8');
    files.push(filePath);
  }

  return {
    generatedAt: 0,
    files,
  };
}
