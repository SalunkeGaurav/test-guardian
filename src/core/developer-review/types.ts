/**
 * Developer Review Experience Types
 *
 * Type definitions for the developer-facing review experience layer.
 */

import type { HealingExplanation, ConfidenceBreakdown } from '../../models/healing-explanation.js';
import type { PatchDiff, PatchProposal, RollbackMetadata } from '../../models/patch.js';
import type { ValidationResult } from '../../models/validation.js';
import type { RuntimeValidationResult, ReplayDivergence } from '../../models/runtime.js';
import type { RuntimeHardeningResult } from '../runtime-hardening/types.js';
import type { GovernanceResult, GateResult } from '../pipeline/confidence-governance.js';
import type { RuntimeHealingReviewPackage } from '../runtime-healing-loop/types.js';
import type { OperationalReliabilityScore, ReliabilityExecutionSession } from '../operational-reliability/types.js';

// Review Renderer Types

export interface DeveloperReviewReport {
  reviewId: string;
  locatorSummary: {
    originalLocator: string;
    healedLocator: string;
    strategy: string;
  };
  validationOutcome: {
    status: string;
    matchedElementCount: number;
    interactionSuccess: boolean;
    replayConfidence: number;
  };
  replayOutcome: {
    status: string;
    executedStepCount: number;
    runtimeConfidence: number;
    divergenceCount: number;
  };
  runtimeStabilityOutcome: {
    overallStable: boolean;
    domStabilized: boolean;
    replayDeterministic: boolean;
    driftSeverity: string;
  };
  governanceReasoning: {
    passed: boolean;
    gates: GateResult[];
    rejectionReasons: string[];
  };
  rollbackInstructions: {
    available: boolean;
    reversalCode: string;
    originalExpression: string;
    targetLine: number;
    targetColumn: number;
  };
  explainability: HealingExplanation;
  generatedAt: number;
}

// Patch Visualizer Types

export interface PatchVisualization {
  patchId: string;
  targetFile: string;
  diff: PatchDiff;
  affectedSelectors: string[];
  patchScope: {
    linesChanged: number;
    filesAffected: number;
    strategiesModified: string[];
  };
  structuralImpact: {
    astNodeType: string;
    parentType: string;
    expressionType: string;
    impactLevel: 'minimal' | 'moderate' | 'significant';
  };
  renderedDiff: string;
  renderedSummary: string;
}

// Governance Explainer Types

export interface GovernanceExplanationReport {
  reviewId: string;
  overallDecision: 'approved' | 'rejected';
  approvalReasons: string[];
  rejectionReasons: string[];
  confidenceThresholds: {
    minStaticValidationConfidence: number;
    minRuntimeConfidence: number;
    requireUniqueness: boolean;
    requireReplayConsistency: boolean;
  };
  gateExplanations: Array<{
    gate: string;
    passed: boolean;
    detail: string;
    impact: string;
  }>;
  replayConcerns: string[];
  runtimeInstabilityConcerns: string[];
  structuralRisks: string[];
  renderedExplanation: string;
}

// Replay Evidence Renderer Types

export interface ReplayEvidenceReport {
  reviewId: string;
  replayPathSummary: {
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    divergedSteps: number;
  };
  navigationFlow: string[];
  divergenceEvidence: Array<{
    type: string;
    stepIndex: number;
    expected: string;
    actual: string;
    severity: string;
  }>;
  replayRecoveryAttempts: number;
  unstableExecutionWarnings: string[];
  renderedEvidence: string;
}

// Confidence Breakdown Renderer Types

export interface ConfidenceBreakdownReport {
  reviewId: string;
  confidenceComposition: ConfidenceBreakdown;
  structuralWeighting: {
    survivabilityScore: number;
    structuralSimilarity: number;
    attributeMatchScore: number;
    hierarchyStability: number;
  };
  runtimeWeighting: {
    runtimeConfidence: number;
    executedStepCount: number;
  };
  replayWeighting: {
    replayConfidence: number;
    matchedElementCount: number;
    interactionSuccess: boolean;
  };
  governanceAdjustments: {
    gatesPassed: number;
    gatesFailed: number;
    adjustments: string[];
  };
  renderedBreakdown: string;
}

// Rollback Review Types

export interface RollbackReviewReport {
  reviewId: string;
  rollbackAvailability: boolean;
  rollbackVerification: {
    reversalCodeValid: boolean;
    originalLocatorPreserved: boolean;
    targetFileExists: boolean;
  };
  patchReversibility: {
    reversible: boolean;
    reversalComplexity: 'simple' | 'moderate' | 'complex';
    riskLevel: 'low' | 'medium' | 'high';
  };
  sandboxRollbackEvidence: {
    rollbackTested: boolean;
    rollbackSuccess: boolean;
    postRollbackValidation: string;
  };
  renderedRollback: string;
}

// Mutation Risk Visualizer Types

export interface MutationRiskVisualization {
  reviewId: string;
  selectorInstability: {
    riskLevel: 'low' | 'medium' | 'high';
    factors: string[];
  };
  replayFragility: {
    riskLevel: 'low' | 'medium' | 'high';
    divergenceCount: number;
    factors: string[];
  };
  structuralMutationRisk: {
    riskLevel: 'low' | 'medium' | 'high';
    astChangeType: string;
    factors: string[];
  };
  asyncInstability: {
    riskLevel: 'low' | 'medium' | 'high';
    factors: string[];
  };
  iframeModalInstability: {
    riskLevel: 'low' | 'medium' | 'high';
    factors: string[];
  };
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  renderedVisualization: string;
}

// Review Bundle Generator Types

export interface ReviewBundle {
  bundleId: string;
  reviewReport: DeveloperReviewReport;
  patchVisualization: PatchVisualization;
  governanceExplanation: GovernanceExplanationReport;
  replayEvidence: ReplayEvidenceReport;
  confidenceBreakdown: ConfidenceBreakdownReport;
  rollbackReview: RollbackReviewReport;
  mutationRiskVisualization: MutationRiskVisualization;
  runtimeMetrics: {
    domStabilizationSuccessRate: number;
    replayRecoverySuccess: number;
    staleRecoverySuccess: number;
    iframeRecoveryRate: number;
  };
  persistedPaths: string[];
  generatedAt: number;
}

// CLI Input Types

export interface ReviewInput {
  reportPath: string;
  format?: 'html' | 'json' | 'compact' | 'full';
}
