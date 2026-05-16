/**
 * Operational Reliability types.
 *
 * Captures contracts for long-run reliability measurement,
 * regression detection, and historical baseline comparison.
 *
 * No AI. No autonomous behavior. Deterministic measurement.
 */

import type { Result } from '../../models/result.js';
import type { UnifiedExecutionReport } from '../unified-runtime/types.js';
import type { RuntimeStabilityMetrics } from '../runtime-hardening/types.js';
import type { RuntimeHealingMetrics } from '../runtime-healing-loop/types.js';

// ─── Reliability Execution Session ─────────────────────────────────

export type ReliabilityRunStatus = 'completed' | 'failed' | 'partial' | 'skipped';

export interface ReliabilityRun {
  runId: string;
  iteration: number;
  repoPath: string;
  status: ReliabilityRunStatus;
  executionReport?: UnifiedExecutionReport;
  healingMetrics?: RuntimeHealingMetrics;
  stabilityMetrics?: RuntimeStabilityMetrics;
  error?: string;
  completedAt: number;
}

export interface ReliabilityExecutionSession {
  sessionId: string;
  corpusPath: string;
  iterations: number;
  runs: ReliabilityRun[];
  startedAt: number;
  completedAt: number;
}

// ─── Runtime Regression Detection ──────────────────────────────────

export type RegressionSeverity = 'none' | 'minor' | 'moderate' | 'severe' | 'critical';

export interface RuntimeRegressionIndicator {
  metric: string;
  baselineValue: number;
  currentValue: number;
  deviation: number;
  severity: RegressionSeverity;
}

export interface RuntimeRegressionReport {
  sessionId: string;
  indicators: RuntimeRegressionIndicator[];
  replaySuccessRegression: boolean;
  stabilizationRegression: boolean;
  staleRecoveryRegression: boolean;
  iframeRecoveryRegression: boolean;
  asyncRenderRegression: boolean;
  overallSeverity: RegressionSeverity;
  detectedAt: number;
}

// ─── Healing Regression Detection ──────────────────────────────────

export interface HealingRegressionIndicator {
  metric: string;
  baselineValue: number;
  currentValue: number;
  deviation: number;
  severity: RegressionSeverity;
}

export interface HealingRegressionReport {
  sessionId: string;
  indicators: HealingRegressionIndicator[];
  recoveryRateRegression: boolean;
  falseRecoveryRegression: boolean;
  riskyRecoveryRegression: boolean;
  replayDivergenceRegression: boolean;
  structuralMutationRegression: boolean;
  overallSeverity: RegressionSeverity;
  detectedAt: number;
}

// ─── Governance Regression Detection ───────────────────────────────

export interface GovernanceRegressionIndicator {
  metric: string;
  baselineValue: number;
  currentValue: number;
  deviation: number;
  severity: RegressionSeverity;
}

export interface GovernanceRegressionReport {
  sessionId: string;
  indicators: GovernanceRegressionIndicator[];
  falseApprovalIncrease: boolean;
  falseRejectionIncrease: boolean;
  confidenceCalibrationDrift: boolean;
  replayTrustDegradation: boolean;
  overallSeverity: RegressionSeverity;
  detectedAt: number;
}

// ─── Replay Reliability Monitoring ─────────────────────────────────

export interface ReplayReliabilityReport {
  sessionId: string;
  totalReplays: number;
  reproducibleReplays: number;
  nondeterministicFrequency: number;
  navigationDriftFrequency: number;
  asyncTimingInstability: number;
  failureClustering: number;
  reproducibilityRate: number;
  overallReliability: 'high' | 'medium' | 'low' | 'critical';
  detectedAt: number;
}

// ─── Patch Safety Monitoring ───────────────────────────────────────

export interface PatchSafetyReliabilityReport {
  sessionId: string;
  totalPatches: number;
  compilePreservationRate: number;
  rollbackSuccessRate: number;
  patchSurvivabilityRate: number;
  importPreservationRate: number;
  formattingPreservationRate: number;
  unintendedMutationCount: number;
  overallSafety: 'safe' | 'caution' | 'unsafe';
  detectedAt: number;
}

// ─── Historical Baseline ───────────────────────────────────────────

export interface HistoricalReliabilityBaseline {
  baselineId: string;
  corpusPath: string;
  createdAt: number;
  runtimeMetrics: {
    domStabilizationSuccessRate: number;
    replayRecoverySuccess: number;
    staleRecoverySuccess: number;
    iframeRecoveryRate: number;
    asyncRenderInstabilityFrequency: number;
    replayDriftFrequency: number;
  };
  healingMetrics: {
    healingSuccessRate: number;
    sandboxReplaySuccess: number;
    falseRecoveryRate: number;
    replayDivergenceRate: number;
    rollbackReliability: number;
    patchSurvivability: number;
  };
  governanceMetrics: {
    governancePassRate: number;
    averageGatePassRate: number;
  };
  replayMetrics: {
    reproducibilityRate: number;
    nondeterministicFrequency: number;
    navigationDriftFrequency: number;
  };
  patchMetrics: {
    compilePreservationRate: number;
    rollbackSuccessRate: number;
    patchSurvivabilityRate: number;
  };
  totalRuns: number;
}

// ─── Reliability Scoring ───────────────────────────────────────────

export interface OperationalReliabilityScore {
  sessionId: string;
  runtimeReliability: number;
  healingReliability: number;
  governanceTrustworthiness: number;
  replayStability: number;
  patchSafety: number;
  compositeScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  trend: 'improving' | 'stable' | 'degrading';
  scoredAt: number;
}

// ─── Reliability Harness Input / Result ────────────────────────────

export interface ReliabilityHarnessInput {
  corpusPath: string;
  iterations?: number;
  strictBaseline?: boolean;
  detectRegressions?: boolean;
  reportOnly?: boolean;
}

export interface ReliabilityHarnessResult {
  session: ReliabilityExecutionSession;
  runtimeRegression: RuntimeRegressionReport;
  healingRegression: HealingRegressionReport;
  governanceRegression: GovernanceRegressionReport;
  replayReliability: ReplayReliabilityReport;
  patchSafety: PatchSafetyReliabilityReport;
  baseline: HistoricalReliabilityBaseline;
  reliabilityScore: OperationalReliabilityScore;
  persistedPaths: string[];
}
