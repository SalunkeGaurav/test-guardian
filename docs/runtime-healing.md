# TestGuardian Runtime Healing

## Overview

TestGuardian provides runtime healing for test execution failures through a deterministic healing loop.

## Healing Pipeline

```
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
```

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
