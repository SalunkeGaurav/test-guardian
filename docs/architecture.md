# TestGuardian Architecture

## Design Principles

| Principle | Description |
|---|---|
| Deterministic first | Every healing decision is a verifiable pipeline step, not a black-box inference |
| Framework abstraction | All framework code lives in `src/adapters/` behind `FrameworkAdapter` |
| Modularity | Each core module has one responsibility, communicates via typed interfaces |
| Observability | Every decision (why a locator was chosen, why a patch was applied) is recorded |
| No autonomous agents | The system proposes — humans (or deterministic rules) decide |
| Fail closed | If validation can't confirm a fix, the patch is not applied |

## Directory Layout

```
src/
├── index.ts              # Public API — re-exports types only
├── models/               # Domain entities (framework-agnostic, no I/O)
│   ├── framework.ts      # TestFile, TestSuite, FrameworkInfo
│   ├── locator.ts        # Locator, LocatorIndexEntry, LocatorIndex
│   ├── trace.ts          # ExecutionTrace, TraceEvent, TraceSummary
│   ├── snapshot.ts       # DomSnapshot, ElementSnapshot, DomDiff
│   ├── navigation.ts     # NavigationStep, NavigationSession
│   ├── healing.ts        # HealingProposal, HealingStrategy, HealingHistory
│   ├── patch.ts          # Patch, PatchFile, PatchStatus
│   └── result.ts         # Result<T, E> — no throwing
├── interfaces/           # Strict cross-module contracts
│   ├── framework.ts      # FrameworkAdapter + AdapterHooks
│   ├── locator.ts        # LocatorIndexProvider
│   ├── execution.ts      # TraceProvider
│   ├── storage.ts        # StorageProvider (unified I/O)
│   ├── healing.ts        # HealingStrategyProvider
│   ├── patch.ts          # PatchProvider
│   ├── dom.ts            # DomAnalyzer
│   └── replay.ts         # ReplayEngine
├── core/                 # Framework-agnostic business logic
│   ├── analyzer/         # Framework detection & test discovery
│   ├── tracer/           # Execution trace capture
│   ├── locator-index/    # Locator catalog & history
│   ├── dom/              # DOM parsing, diffing, locator extraction
│   │   ├── parser.ts     # HTML → ElementNode tree
│   │   ├── comparator.ts # ElementNode diff → DomDiff
│   │   ├── extractor.ts  # ElementNode → locator strategies
│   │   └── snapshot.ts   # ElementSnapshot utilities
│   ├── replay/           # Navigation replay & trace comparison
│   │   ├── recorder.ts   # ExecutionTrace → NavigationSession
│   │   ├── navigator.ts  # NavigationSession → new ExecutionTrace
│   │   └── step.ts       # Single NavigationStep executor
│   ├── healing/          # Healing proposal generation
│   ├── validator/        # Proposal verification (pre-apply)
│   ├── patcher/          # Source diff generation & lifecycle
│   └── storage/          # FileStorage + MemoryStorage
└── adapters/             # Framework-specific integrations
    ├── playwright/       # Implements FrameworkAdapter
    ├── selenium/         # Implements FrameworkAdapter
    └── cypress/          # Implements FrameworkAdapter
```

## Execution Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    CLI Command Flow                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  testguardian init                                          │
│    └─ Creates .testguardian/ with empty index.json          │
│                                                             │
│  testguardian analyze                                       │
│    └─ Analyzer.detect() → picks adapter                     │
│    └─ Analyzer.discoverTests() → TestSuite                  │
│    └─ Analyzer.extractLocators() → Locator[]                │
│    └─ LocatorIndexService.register() → persists             │
│                                                             │
│  testguardian trace [files]                                 │
│    └─ Tracer.trace() → wraps adapter.runTest()              │
│    └─ Captures TraceEvent[] during execution                │
│    └─ On failure → adapter.captureSnapshot()                │
│    └─ Persists ExecutionTrace + DomSnapshot                 │
│    └─ Updates LocatorIndex (success/failure counts)         │
│                                                             │
│  testguardian heal                                          │
│    └─ Reads failing traces from storage                     │
│    └─ HealingEngine.heal():                                 │
│        1. Find failed locators in trace                     │
│        2. Look up locator history in index                  │
│        3. Run strategies in priority order                  │
│        4. Generate ranked HealingProposal[]                 │
│    └─ Validator.validate():                                 │
│        1. Check each proposal against DOM snapshot          │
│        2. Optionally replay via ReplayEngine                │
│        3. Return StrategyVerdict[]                         │
│    └─ Records HealingHistoryEntry                           │
│                                                             │
│  testguardian validate                                      │
│    └─ Re-validate existing proposals                        │
│    └─ Can trigger live replay for active verification       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Module Dependency Graph

