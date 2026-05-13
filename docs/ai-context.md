# AI Context Management

_This document describes how AI-assisted reasoning can integrate with TestGuardian's deterministic pipeline._

## Current Status

AI context is **not active** by default. All healing is purely deterministic — strategies are evaluated in priority order, proposals are validated against DOM snapshots, and no patch is applied without passing validation.

## Anti-Chaos Rules

AI-assisted features must never compromise the deterministic foundation. These rules are enforced by design:

### Rule 1: AI Proposes, Never Applies

```
AI ──► Proposal ──► Validator ──► Patch (deterministic gate)
  ↑                     ↑
  can suggest          must pass
```

- AI may generate additional healing proposals alongside deterministic strategies
- AI proposals go through the **same Validator** as deterministic proposals
- AI can **never** bypass the Validator or write patches directly
- AI can **never** modify the Validator, the Patcher, or the Storage modules

### Rule 2: Deterministic Always Wins

- If any deterministic strategy produces a validated proposal, it is preferred over all AI proposals
- AI proposals are ranked below deterministic ones in the final proposal list
- An AI proposal is only applied if: (a) no deterministic strategy produced a valid proposal, AND (b) it passes the Validator

### Rule 3: Full Observability

- Every AI decision is logged with:
  - Model name and version
  - Input prompt (truncated to fit context window limits)
  - Raw model response
  - Confidence score
  - Validation result
- All AI logs are stored in `.testguardian/ai-log/` (separate from deterministic data)
- Users can audit, override, or reject any AI-suggested patch

### Rule 4: No Autonomous Agents

- AI never runs tests
- AI never accesses the filesystem directly
- AI never executes commands
- AI never modifies configuration
- AI only receives: the failing locator, the DOM snapshot, the locator index history
- AI never receives: credentials, tokens, environment variables, or source code outside the test file

### Rule 5: Gated Behind Config Flag

```json
{
  "ai": {
    "enabled": false,
    "provider": null,
    "model": null
  }
}
```

- AI features are opt-in only
- Default configuration has AI disabled
- Projects can enable AI by setting `ai.enabled: true` in `.testguardian/index.json`

## Future Integration Points

When enabled, AI can contribute to:

1. **Alternative candidate generation** — Suggest locator strategies not covered by deterministic rules
2. **Confidence boosting** — Raise or lower confidence of deterministic proposals based on learned patterns
3. **Explanation** — Provide natural-language descriptions of why a locator likely failed
4. **Pattern recognition** — Identify recurring failure patterns across multiple traces

## Context Window

AI context is scoped to:

- The failing `Locator` record (strategy, value, history)
- The failing `ExecutionTrace` event (type, error message)
- The `DomSnapshot` captured at failure time (element tree, not raw HTML)
- The `LocatorIndexEntry` history (success/failure counts)
- The last 5 successful `Patch` records for similar locator types

### What AI NEVER receives

- Full source code of the project
- Environment variables or secrets
- Network access or API credentials
- File system paths outside the test being analyzed
- User identity or repository metadata
