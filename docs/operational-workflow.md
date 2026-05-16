# TestGuardian Operational Workflow

## Overview

TestGuardian operates through a series of deterministic stages that analyze, heal, and validate test suites.

## Workflow Stages

### 1. Analysis

```
testguardian analyze <project-path>
```

- Scans project for test files
- Extracts locators, page objects, and navigations
- Identifies fragile patterns and healing opportunities
- Generates analysis report

### 2. Pipeline Execution

```
testguardian pipeline <project-path>
```

- Executes healing pipeline
- Applies healing strategies
- Validates patches
- Generates governance report

### 3. Execution Lab

```
testguardian execution-lab <project-path>
```

- Runs tests against repositories
- Collects execution evidence
- Analyzes failure clusters
- Generates reliability trends

### 4. Stabilization

```
testguardian stabilization --corpus <path>
```

- Audits architecture
- Detects simplification opportunities
- Assesses alpha readiness
- Generates stabilization report

### 5. Alpha Preparation

```
testguardian alpha-prepare
```

- Consolidates all reports
- Validates packaging
- Generates documentation
- Prepares alpha release

## Data Flow

```
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
```

## Persistence

All outputs are stored in `.testguardian/` directory:

- `.testguardian/analysis/` - Analysis reports
- `.testguardian/pipeline/` - Pipeline results
- `.testguardian/execution-lab/` - Execution evidence
- `.testguardian/stabilization/` - Stabilization reports
- `.testguardian/alpha-release/` - Alpha release reports
