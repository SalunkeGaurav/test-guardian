/**
 * Operational Reliability Module
 *
 * Long-run reliability harness for continuous measurement of
 * platform stability, healing reliability, replay accuracy,
 * governance trustworthiness, and patch safety.
 *
 * @module operational-reliability
 */

export { ReliabilityHarness } from './reliability-harness.js';
export { ExecutionObserver } from './execution-observer.js';
export { RuntimeRegressionDetector } from './runtime-regression-detector.js';
export { HealingRegressionDetector } from './healing-regression-detector.js';
export { GovernanceRegressionDetector } from './governance-regression-detector.js';
export { ReplayReliabilityMonitor } from './replay-reliability-monitor.js';
export { PatchSafetyMonitor } from './patch-safety-monitor.js';
export { ReliabilityScorer } from './reliability-scoring.js';
export { HistoricalBaselineManager } from './historical-baseline.js';

export type {
  ReliabilityRunStatus,
  ReliabilityRun,
  ReliabilityExecutionSession,
  RegressionSeverity,
  RuntimeRegressionIndicator,
  RuntimeRegressionReport,
  HealingRegressionIndicator,
  HealingRegressionReport,
  GovernanceRegressionIndicator,
  GovernanceRegressionReport,
  ReplayReliabilityReport,
  PatchSafetyReliabilityReport,
  HistoricalReliabilityBaseline,
  OperationalReliabilityScore,
  ReliabilityHarnessInput,
  ReliabilityHarnessResult,
} from './types.js';