```
                    ┌─────────────┐
                    │   Adapter   │
                    │ (external)  │
                    └──────┬──────┘
                           │ implements
                           ▼
              ┌──────────────────────┐
              │  FrameworkAdapter    │
              │  (src/interfaces/)   │
              └──────────┬───────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
   ┌──────────┐  ┌──────────┐  ┌──────────────┐
   │ Analyzer │  │  Tracer  │  │ ReplayEngine │
   └────┬─────┘  └────┬─────┘  └──────┬───────┘
        │              │               │
        ▼              ▼               │
   ┌──────────┐  ┌──────────┐          │
   │ Locator  │  │ Storage  │◄─────────┘
   │ Index    │  │ Provider │
   └────┬─────┘  └────┬─────┘
        │              │
        └──────┬───────┘
               ▼
        ┌──────────────┐
        │     DOM      │
        │  (pure func) │
        └──────┬───────┘
               ▼
        ┌──────────────┐
        │   Healing    │
        │   Engine     │
        └──────┬───────┘
               ▼
        ┌──────────────┐
        │  Validator   │
        └──────┬───────┘
               ▼
        ┌──────────────┐
        │   Patcher    │
        └──────────────┘
```

## Module Boundaries

| Module | Owns | Does NOT own |
|---|---|---|
| Analyzer | Framework detection, test discovery | Locator extraction details (delegates to adapter) |
| Tracer | Execution instrumentation, trace capture | Running tests (delegates to adapter) |
| LocatorIndex | Locator dedup, history tracking | Locator extraction (delegates to adapter) |
| DOM | HTML parsing, diffing, strategy inference | Browser automation (delegates to adapter) |
| Replay | Trace→session conversion, step execution | Test framework interaction (delegates to adapter) |
| Healing | Strategy orchestration, proposal ranking | Strategy implementation (injected via interface) |
| Validator | Proposal verification, confidence scoring | Patch generation |
| Patcher | Diff generation, file modification, rollback | Healing logic |
| Storage | Persistence, serialization, I/O | Business logic |

## Data Flow

```
Test Run
   │
   ▼
ExecutionTrace ───────────────────► Storage
   │                                   │
   ▼                                   ▼
Trace Analysis                    LocatorIndex
   │                                   │
   ├──► Find failed locators           │
   │                                   │
   └──► Look up locator history ◄──────┘
              │
              ▼
      Healing Strategies
       (priority order)
              │
              ▼
      HealingProposal[]
              │
              ▼
      ┌──────────────┐
      │  Validator   │◄── DomSnapshot
      └──────┬───────┘
         yes/   \no
             ▼
       ┌──────────┐
       │  Patch   │
       └──────────┘
```

## Framework Adapter Communication

```
┌──────────────────────────────────────────────────────┐
│                    Core Engine                        │
│                                                      │
│  analyzer.detect(root) ──────► adapter.detect()      │
│  analyzer.discover(root) ────► adapter.discoverTests()│
│  analyzer.extract(file) ─────► adapter.extractLocators│
│  tracer.trace(file) ─────────► adapter.runTest()      │
│  replay.executeStep(step) ───► adapter.executeStep() │
│  replay.captureSnapshot() ───► adapter.captureSnapshot│
│                                                      │
│  Every method returns Result<T, E>                   │
│  No exceptions cross the boundary                    │
└──────────────────────────────────────────────────────┘
```

## Healing Pipeline (Deterministic)

```
1. Failure detected in ExecutionTrace
2. Locator looked up in LocatorIndex (history + metadata)
3. Strategies evaluated in priority order:
   a. Attribute fallback (id → testid → aria-label → ...)
   b. Text-based (exact → partial → contains)
   c. Structural (tag + nth-child, role)
   d. Proximity (nearby stable element → relative)
4. Each strategy returns HealingProposal[] with confidence
5. Proposals ranked by confidence
6. Validator checks top proposal against DOM snapshot
7. If validated → Patch generated
8. If not validated → next proposal tried
9. All results recorded in HealingHistoryEntry
```

## Validation Pipeline

```
HealingProposal
       │
       ▼
  ┌──────────┐
  │  Static  │◄── Check against stored DomSnapshot
  │  Verify  │
  └────┬─────┘
       │ match?
       ▼
  ┌──────────┐
  │  Live    │◄── Replay via ReplayEngine (optional)
  │  Verify  │
  └────┬─────┘
       │ match?
       ▼
  StrategyVerdict
  - resolved: boolean
  - matchCount: number
  - postValidationConfidence: number
```
