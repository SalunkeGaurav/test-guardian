# Execution Lifecycle

## Analyze Flow

```text
tg analyze
↓
Detect Framework
↓
Discover Test Files
↓
Parse AST
↓
Extract Locators
↓
Extract Navigation Patterns
↓
Generate Framework Map
↓
Persist Metadata
```

---

## Trace Flow

```text
tg trace
↓
Hook Runtime Execution
↓
Capture Navigation
↓
Capture DOM Snapshots
↓
Capture Runtime Metadata
↓
Store Execution Trace
```

---

## Healing Flow

```text
Failure Detected
↓
Retrieve Execution Context
↓
Load Snapshot History
↓
Compare Current DOM
↓
Generate Candidate Locators
↓
Rank Candidates
↓
Replay Validation
↓
Generate Patch Proposal
↓
User Approval Required
```

---

# Validation Rules

Repairs must:
- resolve target element
- pass replay validation
- avoid false-positive matches
- preserve framework style
- generate reversible patch

---