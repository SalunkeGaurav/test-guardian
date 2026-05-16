/**
 * Risk Discrimination Engine Types
 *
 * Models for detecting and classifying risky mutations and deceptive recoveries.
 * No autonomous governance - recommendations only.
 */

export type MutationDeceptionPattern =
  | 'structurally-similar-wrong-target'
  | 'duplicated-selector-collision'
  | 'replay-consistent-semantically-incorrect'
  | 'dynamic-selector-drift'
  | 'hidden-navigation-divergence'
  | 'async-timing-deception'
  | 'wrapper-abstraction-masking';

export interface DeceptiveMutationEvidence {
  pattern: MutationDeceptionPattern;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  originalLocator: string;
  proposedLocator: string;
  similarityScore: number;
  structuralEvidence: string[];
  navigationEvidence?: string[];
  timingEvidence?: string[];
}

export interface DeceptiveMutationReport {
  id: string;
  candidateId: string;
  locatorId: string;
  isDeceptive: boolean;
  deceptionPatterns: MutationDeceptionPattern[];
  evidence: DeceptiveMutationEvidence[];
  overallDeceptionScore: number;
  recommendation: 'approve' | 'reject' | 'review-manually' | 'escalate';
  createdAt: number;
}

export interface ReplayTrustIndicator {
  type: string;
  reliability: number;
  detail: string;
}

export interface ReplayTrustworthinessReport {
  id: string;
  candidateId: string;
  replaySessionId: string;
  overallTrustScore: number;
  isTrustworthy: boolean;
  indicators: ReplayTrustIndicator[];
  falseConfidencePatterns: string[];
  timingRisk: number;
  modalIframeInstability: number;
  asyncMaskingRisk: number;
  recommendation: 'trust' | 'distrust' | 'verify-additionally';
  createdAt: number;
}

export interface GovernanceBlindSpot {
  type: string;
  description: string;
  affectedCandidates: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  missingChecks: string[];
  suggestedImprovements: string[];
}

export interface GovernanceBlindSpotReport {
  id: string;
  analysisTimestamp: number;
  riskyMutationsPassingGovernance: string[];
  lowConfidenceStableAppearingMutations: string[];
  structurallyWeakApprovals: string[];
  insufficientPenaltyWeighting: string[];
  ambiguityUnderDetection: GovernanceBlindSpot[];
  summary: string;
  recommendation: 'approve-all' | 'reject-all' | 'selective-review' | 'threshold-adjustment';
  createdAt: number;
}

export type RiskEscalationCategory =
  | 'chained-locator-depth'
  | 'dynamic-selector-presence'
  | 'duplicate-selector-density'
  | 'oversized-page-object'
  | 'async-heavy-flow'
  | 'bdd-abstraction-layers';

export interface RiskEscalationRecommendation {
  category: RiskEscalationCategory;
  currentValue: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
  confidence: number;
}

export interface RiskSimulationConfig {
  replayPenaltyMultiplier: number;
  structuralInstabilityAmplifier: number;
  ambiguityPenaltyMultiplier: number;
  dynamicSelectorRiskMultiplier: number;
  duplicateSelectorPenaltyMultiplier: number;
}

export interface RiskSimulationReport {
  id: string;
  baselineRiskyApprovalRate: number;
  projectedRiskyApprovalRate: number;
  baselineRejectionPrecision: number;
  projectedRejectionPrecision: number;
  baselineRecoveryRate: number;
  projectedRecoveryRate: number;
  simulationConfig: RiskSimulationConfig;
  appliedPenalties: string[];
  estimatedImprovements: {
    riskyApprovalReduction: number;
    rejectionPrecisionImprovement: number;
    recoveryRateImpact: number;
  };
  createdAt: number;
}

export type MutationSafetyLevel =
  | 'safe'
  | 'conditionally-safe'
  | 'structurally-risky'
  | 'replay-risky'
  | 'governance-ambiguous'
  | 'unsafe';

export interface MutationSafetyClassification {
  id: string;
  candidateId: string;
  safetyLevel: MutationSafetyLevel;
  confidence: number;
  evidence: string[];
  riskFactors: string[];
  supportingAnalysis: {
    deceptiveAnalysisRef?: string;
    replayTrustRef?: string;
    governanceBlindSpotRef?: string;
    escalationRef?: string;
  };
  createdAt: number;
}

export interface RiskDiscriminationAnalysis {
  deceptiveMutationReport?: DeceptiveMutationReport;
  replayTrustworthinessReport?: ReplayTrustworthinessReport;
  governanceBlindSpotReport?: GovernanceBlindSpotReport;
  escalationRecommendations: RiskEscalationRecommendation[];
  safetyClassification: MutationSafetyClassification;
  createdAt: number;
}