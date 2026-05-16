/**
 * Stabilization Types
 *
 * Type definitions for the stabilization analysis module.
 */

import type { RepositoryExecutionResult } from '../large-scale-corpus/types.js';
import type { CrossRepositoryAggregation } from '../large-scale-corpus/types.js';

// Stabilization Summary Types

export interface StabilizationSummary {
  summaryId: string;
  corpusPath: string;
  totalRepositories: number;
  completedRepositories: number;
  failedRepositories: number;
  overallStabilityScore: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  generatedAt: number;
}

// Highest Risk Patterns Types

export interface RiskPattern {
  pattern: string;
  frequency: number;
  affectedRepositories: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  description: string;
}

export interface HighestRiskPatterns {
  reportId: string;
  patterns: RiskPattern[];
  totalPatterns: number;
  criticalPatterns: number;
  highPatterns: number;
  generatedAt: number;
}

// Replay Instability Hotspots Types

export interface ReplayInstabilityHotspot {
  repository: string;
  category: string;
  instabilityType: string;
  frequency: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  details: string;
}

export interface ReplayInstabilityReport {
  reportId: string;
  hotspots: ReplayInstabilityHotspot[];
  totalHotspots: number;
  mostUnstableCategory: string;
  generatedAt: number;
}

// Governance Weaknesses Types

export interface GovernanceWeakness {
  weakness: string;
  affectedRepositories: string[];
  rejectionRate: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

export interface GovernanceWeaknessesReport {
  reportId: string;
  weaknesses: GovernanceWeakness[];
  totalWeaknesses: number;
  overallGovernanceHealth: 'healthy' | 'moderate' | 'unhealthy' | 'critical';
  generatedAt: number;
}

// Unsupported Structures Types

export interface UnsupportedStructure {
  structure: string;
  frequency: number;
  affectedRepositories: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
}

export interface UnsupportedStructuresReport {
  reportId: string;
  structures: UnsupportedStructure[];
  totalStructures: number;
  mostCommonStructure: string;
  generatedAt: number;
}

// Architectural Hotspots Types

export interface ArchitecturalHotspot {
  hotspot: string;
  type: 'oversized-orchestrator' | 'duplicated-reports' | 'overlapping-persistence' | 'unstable-dependency' | 'model-fragmentation' | 'orchestration-inflation' | 'weak-boundary';
  affectedModules: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}

export interface ArchitecturalHotspotsReport {
  reportId: string;
  hotspots: ArchitecturalHotspot[];
  totalHotspots: number;
  criticalHotspots: number;
  generatedAt: number;
}

// Performance Bottlenecks Types

export interface PerformanceBottleneckDetail {
  stage: string;
  avgDurationMs: number;
  maxDurationMs: number;
  minDurationMs: number;
  affectedRepositories: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface PerformanceBottlenecksReport {
  reportId: string;
  bottlenecks: PerformanceBottleneckDetail[];
  slowestStage: string;
  largestOrchestrationHotspot: string;
  generatedAt: number;
}

// Recovery Quality Types

export interface RecoveryQualityMetric {
  metric: string;
  avgValue: number;
  minValue: number;
  maxValue: number;
  repositoryCount: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface RecoveryQualityReport {
  reportId: string;
  metrics: RecoveryQualityMetric[];
  overallRecoveryHealth: 'excellent' | 'good' | 'fair' | 'poor';
  generatedAt: number;
}

// False Confidence Types

export interface FalseConfidenceIndicator {
  repository: string;
  indicator: string;
  confidenceScore: number;
  actualOutcome: string;
  discrepancy: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface FalseConfidenceReport {
  reportId: string;
  indicators: FalseConfidenceIndicator[];
  totalIndicators: number;
  falseConfidenceRate: number;
  generatedAt: number;
}

// Simplification Opportunities Types

export interface SimplificationOpportunity {
  opportunity: string;
  type: 'merge-modules' | 'duplicate-schemas' | 'redundant-persistence' | 'collapse-orchestration' | 'unstable-exports' | 'dead-abstraction' | 'unnecessary-indirection';
  affectedModules: string[];
  impact: 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}

export interface SimplificationOpportunitiesReport {
  reportId: string;
  opportunities: SimplificationOpportunity[];
  totalOpportunities: number;
  highImpactOpportunities: number;
  generatedAt: number;
}

// Alpha Readiness Types

export type ReadinessCategory =
  | 'operational-stability'
  | 'replay-trustworthiness'
  | 'healing-safety'
  | 'governance-reliability'
  | 'runtime-survivability'
  | 'developer-usability'
  | 'packaging-readiness'
  | 'ci-readiness'
  | 'external-adoption';

export interface ReadinessAssessment {
  category: ReadinessCategory;
  score: number;
  status: 'ready' | 'needs-work' | 'not-ready';
  blockers: string[];
  recommendations: string[];
}

export interface AlphaReadinessScore {
  reportId: string;
  overallScore: number;
  overallStatus: 'ready' | 'needs-work' | 'not-ready';
  assessments: ReadinessAssessment[];
  criticalBlockers: string[];
  recommendedBeforeAlpha: string[];
  safeToShipFeatures: string[];
  experimentalFeatures: string[];
  generatedAt: number;
}

// Main Stabilization Report Types

export interface StabilizationReport {
  reportId: string;
  corpusPath: string;
  summary: StabilizationSummary;
  highestRiskPatterns: HighestRiskPatterns;
  replayInstability: ReplayInstabilityReport;
  governanceWeaknesses: GovernanceWeaknessesReport;
  unsupportedStructures: UnsupportedStructuresReport;
  architecturalHotspots: ArchitecturalHotspotsReport;
  performanceBottlenecks: PerformanceBottlenecksReport;
  recoveryQuality: RecoveryQualityReport;
  falseConfidence: FalseConfidenceReport;
  simplificationOpportunities: SimplificationOpportunitiesReport;
  alphaReadiness: AlphaReadinessScore;
  persistedPaths: string[];
  generatedAt: number;
}

// CLI Input Types

export interface StabilizationInput {
  corpusPath: string;
  batchSize?: number;
  resume?: boolean;
  reportOnly?: boolean;
}
