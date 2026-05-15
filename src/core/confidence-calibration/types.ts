export interface ConfidenceCalibrationReport {
  id: string;
  generatedAt: number;
  sourceCorpusPath: string;
  analysisResults: ConfidenceReliabilityReport;
  governanceAnalysis: GovernanceHardeningReport;
  structuralCorrelation: StructuralConfidenceCorrelationReport;
  recalibrationRecommendations: RecalibrationRecommendation[];
  simulationResults: CalibrationSimulationReport;
}

export interface ConfidenceReliabilityReport {
  byLocatorStrategy: LocatorStrategyAccuracy[];
  byRepositoryType: RepositoryTypeAccuracy[];
  byReplayComplexity: ComplexityAccuracy[];
  byMutationCategory: MutationCategoryAccuracy[];
  byStructuralRiskLevel: RiskLevelAccuracy[];
  overallAccuracyMetrics: OverallAccuracyMetrics;
}

export interface LocatorStrategyAccuracy {
  strategy: string;
  sampleSize: number;
  predictedAccuracy: number;
  actualAccuracy: number;
  calibrationError: number;
  overconfident: boolean;
  underconfident: boolean;
}

export interface RepositoryTypeAccuracy {
  type: string;
  sampleSize: number;
  averageConfidence: number;
  actualSuccessRate: number;
  calibrationError: number;
}

export interface ComplexityAccuracy {
  complexity: 'simple' | 'moderate' | 'complex';
  sampleSize: number;
  averageConfidence: number;
  actualAccuracy: number;
  calibrationError: number;
}

export interface MutationCategoryAccuracy {
  category: string;
  sampleSize: number;
  averageConfidence: number;
  actualRecoveryRate: number;
  calibrationError: number;
}

export interface RiskLevelAccuracy {
  riskLevel: 'low' | 'medium' | 'high';
  sampleSize: number;
  averageConfidence: number;
  actualAccuracy: number;
  calibrationError: number;
}

export interface OverallAccuracyMetrics {
  meanCalibrationError: number;
  calibrationSlope: number;
  calibrationIntercept: number;
  brierScore: number;
  reliabilityDiagramBuckets: number[];
}

export interface GovernanceHardeningReport {
  currentThresholds: GovernanceThresholds;
  falseAcceptanceRate: number;
  falseRejectionRate: number;
  riskyAcceptancePatterns: RiskyAcceptancePattern[];
  replayInstabilityAcceptancePatterns: string[];
  thresholdSensitivityCurves: ThresholdSensitivityCurve[];
  hardeningRecommendations: GovernanceHardeningRecommendation[];
}

export interface GovernanceThresholds {
  minConfidence: number;
  maxRiskyRecovery: number;
  maxGovernanceRejection: number;
  structuralChangeTolerance: number;
}

export interface RiskyAcceptancePattern {
  pattern: string;
  acceptedCount: number;
  actualFailureCount: number;
  falseAcceptanceRate: number;
}

export interface ThresholdSensitivityCurve {
  threshold: number;
  truePositiveRate: number;
  falsePositiveRate: number;
  f1Score: number;
  recommended: boolean;
}

export interface GovernanceHardeningRecommendation {
  recommendation: string;
  currentValue: number;
  recommendedValue: number;
  expectedImpact: string;
}

export interface StructuralConfidenceCorrelationReport {
  chainedLocatorCorrelation: number;
  wrapperAbstractionCorrelation: number;
  dynamicSelectorCorrelation: number;
  repeatedSelectorCorrelation: number;
  oversizedPageObjectCorrelation: number;
  asyncFlowCorrelation: number;
  bddAbstractionCorrelation: number;
  significantPatterns: SignificantPattern[];
}

export interface SignificantPattern {
  pattern: string;
  correlationWithConfidenceFailure: number;
  occurrenceCount: number;
  severity: 'low' | 'medium' | 'high';
}

export interface RecalibrationRecommendation {
  weightType: 'replay' | 'uniqueness' | 'structural' | 'validation' | 'runtime';
  currentWeight: number;
  recommendedWeight: number;
  rationale: string;
  expectedImprovement: number;
}

export interface CalibrationSimulationReport {
  simulationName: string;
  parameters: SimulationParameters;
  results: SimulationResults;
}

export interface SimulationParameters {
  strictnessAdjustment: number;
  replayWeightAdjustment: number;
  uniquenessWeightAdjustment: number;
  structuralPenaltyAdjustment: number;
  confidenceThresholdAdjustment: number;
}

export interface SimulationResults {
  projectedFalsePositiveReduction: number;
  projectedRiskyRecoveryReduction: number;
  projectedRecoveryLoss: number;
  projectedOverallAccuracy: number;
  affectedLocatorStrategies: string[];
  affectedRepositoryTypes: string[];
}

export interface ConfidenceCalibrationOptions {
  corpusPath?: string;
  verbose?: boolean;
}

export interface CalibrationInput {
  healingOutcomes: HealingOutcome[];
  confidenceScores: ConfidenceScore[];
  governanceDecisions: GovernanceDecision[];
}

export interface HealingOutcome {
  locator: string;
  repositoryId: string;
  attempted: boolean;
  succeeded: boolean;
  isRisky: boolean;
  isFalsePositive: boolean;
}

export interface ConfidenceScore {
  locator: string;
  overallConfidence: number;
  replayConfidence: number;
  uniquenessConfidence: number;
  structuralConfidence: number;
  validationConfidence: number;
  runtimeConfidence: number;
}

export interface GovernanceDecision {
  locator: string;
  accepted: boolean;
  rejected: boolean;
  reason: string;
}