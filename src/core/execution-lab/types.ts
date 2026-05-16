/**
 * Execution Lab Types
 *
 * Type definitions for the execution laboratory module.
 */

import type { UnifiedExecutionReport } from '../unified-runtime/types.js';
import type { ReliabilityHarnessResult } from '../operational-reliability/types.js';

// Repository Runner Types

export interface RepositoryExecutionResult {
  repoPath: string;
  executionId: string;
  iteration: number;
  success: boolean;
  report: UnifiedExecutionReport | null;
  error: string | null;
  healingAttempts: number;
  successfulHealings: number;
  governanceDecisions: number;
  replayFailures: number;
  sandboxVerified: boolean;
  runtimeInstability: boolean;
  executedAt: number;
}

// Execution Scheduler Types

export interface ExecutionBatchConfig {
  corpusPath: string;
  iterations: number;
  batchSize: number;
  subsetPattern?: string;
  reportOnly: boolean;
}

export interface ExecutionBatchReport {
  batchId: string;
  config: ExecutionBatchConfig;
  totalRepositories: number;
  completedRepositories: number;
  failedRepositories: number;
  results: RepositoryExecutionResult[];
  startedAt: number;
  completedAt: number;
  durationMs: number;
}

// Evidence Collector Types

export type EvidenceType =
  | 'healing-artifact'
  | 'replay-divergence'
  | 'governance-rejection'
  | 'patch-outcome'
  | 'runtime-instability'
  | 'unsupported-structure';

export interface OperationalEvidenceRecord {
  evidenceId: string;
  type: EvidenceType;
  repoPath: string;
  executionId: string;
  iteration: number;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata: Record<string, unknown>;
  collectedAt: number;
}

export interface EvidenceCollection {
  batchId: string;
  records: OperationalEvidenceRecord[];
  totalCount: number;
  collectedAt: number;
}

// Failure Cluster Analyzer Types

export type FailureClusterType =
  | 'replay-instability'
  | 'selector-instability'
  | 'governance-blind-spot'
  | 'unsupported-framework-pattern'
  | 'patch-instability';

export interface FailureCluster {
  clusterId: string;
  type: FailureClusterType;
  description: string;
  affectedRepositories: string[];
  affectedExecutions: string[];
  frequency: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  exampleEvidence: OperationalEvidenceRecord[];
}

export interface FailureClusterReport {
  batchId: string;
  clusters: FailureCluster[];
  totalClusters: number;
  totalFailures: number;
  mostSevereCluster: FailureCluster | null;
  generatedAt: number;
}

// Reliability Trend Analyzer Types

export type TrendDirection = 'improving' | 'stable' | 'degrading' | 'insufficient-data';

export interface ReliabilityTrend {
  metric: string;
  direction: TrendDirection;
  values: number[];
  changePercent: number;
}

export interface ReliabilityTrendReport {
  batchId: string;
  trends: ReliabilityTrend[];
  healingTrend: ReliabilityTrend;
  replayStabilityTrend: ReliabilityTrend;
  governanceConsistencyTrend: ReliabilityTrend;
  runtimeReliabilityTrend: ReliabilityTrend;
  patchSurvivabilityTrend: ReliabilityTrend;
  overallTrend: TrendDirection;
  generatedAt: number;
}

// Unsupported Pattern Detector Types

export type UnsupportedPatternType =
  | 'wrapper-heavy-abstraction'
  | 'dynamic-selector-factory'
  | 'unstable-async-flow'
  | 'framework-unsupported-api'
  | 'deep-iframe-modal-nesting';

export interface UnsupportedPattern {
  patternId: string;
  type: UnsupportedPatternType;
  description: string;
  repoPath: string;
  affectedFiles: string[];
  frequency: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  example: string;
}

export interface UnsupportedPatternInventory {
  batchId: string;
  patterns: UnsupportedPattern[];
  totalPatterns: number;
  byType: Record<UnsupportedPatternType, number>;
  generatedAt: number;
}

// Operational Insights Types

export type InsightType =
  | 'unstable-architecture-pattern'
  | 'weak-governance-threshold'
  | 'replay-instability-hotspot'
  | 'risky-mutation-structure'
  | 'runtime-fragility-zone';

export interface OperationalInsight {
  insightId: string;
  type: InsightType;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedRepositories: string[];
  recommendation: string;
  evidence: OperationalEvidenceRecord[];
}

export interface OperationalInsightsReport {
  batchId: string;
  insights: OperationalInsight[];
  totalInsights: number;
  criticalInsights: number;
  highInsights: number;
  generatedAt: number;
}

// Execution Lab Input/Output Types

export interface ExecutionLabInput {
  corpusPath: string;
  iterations?: number;
  batchSize?: number;
  subsetPattern?: string;
  reportOnly?: boolean;
}

export interface ExecutionLabResult {
  batchReport: ExecutionBatchReport;
  evidenceCollection: EvidenceCollection;
  failureClusterReport: FailureClusterReport;
  reliabilityTrendReport: ReliabilityTrendReport;
  unsupportedPatternInventory: UnsupportedPatternInventory;
  operationalInsightsReport: OperationalInsightsReport;
  persistedPaths: string[];
}
