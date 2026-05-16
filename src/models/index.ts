// Domain models — framework-agnostic entities shared across all modules.

export type { TestFile, TestSuite, FrameworkInfo, AdapterCapabilities } from './framework.js';
export type { Locator, LocatorStrategy, LocatorIndexEntry, LocatorIndex } from './locator.js';
export type { ExecutionTrace, TraceEvent, TraceSummary } from './trace.js';
export type { DomSnapshot, ElementSnapshot, DomDiff } from './snapshot.js';
export type { NavigationStep, NavigationSession, StepCommand } from './navigation.js';
export type { HealingProposal, HealingStrategy, HealingHistoryEntry, StrategyVerdict } from './healing.js';
export type { Patch, PatchFile, PatchStatus, PatchProposal, PatchReviewStatus, PatchDiff, PatchSummary, ASTNodeMetadata, ConfidenceMetadata, ValidationReference, AuditReference, RollbackMetadata } from './patch.js';
export { PATCH_SCHEMA_VERSION, PATCH_STORAGE_DIR } from './patch.js';
export type {
  ReplayStep,
  ReplaySession,
  ReplaySessionIndexEntry,
  CanonicalActionType,
  LocatorReference,
  NavigationContext,
  StepResult,
  SnapshotReference,
  InputPayload,
} from './replay.js';
export type {
  DomComparisonResult,
  StructuralChange,
  AttributeChange,
  LocatorSurvivabilityResult,
  SimilarityMetrics,
  NormalizedElement,
  SnapshotPair,
} from './dom-intelligence.js';
export type {
  HealingCandidate,
  CandidateRanking,
  CandidateExplanation,
  ChangeExplanation,
  DomEvidence,
  CandidateStrategy,
  HealingStrategyDefinition,
} from './healing-candidate.js';
export type {
  ValidationResult,
  ValidationStatus,
  FalsePositiveIndicator,
  ExecutionMetadata,
} from './validation.js';
export type {
  RuntimeValidationResult,
  RuntimeStatus,
  RuntimeEvidence,
  MatchedElement,
  TimingMetadata,
  BrowserMetadata,
  ReplayDivergence,
  RuntimeFalsePositiveIndicator,
  BrowserContextState,
  NavigationResult,
  InteractionResult,
} from './runtime.js';
export type {
  PipelineInput,
  PipelineResult,
  PipelineSummary,
  PipelineStatus,
  PipelineStage,
} from './pipeline.js';
export type {
  HealingExplanation,
  ConfidenceBreakdown,
  ExplanationEvidence,
} from './healing-explanation.js';
export type {
  AuditTrailEntry,
  AuditTrailSummary,
  RejectionDecision,
  StageTiming,
  StageOutput,
} from './audit-trail.js';
export type {
  StabilityReport,
  StabilityRunResult,
} from './stability.js';
export type {
  SandboxConfig,
  SandboxState,
  SandboxStatus,
  AppliedPatch,
  RollbackRecord,
  VerificationResult,
  StaticVerification,
  RuntimeVerification,
  StructuralVerification,
  MutationValidationResult,
  MutationReport,
  AppliedPatchInfo,
  CompileResult,
  ReplayResult,
  RuntimeResult,
  RollbackResult,
  ValidationSummary,
} from './sandbox.js';
export { SANDBOX_SCHEMA_VERSION, SANDBOX_STORAGE_DIR, MUTATION_REPORT_DIR } from './sandbox.js';
export type { Result } from './result.js';
