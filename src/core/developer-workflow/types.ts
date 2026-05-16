/**
 * Developer Workflow Types
 *
 * Models for simulating developer healing workflows.
 * No autonomous healing - workflow simulation only.
 */

export type WorkflowStage =
  | 'failure-detected'
  | 'proposal-generated'
  | 'governance-evaluated'
  | 'replay-validated'
  | 'diff-reviewed'
  | 'approved'
  | 'rejected'
  | 'rollback-initiated';

export type DeveloperAction =
  | 'view-failure'
  | 'view-proposal'
  | 'view-governance'
  | 'view-replay'
  | 'view-diff'
  | 'approve'
  | 'reject'
  | 'request-more-info'
  | 'initiate-rollback';

export interface WorkflowAction {
  stage: WorkflowStage;
  action: DeveloperAction;
  timestamp: number;
  details: string;
}

export interface LocatorFailure {
  locatorId: string;
  expression: string;
  testName: string;
  testFile: string;
  errorMessage: string;
  stackTrace?: string;
  timestamp: number;
}

export interface HealingProposal {
  id: string;
  locatorId: string;
  originalExpression: string;
  proposedExpression: string;
  strategy: string;
  confidence: number;
  evidence: string[];
}

export interface GovernanceEvaluation {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
  confidenceScore: number;
  approvalRecommended: boolean;
  warnings: string[];
}

export interface ReplayValidationEvidence {
  sessionId: string;
  matched: boolean;
  matchedElementCount: number;
  falsePositiveIndicators: string[];
  timingInfo: {
    duration: number;
    timingVariance: number;
  };
}

export interface MutationDiff {
  originalCode: string;
  proposedCode: string;
  patchedCode?: string;
  targetFile: string;
  targetLine: number;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  originalStart: number;
  originalLines: string[];
  patchedStart: number;
  patchedLines: string[];
}

export interface RollbackMetadata {
  patchId: string;
  originalExpression: string;
  rollbackCode: string;
  canRollback: boolean;
  riskAssessment: string;
}

export interface HealingReviewSession {
  id: string;
  failure: LocatorFailure;
  proposal: HealingProposal;
  governance: GovernanceEvaluation;
  governanceAnalysis?: GovernanceEvaluation;
  replayEvidence: ReplayValidationEvidence[];
  diff: MutationDiff;
  rollback: RollbackMetadata;
  rollbackMetadata?: RollbackMetadata;
  actions: WorkflowAction[];
  currentStage: WorkflowStage;
  finalDecision?: 'approved' | 'rejected';
  developerDecision?: DeveloperDecision;
  decisionRationale?: string;
  createdAt: number;
  completedAt?: number;
  originalSelector?: string;
  proposedSelector?: string;
  structuralRisk?: string[];
  confidenceBreakdown?: Record<string, number>;
  stages?: WorkflowStageHistory[];
  locator?: string;
}

export interface ReviewErgonomicsMetrics {
  explanationClarity: number;
  governanceUnderstandability: number;
  mutationReadability: number;
  replayEvidenceUsefulness: number;
  rollbackConfidence: number;
  ambiguityVisibility: number;
}

export interface ReviewErgonomicsReport {
  id: string;
  sessionCount: number;
  metrics: ReviewErgonomicsMetrics;
  score?: number;
  overallErgonomicsScore?: number;
  ergonomicsReport?: ErgonomicsScore;
  summary: string;
  recommendations: string[];
  recommendationsList?: ErgonomicsRecommendation[];
  generatedAt?: number;
  createdAt: number;
}

export type GovernanceWarningType =
  | 'risky-recovery'
  | 'replay-divergence'
  | 'structural-instability'
  | 'unsupported-pattern'
  | 'confidence-uncertainty';

export interface GovernanceWarning {
  type: GovernanceWarningType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  evidence: string[];
}

export interface GovernanceVisibilityReport {
  id: string;
  sessionCount: number;
  warnings: {
    riskyRecovery: number;
    replayDivergence: number;
    structuralInstability: number;
    unsupportedPattern: number;
    confidenceUncertainty: number;
  };
  warningPresentation: string[];
  developerComprehensionScore: number;
  governanceVisibility?: GovernanceWarning[];
  generatedAt?: number;
  createdAt: number;
}

export interface ApprovalWorkflowMetrics {
  totalSessions: number;
  safeApprovalCount: number;
  riskyApprovalCount: number;
  rejectionCount: number;
  rollbackCount: number;
  confidenceComprehensionEffectiveness: number;
}

export interface ApprovalWorkflowBenchmark {
  id: string;
  safeApprovalRate: number;
  riskyApprovalRate: number;
  rejectionPrecision: number;
  rollbackUsageRate: number;
  confidenceComprehensionRate: number;
  metrics: ApprovalWorkflowMetrics;
  recommendation: string;
  createdAt: number;
}

export interface ReviewPackage {
  id: string;
  sessionId: string;
  failureSummary: string;
  patchDiff: MutationDiff;
  governanceAnalysis: GovernanceEvaluation;
  structuralRisk: string[];
  confidenceBreakdown: Record<string, number>;
  rollbackMetadata: RollbackMetadata;
  createdAt: number;
}

export interface DeveloperWorkflowConfig {
  sessionCount: number;
  approvalThreshold: number;
  rejectionThreshold: number;
  enableRollbackSimulation: boolean;
}

export interface WorkflowStageHistory {
  stage: WorkflowStage;
  timestamp: number;
  details: string;
}

export interface GovernanceDecisionSummary {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidenceScore: number;
  recommendation: string;
  warnings: string[];
}

export interface ReplayEvidenceSummary {
  sessionId: string;
  matched: boolean;
  matchedElementCount: number;
  diverged?: boolean;
  divergenceType?: string;
}

export interface StructuralRiskSummary {
  hasChainedLocator: boolean;
  hasDynamicSelector: boolean;
  hasDuplicatePattern: boolean;
  riskScore: number;
}

export interface ConfidenceBreakdown {
  proposalConfidence: number;
  governanceScore: number;
  replaySuccessRate: number;
  riskPenalty: number;
  overallConfidence: number;
}

export interface DeveloperWorkflowOptions {
  sessions?: number;
  sessionCount?: number;
  approvalThreshold?: number;
  rejectionThreshold?: number;
  enableRollbackSimulation?: boolean;
  enableRollback?: boolean;
  outputPath?: string;
  sessionId?: string;
  verbose?: boolean;
}

export interface WorkflowSimulationResult {
  sessions: HealingReviewSession[];
  ergonomics: ReviewErgonomicsReport;
  visibility: GovernanceVisibilityReport;
  benchmark: ApprovalWorkflowBenchmark;
}

export interface ErgonomicsScore {
  explanationClarity: number;
  governanceUnderstandability: number;
  mutationReadability: number;
  replayEvidenceUsefulness: number;
  rollbackConfidence: number;
  ambiguityVisibility: number;
}

export interface ErgonomicsRecommendation {
  area: string;
  recommendation: string;
  priority: 'low' | 'medium' | 'high';
}

export interface UncertaintyIndicator {
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export type DeveloperDecision = 'approved' | 'rejected' | 'rolled-back' | 'mutation-reviewed' | 'needs-more-info';