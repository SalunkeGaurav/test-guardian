# `.testguardian/` — Execution Intelligence Store

Auto-managed by TestGuardian. Do not edit manually.

## Schema

```
.testguardian/
├── index.json              # Project metadata, stats, timestamps
├── traces/
│   └── {id}.json           # ExecutionTrace (one file per trace)
├── locators.json           # LocatorIndexEntry[] (flat serialized array)
├── snapshots/
│   ├── {id}.html           # Raw DOM HTML at capture time
│   └── {id}.meta.json      # DomSnapshot metadata (URL, viewport, element tree)
├── patches/
│   └── {id}.json           # Patch record (one file per patch)
├── history.json            # HealingHistoryEntry[] (append-only log)
└── README.md
```

## index.json Schema

```json
{
  "version": "0.1.0",
  "framework": { "name": "playwright", "version": "1.45.0" },
  "createdAt": 1715000000000,
  "analyzedAt": null,
  "lastTraceAt": null,
  "stats": {
    "totalTraces": 0,
    "totalLocators": 0,
    "totalPatches": 0,
    "healedLocators": 0
  }
}
```

## Lifecycle

1. `testguardian init`      — Creates this directory with empty index
2. `testguardian analyze`   — Discovers tests, populates locators.json
3. `testguardian trace`     — Runs tests, saves traces + snapshots
4. `testguardian heal`      — Reads traces, runs strategies, records history
5. `testguardian validate`  — Verifies proposals, updates patch statuses
