/**
 * Shared Types Module
 *
 * Consolidates duplicated schemas across the codebase to reduce
 * architectural complexity and eliminate redundant type definitions.
 *
 * This module provides canonical definitions for types that were
 * previously duplicated across multiple modules.
 *
 * @module shared-types
 */

// ============================================================================
// BenchmarkResult (was duplicated in healing-benchmark, developer-workflow, confidence-calibration)
// ============================================================================

export interface BenchmarkResult {
  benchmarkId: string;
  category: string;
  originalLocator: string;
  attemptedRecovery: boolean;
  outcome: 'recovered' | 'failed' | 'partial';
  recoveryTimeMs: number;
  safetyVerified: boolean;
  details?: Record<string, unknown>;
}

// ============================================================================
// ArchitecturalWeakPoint (was duplicated in healing-benchmark, adversarial-tester)
// ============================================================================

export interface ArchitecturalWeakPoint {
  location: string;
  issue: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category?: string;
}

// ============================================================================
// ConfidenceReliability (was duplicated in healing-benchmark, healing-intelligence)
// ============================================================================

export interface ConfidenceReliability {
  highConfidenceAccuracy: number;
  moderateConfidenceAccuracy: number;
  lowConfidenceAccuracy: number;
  averageConfidenceScore: number;
}

export interface ConfidenceReliabilityBand {
  confidenceBand: string;
  accuracy: number;
  sampleSize: number;
}

// ============================================================================
// DiffHunk (was duplicated in developer-workflow, patcher)
// ============================================================================

export interface DiffHunk {
  originalStart: number;
  originalLines: string[];
  patchedStart: number;
  patchedLines: string[];
  type?: 'add' | 'remove' | 'modify';
}

// ============================================================================
// GovernanceWeakness (was duplicated in corpus-execution, stabilization)
// ============================================================================

export interface GovernanceWeakness {
  category: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  affectedModules: string[];
  recommendation: string;
}

// ============================================================================
// UnsupportedPattern (was duplicated in corpus-execution, execution-lab)
// ============================================================================

export interface UnsupportedPattern {
  pattern: string;
  category: string;
  frequency: number;
  affectedRepositories: string[];
  description: string;
}

// ============================================================================
// UnsupportedStructure (was duplicated in healing-intelligence, stabilization)
// ============================================================================

export interface UnsupportedStructure {
  structure: string;
  category: string;
  frequency: number;
  affectedRepositories: string[];
  description: string;
}

// ============================================================================
// RepositoryExecutionResult (was duplicated in execution-lab, large-scale-corpus)
// ============================================================================

export interface RepositoryExecutionResult {
  repoPath: string;
  name: string;
  category: string;
  status: 'completed' | 'failed' | 'skipped';
  compatibilityStatus: 'supported' | 'partially-supported' | 'unsupported' | 'unknown';
  parserSurvivability: number;
  compileStability: number;
  healingRecoveryRate: number;
  governanceRejectionRate: number;
  replayInstability: boolean;
  unsupportedPatterns: string[];
  executionDurationMs: number;
  completedAt: number;
  error?: string;
}

// ============================================================================
// PackagingReadinessSummary (was duplicated within production-readiness/types.ts)
// ============================================================================

export interface PackagingReadinessSummary {
  packageName: string;
  version: string;
  hasMainEntry: boolean;
  hasTypesEntry: boolean;
  hasBinEntry: boolean;
  hasExportsMap: boolean;
  missingDependencies: string[];
  unusedDependencies: string[];
  peerDependencyIssues: string[];
  readinessScore: number;
  status: 'ready' | 'needs-work' | 'not-ready';
  recommendations: string[];
}

// ============================================================================
// HealingIntelReport (was duplicated in confidence-calibration, developer-workflow)
// ============================================================================

export interface HealingIntelReport {
  reportId: string;
  generatedAt: number;
  totalBenchmarks: number;
  successRate: number;
  averageRecoveryTime: number;
  categoryBreakdown: Record<string, number>;
  weakPoints: ArchitecturalWeakPoint[];
  recommendations: string[];
}

// ============================================================================
// PatternReport (was duplicated in confidence-calibration, developer-workflow)
// ============================================================================

export interface PatternReport {
  reportId: string;
  generatedAt: number;
  totalPatterns: number;
  highConfidencePatterns: number;
  lowConfidencePatterns: number;
  patterns: {
    pattern: string;
    confidence: number;
    frequency: number;
    category: string;
  }[];
  recommendations: string[];
}

// ============================================================================
// ValidationReport (was duplicated in confidence-calibration, developer-workflow)
// ============================================================================

export interface ValidationReport {
  reportId: string;
  generatedAt: number;
  totalValidated: number;
  passed: number;
  failed: number;
  validationResults: {
    item: string;
    status: 'passed' | 'failed';
    reason?: string;
  }[];
  recommendations: string[];
}

// ============================================================================
// ConfidenceCalibrationReport (canonical definition)
// ============================================================================

export interface ConfidenceCalibrationReport {
  id: string;
  generatedAt: number;
  sourceCorpusPath: string;
  analysisResults: {
    totalTests: number;
    calibratedTests: number;
    calibrationRate: number;
  };
  governanceAnalysis: {
    thresholdEffectiveness: number;
    falsePositiveRate: number;
    falseNegativeRate: number;
  };
  structuralCorrelation: {
    patternCorrelation: number;
    structureCorrelation: number;
  };
  recalibrationRecommendations: string[];
  simulationResults?: Record<string, unknown>;
}

// ============================================================================
// HealingIntelligence ConfidenceCalibrationReport (different shape - renamed)
// ============================================================================

export interface HealingConfidenceReport {
  overallAccuracy: number;
  confidenceReliability: ConfidenceReliability;
  weakScoringSignals: string[];
  falseConfidencePatterns: string[];
  governanceThresholdEffectiveness: number;
}
