/**
 * Stabilization Module
 *
 * Executes full operational validation across the real repository corpus
 * and generates evidence-driven stabilization priorities.
 *
 * @module stabilization
 */

export { StabilizationAnalyzer } from './stabilization-analyzer.js';
export { ArchitectureAuditor } from './architecture-auditor.js';
export { SimplificationDetector } from './simplification-detector.js';
export { AlphaReadinessAssessor } from './alpha-readiness.js';

export type {
  StabilizationSummary,
  RiskPattern,
  HighestRiskPatterns,
  ReplayInstabilityHotspot,
  ReplayInstabilityReport,
  GovernanceWeakness,
  GovernanceWeaknessesReport,
  UnsupportedStructure,
  UnsupportedStructuresReport,
  ArchitecturalHotspot,
  ArchitecturalHotspotsReport,
  PerformanceBottleneckDetail,
  PerformanceBottlenecksReport,
  RecoveryQualityMetric,
  RecoveryQualityReport,
  FalseConfidenceIndicator,
  FalseConfidenceReport,
  SimplificationOpportunity,
  SimplificationOpportunitiesReport,
  ReadinessAssessment,
  ReadinessCategory,
  AlphaReadinessScore,
  StabilizationReport,
  StabilizationInput,
} from './types.js';
