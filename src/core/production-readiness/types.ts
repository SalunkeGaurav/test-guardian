/**
 * Production Readiness Types
 *
 * Type definitions for the production readiness & real-world integration module.
 */

import type { UnifiedExecutionReport } from '../unified-runtime/types.js';
import type { RepositoryValidationReport } from '../repository-validator/types.js';

// Performance Profiler Types

export interface StageDuration {
  stage: string;
  durationMs: number;
}

export interface PerformanceProfile {
  profileId: string;
  repoPath: string;
  stageDurations: StageDuration[];
  totalDurationMs: number;
  bottleneckStage: string;
  bottleneckDurationMs: number;
  parsingDurationMs: number;
  replayDurationMs: number;
  runtimeValidationDurationMs: number;
  sandboxDurationMs: number;
  governanceDurationMs: number;
  generatedAt: number;
}

// Memory Stability Types

export interface MemoryStabilityReport {
  reportId: string;
  repoPath: string;
  snapshotAccumulation: {
    totalSnapshots: number;
    avgSnapshotSize: number;
    excessiveAccumulation: boolean;
  };
  replayPayloads: {
    totalPayloads: number;
    avgPayloadSize: number;
    oversizedPayloads: number;
  };
  patchAuditReports: {
    totalReports: number;
    avgReportSize: number;
    oversizedReports: number;
  };
  repositoryScaling: {
    fileCount: number;
    locatorCount: number;
    scalingEfficiency: 'efficient' | 'moderate' | 'inefficient';
  };
  generatedAt: number;
}

// API Surface Audit Types

export interface APIExportEntry {
  name: string;
  type: 'class' | 'function' | 'interface' | 'type' | 'const' | 'enum';
  module: string;
  isInternal: boolean;
}

export interface APISurfaceAuditReport {
  auditId: string;
  publicExports: APIExportEntry[];
  leakedInternals: APIExportEntry[];
  duplicateExposures: Array<{ name: string; modules: string[] }>;
  namingInconsistencies: Array<{ name: string; expectedPattern: string; actualPattern: string }>;
  totalExports: number;
  totalLeaks: number;
  totalDuplicates: number;
  totalInconsistencies: number;
  generatedAt: number;
}

// CI Integration Types

export interface CIExecutionPlan {
  planId: string;
  mode: 'validation-only' | 'report-only' | 'strict-governance' | 'full';
  steps: CIStep[];
  estimatedDurationMs: number;
  generatedAt: number;
}

export interface CIStep {
  name: string;
  command: string;
  description: string;
  dependsOn: string[];
}

export interface CIIntegrationReport {
  reportId: string;
  githubActionsWorkflow: string;
  executionPlans: CIExecutionPlan[];
  supportedModes: string[];
  generatedAt: number;
}

// Package Readiness Types

export interface PackagingReadinessSummary {
  reportId: string;
  missingExports: string[];
  brokenCLIWiring: string[];
  invalidDependencyBoundaries: string[];
  tsconfigPackageConsistent: boolean;
  packagingReady: boolean;
  issues: string[];
  generatedAt: number;
}

// Developer Onboarding Types

export interface DeveloperOnboardingReport {
  reportId: string;
  minimalSetupSteps: number;
  cliDiscoverability: {
    totalCommands: number;
    documentedCommands: number;
    discoverabilityScore: number;
  };
  configClarity: {
    hasConfigFile: boolean;
    configDocumented: boolean;
    clarityScore: number;
  };
  reportReadability: {
    reportsPersisted: boolean;
    reportsHumanReadable: boolean;
    readabilityScore: number;
  };
  operationalComplexityScore: number;
  generatedAt: number;
}

// Production Readiness Types

export interface PerformanceSummary {
  profileId: string;
  totalDurationMs: number;
  bottleneckStage: string;
  stageDurations: StageDuration[];
}

export interface StabilitySummary {
  reportId: string;
  snapshotAccumulation: 'healthy' | 'warning' | 'critical';
  replayPayloads: 'healthy' | 'warning' | 'critical';
  scalingEfficiency: 'efficient' | 'moderate' | 'inefficient';
}

export interface APIReadinessSummary {
  auditId: string;
  totalExports: number;
  leakedInternals: number;
  duplicateExposures: number;
  namingInconsistencies: number;
  apiStable: boolean;
}

export interface PackagingReadinessSummary {
  reportId: string;
  packagingReady: boolean;
  issues: string[];
}

export interface CIReadinessSummary {
  reportId: string;
  supportedModes: string[];
  ciReady: boolean;
}

export interface ProductionReadinessReport {
  reportId: string;
  repoPath: string;
  performance: PerformanceSummary;
  stability: StabilitySummary;
  apiReadiness: APIReadinessSummary;
  packagingReadiness: PackagingReadinessSummary;
  ciReadiness: CIReadinessSummary;
  onboarding: DeveloperOnboardingReport;
  overallReadiness: 'ready' | 'needs-work' | 'not-ready';
  persistedPaths: string[];
  generatedAt: number;
}

// CLI Input Types

export interface ProductionReadinessInput {
  repoPath: string;
  profile?: boolean;
  ci?: boolean;
  packageAudit?: boolean;
}
