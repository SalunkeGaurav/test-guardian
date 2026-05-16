# TestGuardian Architecture Summary

## Overview

TestGuardian is a deterministic test analysis and healing system for Playwright and other testing frameworks.
It provides automated test repair, confidence governance, and operational reliability analysis.

## Core Architecture

```
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
```

## Module Statistics

| Module | Files | Lines | % of Total |
|--------|-------|-------|------------|


**Total:** 0 files, 0 lines

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
