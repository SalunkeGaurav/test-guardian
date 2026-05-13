# System Overview

TestGuardian is built as a layered deterministic architecture.

The architecture prioritizes:
- modularity
- replayability
- observability
- framework abstraction
- future extensibility

---

# Core Architecture Layers

```text
CLI
↓
Framework Adapter Layer
↓
Framework Analysis Engine
↓
Execution Trace Engine
↓
DOM Intelligence Layer
↓
Healing Engine
↓
Validation Engine
↓
Patch Generation Engine
↓
Storage Layer (.testguardian)
```

---

# Layer Responsibilities

## CLI Layer
Responsibilities:
- command entry points
- configuration loading
- user interaction
- execution orchestration

Commands:
- tg init
- tg analyze
- tg trace
- tg heal
- tg validate

---

## Framework Adapter Layer
Responsibilities:
- framework-specific integrations
- parsing framework structures
- runtime execution hooks
- snapshot capture
- locator extraction

Supported frameworks later:
- Playwright
- Selenium
- Cypress
- WebdriverIO

Important:
Core logic must never contain framework-specific implementations.

---

## Framework Analysis Engine
Responsibilities:
- project scanning
- framework detection
- test discovery
- page object discovery
- locator indexing
- navigation pattern extraction

Important:
Analysis must initially be deterministic.
No AI dependency.

---

## Execution Trace Engine
Responsibilities:
- capture runtime execution
- collect navigation flow
- preserve execution history
- capture runtime metadata
- collect failure context

Outputs:
- ExecutionTrace
- DomSnapshot
- RuntimeMetadata

---

## DOM Intelligence Layer
Responsibilities:
- DOM normalization
- structural comparison
- semantic extraction
- similarity scoring
- locator relationship mapping

Important:
This layer becomes the foundation of healing.

---

## Healing Engine
Responsibilities:
- propose locator repairs
- rank repair confidence
- compare historical locators
- evaluate DOM similarity
- generate repair candidates

Important:
Healing is proposal-only.
Never directly applies modifications.

---

## Validation Engine
Responsibilities:
- validate repair candidates
- replay navigation flows
- verify repaired selectors
- detect false-positive repairs

---

## Patch Generation Engine
Responsibilities:
- generate framework diffs
- preserve code style
- create reversible patches
- generate repair explanations

---

## Storage Layer
Responsibilities:
- maintain runtime intelligence
- preserve execution history
- cache snapshots
- store framework metadata
- maintain locator history

Storage root:

```text
.testguardian/
```

---

# Runtime Lifecycle

```text
User Runs Test
↓
Execution Traced
↓
Failure Detected
↓
DOM Snapshot Captured
↓
Locator Context Extracted
↓
Repair Candidates Generated
↓
Validation Replay Executed
↓
Patch Proposal Generated
↓
User Approves
↓
Framework Updated
```

---

# Core Architectural Principles

## Principle 1
Deterministic systems first.

## Principle 2
AI enhances.
AI never controls.

## Principle 3
Every operation must be observable.

## Principle 4
Every repair must be replayable.

## Principle 5
Framework-specific logic stays isolated.