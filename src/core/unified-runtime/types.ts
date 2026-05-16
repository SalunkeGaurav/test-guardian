/**
 * Unified Execution Runtime types.
 *
 * Captures contracts for the single deterministic entrypoint that
 * executes the full TestGuardian workflow.
 *
 * No AI. No autonomous behavior. Deterministic flow.
 */

import type { Result } from '../../models/result.js';
import type { RepositoryValidationReport, CompatibilityStatus } from '../repository-validator/types.js';
import type { RuntimeHardeningResult, RuntimeStabilityMetrics } from '../runtime-hardening/types.js';
import type { RuntimeHealingLoopResult, RuntimeHealingReviewPackage, RuntimeHealingMetrics } from '../runtime-healing-loop/types.js';
import type { SandboxExecutionResult } from '../sandbox/mutation-sandbox.js';
import type { GovernanceResult, GateResult } from '../pipeline/confidence-governance.js';
import type { HealingExplanation } from '../../models/healing-explanation.js';
import type { PipelineResult } from '../../models/pipeline.js';
import type { ValidationResult } from '../../models/validation.js';

// ─── Execution Plan ────────────────────────────────────────────────

export type ExecutionStage =
  | 'repository-analysis'
  | 'runtime-hardening'
  | 'failure-detection'
  | 'healing-execution'
  | 'validation'
  | 'sandbox-verification'
  | 'governance-review'
  | 'review-package-generation'
  | 'report-aggregation';

export type ExecutionStageStatus = 'pending' | 'running' | 'completed' | 'skipped' | 'failed';

export interface ExecutionStagePlan {
  stage: ExecutionStage;
  status: ExecutionStageStatus;
  dependsOn: ExecutionStage[];
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface ExecutionPlan {
  planId: string;
  repoPath: string;
  stages: ExecutionStagePlan[];
  createdAt: number;
}

// ─── Runtime Context ───────────────────────────────────────────────

export interface RuntimeContext {
  repoPath: string;
  frameworkType: string;
  compatibilityStatus: CompatibilityStatus;
  repositoryReport?: RepositoryValidationReport;
  hardeningResult?: RuntimeHardeningResult;
  healingResult?: RuntimeHealingLoopResult;
  pipelineResult?: PipelineResult;
  sandboxResult?: SandboxExecutionResult;
  governanceResult?: GovernanceResult;
  reviewPackage?: RuntimeHealingReviewPackage;
  validationResults?: ValidationResult[];
  explanations?: HealingExplanation[];
  executionId: string;
  startedAt: number;
}

// ─── Execution State Machine ───────────────────────────────────────

export type ExecutionState =
  | 'idle'
  | 'analyzing'
  | 'hardening'
  | 'healing'
  | 'validating'
  | 'sandboxing'
  | 'governing'
  | 'reporting'
  | 'completed'
  | 'failed';

export interface ExecutionStateTransition {
  from: ExecutionState;
  to: ExecutionState;
  stage: ExecutionStage;
  success: boolean;
  error?: string;
  timestamp: number;
}

export interface ExecutionStateTransitionReport {
  transitions: ExecutionStateTransition[];
  currentState: ExecutionState;
  finalState: ExecutionState;
  totalTransitions: number;
  failedTransitions: number;
}

// ─── Workflow Routing ──────────────────────────────────────────────

export type WorkflowRoute =
  | 'full-execution'
  | 'healing-only'
  | 'validation-only'
  | 'report-only'
  | 'blocked';

export interface WorkflowRoutingDecision {
  route: WorkflowRoute;
  reason: string;
  compatibilityStatus: CompatibilityStatus;
  skippedStages: ExecutionStage[];
  enabledStages: ExecutionStage[];
}

// ─── Failure Boundary ──────────────────────────────────────────────

export type FailureType =
  | 'runtime-failure'
  | 'replay-divergence'
  | 'sandbox-corruption'
  | 'governance-rejection'
  | 'compile-failure'
  | 'repository-incompatible';

export interface FailureBoundaryEvent {
  type: FailureType;
  stage: ExecutionStage;
  error: string;
  recoverable: boolean;
  degradedTo?: ExecutionStage;
  timestamp: number;
}

export interface FailureBoundaryReport {
  events: FailureBoundaryEvent[];
  totalFailures: number;
  recoverableFailures: number;
  unrecoverableFailures: number;
  gracefulDegradation: boolean;
}

// ─── Unified Execution Report ──────────────────────────────────────

export interface UnifiedExecutionReport {
  executionId: string;
  repoPath: string;
  frameworkType: string;
  compatibilityStatus: CompatibilityStatus;
  repositorySummary: {
    totalFiles: number;
    totalLocators: number;
    compatibilityScore: number;
    risks: number;
  };
  healingSummary: {
    totalAttempts: number;
    successfulHealings: number;
    reviewPackages: number;
  };
  validationOutcomes: {
    totalValidations: number;
    passed: number;
    failed: number;
  };
  replayStability: {
    domStabilized: boolean;
    replayDeterministic: boolean;
    driftSeverity: string;
  };
  governanceDecisions: {
    governancePassed: boolean;
    gatesPassed: number;
    gatesFailed: number;
  };
  sandboxVerification: {
    sandboxExecuted: boolean;
    compileSuccess: boolean;
    isolationVerified: boolean;
  };
  patchProposals: {
    totalProposals: number;
    status: string;
  };
  rollbackMetadata: {
    rollbackAvailable: boolean;
    rollbackCode?: string;
  };
  riskAnalysis: {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    riskFactors: string[];
  };
  runtimeMetrics: {
    domStabilizationSuccessRate: number;
    replayRecoverySuccess: number;
    staleRecoverySuccess: number;
    iframeRecoveryRate: number;
    asyncRenderInstabilityFrequency: number;
    replayDriftFrequency: number;
  };
  stateTransitions: ExecutionStateTransitionReport;
  failureBoundary: FailureBoundaryReport;
  persistedPaths: string[];
  completedAt: number;
}

// ─── Unified Runtime Input / Result ────────────────────────────────

export interface UnifiedRuntimeInput {
  repoPath: string;
  sandbox?: boolean;
  validateOnly?: boolean;
  runtimeHealing?: boolean;
  strictGovernance?: boolean;
  reportOnly?: boolean;
}

export interface UnifiedRuntimeResult {
  report: UnifiedExecutionReport;
  context: RuntimeContext;
  success: boolean;
}
