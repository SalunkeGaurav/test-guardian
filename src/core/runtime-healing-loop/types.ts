/**
 * RuntimeHealingLoop types.
 *
 * Captures the contract for the end-to-end runtime healing execution loop:
 *   failure capture → candidate generation → validation → sandbox → review.
 *
 * No AI. No autonomous modification. Deterministic flow.
 */

import type { Result } from '../../models/result.js';
import type { Locator } from '../../models/locator.js';
import type { ElementNode } from '../../models/snapshot.js';
import type { ReplaySession } from '../../models/replay.js';
import type { HealingCandidate } from '../../models/healing-candidate.js';
import type { ValidationResult } from '../../models/validation.js';
import type { RuntimeValidationResult, ReplayDivergence } from '../../models/runtime.js';
import type { PatchProposal, PatchDiff, RollbackMetadata } from '../../models/patch.js';
import type { HealingExplanation, ConfidenceBreakdown } from '../../models/healing-explanation.js';
import type { GovernanceResult, GateResult } from '../pipeline/confidence-governance.js';
import type { MutationReport, CompileResult, ReplayResult as SandboxReplayResult, RuntimeResult as SandboxRuntimeResult } from '../../models/sandbox.js';

// ─── Step 1: Failure Capture ───────────────────────────────────────

export interface FailureContext {
  locator: Locator;
  failedLocatorExpression: string;
  stackTrace: string;
  failingFile: string;
  failingLine: number;
  domSnapshot: ElementNode[];
  replaySessionRef: string;
  replaySession?: ReplaySession;
  errorMessage: string;
  capturedAt: number;
}

// ─── Step 2-3: Candidate Execution & Rejection ─────────────────────

export interface CandidateExecutionResult {
  candidate: HealingCandidate;
  validation: ValidationResult;
  runtimeValidation?: RuntimeValidationResult;
  governanceResult?: GateResult[];
  rejected: boolean;
  rejectionReasons: string[];
}

export interface RejectionCriteria {
  failsGovernance: boolean;
  hasReplayDivergence: boolean;
  causesStructuralInstability: boolean;
  reducesUniquenessConfidence: boolean;
  affectsUnrelatedSelectors: boolean;
}

// ─── Step 4-5: Patch & Sandbox ─────────────────────────────────────

export interface SandboxPatchResult {
  sandboxId: string;
  patchProposal: PatchProposal;
  compileResult: CompileResult;
  replayResult: SandboxReplayResult;
  runtimeResult: SandboxRuntimeResult;
  mutationReport: MutationReport;
  isolationVerified: boolean;
}

// ─── Step 7: Review Package ────────────────────────────────────────

export interface RuntimeHealingReviewPackage {
  reviewId: string;
  failureContext: FailureContext;
  originalLocator: string;
  healedLocator: string;
  confidenceBreakdown: ConfidenceBreakdown;
  replayEvidence: {
    validationResults: ValidationResult[];
    runtimeValidation?: RuntimeValidationResult;
    sandboxReplay: SandboxReplayResult;
    replayDivergences: ReplayDivergence[];
  };
  sandboxVerification: {
    compileSuccess: boolean;
    replaySuccess: boolean;
    noNavigationDivergence: boolean;
    noNewFailures: boolean;
    isolationVerified: boolean;
    sandboxId: string;
  };
  governanceReasoning: {
    governanceResult: GovernanceResult;
    gateResults: GateResult[];
  };
  explainabilitySummary: HealingExplanation;
  patchDiff: PatchDiff;
  rollbackMetadata: RollbackMetadata;
  status: 'ready-for-review' | 'rejected' | 'sandbox-failed';
  createdAt: number;
}

// ─── Step 8: Metrics ───────────────────────────────────────────────

export interface RuntimeHealingMetrics {
  totalHealingAttempts: number;
  successfulHealings: number;
  sandboxReplaySuccesses: number;
  falseRecoveries: number;
  replayDivergences: number;
  rollbackReliability: number;
  patchSurvivability: number;
}

export interface RuntimeHealingLoopResult {
  reviewPackage: RuntimeHealingReviewPackage;
  metrics: RuntimeHealingMetrics;
  persistedPaths: string[];
}

// ─── Loop Input ────────────────────────────────────────────────────

export interface RuntimeHealingLoopInput {
  failureContext: FailureContext;
  projectRoot: string;
  auditRoot?: string;
  governanceThreshold?: number;
}
