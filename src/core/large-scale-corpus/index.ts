/**
 * Large Scale Corpus Execution Module
 *
 * Executes full-scale real-world repository validation against the
 * benchmark corpus and generates operational evidence reports.
 *
 * @module large-scale-corpus
 */

export { LargeScaleCorpusExecution } from './large-scale-corpus.js';
export { CorpusDiscovery } from './corpus-discovery.js';
export { ExecutionStateManager } from './execution-state-manager.js';
export { RepositoryExecutionRunner } from './repository-execution-runner.js';
export { CrossRepositoryAggregator } from './cross-repository-aggregator.js';

export type {
  RepositoryMarker,
  DiscoveredRepository,
  RepositoryInventory,
  RepositoryExecutionState,
  ExecutionState,
  RepositoryExecutionResult,
  CompatibilityDistribution,
  UnsupportedPatternFrequency,
  FragileSelectorPattern,
  UnstableReplayStructure,
  GovernanceFailureCluster,
  RuntimeInstabilityCluster,
  PerformanceBottleneck,
  RepositoryTypeCorrelation,
  FailureHotspot,
  RecoveryMetric,
  CrossRepositoryAggregation,
  LargeScaleCorpusReport,
  LargeScaleCorpusInput,
} from './types.js';
