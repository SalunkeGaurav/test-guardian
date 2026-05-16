# TestGuardian Governance Model

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

```typescript
interface GovernanceConfig {
  confidenceThreshold: number;    // Minimum confidence (0-1)
  safetyGateEnabled: boolean;     // Enable safety validation
  stabilityGateEnabled: boolean;  // Enable stability analysis
  auditEnabled: boolean;          // Enable audit trail
}
```

## Governance Results

```typescript
interface GovernanceResult {
  passed: boolean;
  confidence: number;
  safetyPassed: boolean;
  stabilityPassed: boolean;
  auditTrail: AuditTrailEntry[];
}
```

## Gate Results

```typescript
interface GateResult {
  gate: string;
  passed: boolean;
  score: number;
  reason?: string;
}
```

## Decision Flow

```
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
```

## Audit Trail

Each decision generates an audit entry:

```typescript
interface AuditTrailEntry {
  id: string;
  timestamp: number;
  stage: string;
  decision: 'accept' | 'reject';
  reason?: string;
  confidence: number;
}
```
