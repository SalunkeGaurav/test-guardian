/**
 * Large Scale Corpus Execution Types
 *
 * Type definitions for the large-scale corpus execution module.
 */

import type { RepositoryValidationReport, CompatibilityStatus } from '../repository-validator/types.js';
import type { ExecutionBatchReport } from '../execution-lab/types.js';
import type { ReliabilityHarnessResult } from '../operational-reliability/types.js';
import type { ProductionReadinessReport } from '../production-readiness/types.js';

// Corpus Discovery Types

export interface RepositoryMarker {
  hasPackageJson: boolean;
  hasPlaywrightConfig: boolean;
  hasTsconfig: boolean;
  hasGit: boolean;
}

export interface DiscoveredRepository {
  path: string;
  name: string;
  category: string;
  markers: RepositoryMarker;
  depth: number;
}

export interface RepositoryInventory {
  inventoryId: string;
  corpusPath: string;
  repositories: DiscoveredRepository[];
  totalRepositories: number;
  categories: string[];
  generatedAt: number;
}

// Execution State Types

export interface RepositoryExecutionState {
  repoPath: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  attempts: number;
  lastError?: string;
  completedAt?: number;
}

export interface ExecutionState {
  stateId: string;
  corpusPath: string;
  batchSize: number;
  repositories: RepositoryExecutionState[];
  startedAt: number;
  completedAt?: number;
  totalRepositories: number;
  completedRepositories: number;
  failedRepositories: number;
  skippedRepositories: number;
}

// Repository Execution Result Types

export interface RepositoryExecutionResult {
  repoPath: string;
  name: string;
  category: string;
  status: 'completed' | 'failed' | 'skipped';
  validationReport?: RepositoryValidationReport;
  compatibilityStatus?: CompatibilityStatus;
  parserSurvivability?: number;
  compileStability?: number;
  healingRecoveryRate?: number;
  governanceRejectionRate?: number;
  replayInstability?: boolean;
  unsupportedPatterns?: string[];
  executionDurationMs?: number;
  error?: string;
  completedAt: number;
}

// Cross-Repository Aggregation Types

export interface CompatibilityDistribution {
  supported: number;
  partiallySupported: number;
  unsupported: number;
  unknown: number;
}

export interface UnsupportedPatternFrequency {
  pattern: string;
  frequency: number;
  affectedRepositories: string[];
}

export interface FragileSelectorPattern {
  selector: string;
  failureCount: number;
  affectedRepositories: string[];
}

export interface UnstableReplayStructure {
  structure: string;
  failureCount: number;
  affectedRepositories: string[];
}

export interface GovernanceFailureCluster {
  reason: string;
  count: number;
  affectedRepositories: string[];
}

export interface RuntimeInstabilityCluster {
  type: string;
  count: number;
  affectedRepositories: string[];
}

export interface PerformanceBottleneck {
  stage: string;
  avgDurationMs: number;
  maxDurationMs: number;
  affectedRepositories: string[];
}

export interface RepositoryTypeCorrelation {
  category: string;
  avgCompatibilityScore: number;
  avgParserSurvivability: number;
  avgCompileStability: number;
  failureRate: number;
}

export interface FailureHotspot {
  repository: string;
  category: string;
  failureReasons: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RecoveryMetric {
  metric: string;
  avgValue: number;
  minValue: number;
  maxValue: number;
  repositoryCount: number;
}

// Cross-Repository Aggregation Report

export interface CrossRepositoryAggregation {
  aggregationId: string;
  corpusPath: string;
  totalRepositories: number;
  completedRepositories: number;
  failedRepositories: number;
  compatibilityDistribution: CompatibilityDistribution;
  unsupportedPatternFrequency: UnsupportedPatternFrequency[];
  fragileSelectorPatterns: FragileSelectorPattern[];
  unstableReplayStructures: UnstableReplayStructure[];
  governanceFailureClusters: GovernanceFailureCluster[];
  runtimeInstabilityClusters: RuntimeInstabilityCluster[];
  performanceBottlenecks: PerformanceBottleneck[];
  repositoryTypeCorrelation: RepositoryTypeCorrelation[];
  failureHotspots: FailureHotspot[];
  recoveryMetrics: RecoveryMetric[];
  generatedAt: number;
}

// Large Scale Corpus Report

export interface LargeScaleCorpusReport {
  reportId: string;
  corpusPath: string;
  inventory: RepositoryInventory;
  executionState: ExecutionState;
  results: RepositoryExecutionResult[];
  aggregation: CrossRepositoryAggregation;
  persistedPaths: string[];
  generatedAt: number;
}

// CLI Input Types

export interface LargeScaleCorpusInput {
  corpusPath: string;
  batchSize?: number;
  resume?: boolean;
  failedOnly?: boolean;
  reportOnly?: boolean;
}
