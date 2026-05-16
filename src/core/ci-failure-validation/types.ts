/**
 * CI Failure Validation Types
 *
 * Models for validating the platform against real historical automation failures.
 * No autonomous healing - empirical validation only.
 */

export type FailureCategory =
  | 'selector-drift'
  | 'semantic-mismatch'
  | 'replay-instability'
  | 'async-timing-failure'
  | 'framework-abstraction-failure'
  | 'governance-ambiguity'
  | 'unsupported-structure'
  | 'deceptive-successful-replay';

export type FailureSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface HistoricalFailure {
  id: string;
  sourceRepository: string;
  testFile: string;
  testName: string;
  framework: string;
  originalSelector: string;
  failureReason: string;
  category: FailureCategory;
  severity: FailureSeverity;
  timestamp: number;
  ciRunId?: string;
  flakyHistory?: {
    failureCount: number;
    passCount: number;
    lastFlakyDate: number;
  };
  domSnapshot?: string;
  errorStackTrace?: string;
}

export interface FailureReplaySession {
  id: string;
  failureId: string;
  replayAttempts: number;
  reproducible: boolean;
  replayResults: ReplayAttempt[];
  timingMetrics: {
    minDuration: number;
    maxDuration: number;
    avgDuration: number;
    variance: number;
  };
  createdAt: number;
}

export interface ReplayAttempt {
  attempt: number;
  success: boolean;
  duration: number;
  matchedElementCount: number;
  falsePositiveIndicators: string[];
  navigationDrift: boolean;
  asyncInstability: boolean;
  modalIframeIssue: boolean;
  timestamp: number;
}

export interface RealFailureClassification {
  failureId: string;
  category: FailureCategory;
  severity: FailureSeverity;
  confidence: number;
  evidence: string[];
  isDeceptive: boolean;
  deceptiveIndicators: string[];
  replayStable: boolean;
  governanceAmbiguous: boolean;
  classificationTimestamp: number;
}

export interface RealFailureClassificationReport {
  id: string;
  totalFailures: number;
  classifications: RealFailureClassification[];
  categoryDistribution: Record<FailureCategory, number>;
  severityDistribution: Record<FailureSeverity, number>;
  deceptiveCount: number;
  governanceAmbiguousCount: number;
  summary: string;
  createdAt: number;
}

export interface HistoricalHealingValidation {
  failureId: string;
  healingAttempted: boolean;
  healingSuccessful: boolean;
  recoveryType: 'safe' | 'risky' | 'deceptive' | 'failed';
  replayDivergence: boolean;
  governanceRejected: boolean;
  rollbackAvailable: boolean;
  patchSurvivability: number;
  evidence: string[];
}

export interface HistoricalHealingValidationReport {
  id: string;
  totalFailures: number;
  validations: HistoricalHealingValidation[];
  recoveryRate: number;
  riskyRecoveryRate: number;
  replayDivergenceRate: number;
  governanceRejectionRate: number;
  rollbackReliability: number;
  patchSurvivabilityAvg: number;
  summary: string;
  createdAt: number;
}

export interface ReplayStabilityMetrics {
  failureId: string;
  flakyFrequency: number;
  reproducibilityScore: number;
  timingSensitivity: number;
  modalIframeInstability: number;
  asyncRenderingDivergence: number;
  navigationDriftDetected: boolean;
  replayAttempts: number;
  consistentResults: boolean;
}

export interface ReplayStabilityReport {
  id: string;
  totalFailures: number;
  metrics: ReplayStabilityMetrics[];
  overallFlakyRate: number;
  overallReproducibility: number;
  timingSensitiveCount: number;
  modalIframeUnstableCount: number;
  asyncDivergentCount: number;
  navigationDriftCount: number;
  summary: string;
  createdAt: number;
}

export interface TrustworthinessMetric {
  category: string;
  score: number;
  threshold: number;
  passed: boolean;
  evidence: string[];
}

export interface TrustworthinessBenchmarkReport {
  id: string;
  totalFailures: number;
  governanceTrustworthiness: number;
  confidenceReliability: number;
  deceptiveMutationDetectionRate: number;
  misleadingRecoveryDetectionRate: number;
  rollbackSafety: number;
  developerReviewSafety: number;
  metrics: TrustworthinessMetric[];
  summary: string;
  createdAt: number;
}

export interface FailureInventoryEntry {
  id: string;
  category: FailureCategory;
  pattern: string;
  frequency: number;
  severity: FailureSeverity;
  reproducible: boolean;
  supportedByPlatform: boolean;
  deceptiveStructure: boolean;
  governanceBlindSpot: boolean;
  evidence: string[];
}

export interface RealWorldFailureInventory {
  id: string;
  totalFailures: number;
  inventory: FailureInventoryEntry[];
  unsupportedPatterns: string[];
  unstableReplayBehaviors: string[];
  deceptiveRecoveryStructures: string[];
  governanceBlindSpots: string[];
  replayFalseConfidencePatterns: string[];
  healingInstabilityClusters: string[];
  summary: string;
  createdAt: number;
}

export interface CIFailureValidationConfig {
  failureCorpusPath?: string;
  replayAttempts: number;
  enableHealingValidation: boolean;
  enableStabilityAnalysis: boolean;
  enableTrustworthinessBenchmark: boolean;
}