/**
 * Execution Lab Module
 *
 * Structured execution laboratory for continuously running TestGuardian
 * against real repositories and collecting operational evidence.
 *
 * @module execution-lab
 */

export { ExecutionLab } from './execution-lab.js';
export { RepositoryRunner } from './repository-runner.js';
export { ExecutionScheduler } from './execution-scheduler.js';
export { EvidenceCollector } from './evidence-collector.js';
export { FailureClusterAnalyzer } from './failure-cluster-analyzer.js';
export { ReliabilityTrendAnalyzer } from './reliability-trend-analyzer.js';
export { UnsupportedPatternDetector } from './unsupported-pattern-detector.js';
export { OperationalInsights } from './operational-insights.js';

export type {
  RepositoryExecutionResult,
  ExecutionBatchConfig,
  ExecutionBatchReport,
  EvidenceType,
  OperationalEvidenceRecord,
  EvidenceCollection,
  FailureClusterType,
  FailureCluster,
  FailureClusterReport,
  TrendDirection,
  ReliabilityTrend,
  ReliabilityTrendReport,
  UnsupportedPatternType,
  UnsupportedPattern,
  UnsupportedPatternInventory,
  InsightType,
  OperationalInsight,
  OperationalInsightsReport,
  ExecutionLabInput,
  ExecutionLabResult,
} from './types.js';
