export type WorkflowStage = 
  | 'failure-detected'
  | 'proposal-generated'
  | 'governance-evaluated'
  | 'replay-evidence-shown'
  | 'mutation-reviewed'
  | 'approved'
  | 'rejected'
  | 'rolled-back';

export type DeveloperDecision = 'approve' | 'reject' | 'needs-more-info' | 'rollback';

export interface HealingReviewSession {
  id: string;
  repositoryId: string;
  locator: string;
  originalSelector: string;
  proposedSelector: string;
  failureReason: string;
  stages: WorkflowStageHistory[];
  currentStage: WorkflowStage;
  governanceAnalysis: GovernanceDecisionSummary;
  replayEvidence: ReplayEvidenceSummary;
  mutationDiff: MutationDiff;
  structuralRisk: StructuralRiskSummary;
  confidenceBreakdown: ConfidenceBreakdown;
  rollbackMetadata: RollbackMetadata;
  developerDecision: DeveloperDecision | null;
  decisionReason: string | null;
  reviewedAt: number | null;
}

export interface WorkflowStageHistory {
  stage: WorkflowStage;
  enteredAt: number;
  exitedAt: number | null;
  duration: number;
}

export interface GovernanceDecisionSummary {
  passed: boolean;
  rejected: boolean;
  reasons: string[];
  warnings: string[];
  riskyRecoveryIndicators: RiskyRecoveryIndicator[];
  confidenceScore: number;
}

export interface RiskyRecoveryIndicator {
  indicator: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface ReplayEvidenceSummary {
  validated: boolean;
  diverged: boolean;
  divergenceType: string | null;
  comparisonUrl: string | null;
  validationScore: number;
}

export interface MutationDiff {
  original: string;
  proposed: string;
  addedLines: number;
  removedLines: number;
  changedSelectors: number;
  strategy: string;
}

export interface StructuralRiskSummary {
  overallRisk: 'low' | 'medium' | 'high';
  chainedLocatorRisk: boolean;
  wrapperAbstractionRisk: boolean;
  dynamicSelectorRisk: boolean;
  repeatedSelectorRisk: boolean;
  oversizedPageObjectRisk: boolean;
  asyncFlowRisk: boolean;
}

export interface ConfidenceBreakdown {
  overall: number;
  replay: number;
  uniqueness: number;
  structural: number;
  validation: number;
  runtime: number;
}

export interface RollbackMetadata {
  available: boolean;
  backupId: string | null;
  rollbackCommand: string | null;
  lastValidState: string | null;
}

export interface ReviewErgonomicsReport {
  id: string;
  generatedAt: number;
  sessionCount: number;
  explanationClarity: ErgonomicsScore;
  governanceUnderstandability: ErgonomicsScore;
  mutationReadability: ErgonomicsScore;
  replayEvidenceUsefulness: ErgonomicsScore;
  rollbackConfidence: ErgonomicsScore;
  ambiguityVisibility: ErgonomicsScore;
  overallErgonomicsScore: number;
  improvementRecommendations: ErgonomicsRecommendation[];
}

export interface ErgonomicsScore {
  score: number;
  maxScore: number;
  rating: 'excellent' | 'good' | 'acceptable' | 'poor';
  breakdown: string[];
}

export interface ErgonomicsRecommendation {
  category: string;
  currentState: string;
  recommendedImprovement: string;
  impact: 'high' | 'medium' | 'low';
}

export interface GovernanceVisibilityReport {
  id: string;
  generatedAt: number;
  riskyRecoveryWarnings: GovernanceWarning[];
  replayDivergenceWarnings: GovernanceWarning[];
  structuralInstabilityWarnings: GovernanceWarning[];
  unsupportedPatternWarnings: GovernanceWarning[];
  confidenceUncertaintyIndicators: UncertaintyIndicator[];
  developerComprehensionRate: number;
}

export interface GovernanceWarning {
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  actionable: boolean;
  explanation: string;
}

export interface UncertaintyIndicator {
  indicator: string;
  uncertaintyLevel: number;
  affectedLocators: string[];
  recommendation: string;
}

export interface ApprovalWorkflowBenchmark {
  id: string;
  generatedAt: number;
  totalSessions: number;
  safeApprovalRate: number;
  riskyApprovalRate: number;
  rejectionPrecision: number;
  rollbackUsageFrequency: number;
  confidenceComprehensionEffectiveness: number;
  approvalTimeAverage: number;
  rejectionTimeAverage: number;
  decisionDistribution: Record<string, number>;
}

export interface ReviewPackage {
  id: string;
  sessionId: string;
  generatedAt: number;
  patchDiff: string;
  replayEvidence: ReplayEvidenceSummary;
  governanceAnalysis: GovernanceDecisionSummary;
  structuralRisk: StructuralRiskSummary;
  confidenceBreakdown: ConfidenceBreakdown;
  rollbackMetadata: RollbackMetadata;
  reviewInstructions: string[];
}

export interface DeveloperWorkflowOptions {
  corpusPath?: string;
  sessionCount?: number;
  verbose?: boolean;
}

export interface WorkflowSimulationResult {
  sessions: HealingReviewSession[];
  ergonomicsReport: ReviewErgonomicsReport;
  governanceVisibility: GovernanceVisibilityReport;
  approvalBenchmark: ApprovalWorkflowBenchmark;
  reviewPackages: ReviewPackage[];
}