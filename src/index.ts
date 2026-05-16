// TestGuardian — Public API surface
// Re-exports core types and interfaces for programmatic use.
// No business logic — only type contracts and empty stubs.

// Interfaces (cross-module contracts)
export type { FrameworkAdapter, AdapterHooks } from './interfaces/framework.js';
export type { LocatorIndexProvider } from './interfaces/locator.js';
export type { TraceProvider } from './interfaces/execution.js';
export type { HealingStrategyProvider } from './interfaces/healing.js';
export type { StorageProvider } from './interfaces/storage.js';
export type { PatchProvider } from './interfaces/patch.js';
export type { DomAnalyzer } from './interfaces/dom.js';
export type { ReplayEngine } from './interfaces/replay.js';

// Domain models
export type {
  TestFile, TestSuite, FrameworkInfo, AdapterCapabilities,
} from './models/framework.js';
export type {
  Locator, LocatorStrategy, LocatorIndexEntry, LocatorIndex,
} from './models/locator.js';
export type {
  ExecutionTrace, TraceEvent, TraceSummary, TraceEventType,
} from './models/trace.js';
export type {
  DomSnapshot, ElementSnapshot, ElementNode, DomDiff,
} from './models/snapshot.js';
export type {
  NavigationStep, NavigationSession, StepCommand,
} from './models/navigation.js';
export type {
  HealingProposal, HealingStrategy, HealingHistoryEntry, StrategyVerdict,
} from './models/healing.js';
export type { Patch, PatchFile, PatchStatus, PatchProposal, PatchReviewStatus, PatchDiff, PatchSummary, ASTNodeMetadata, ConfidenceMetadata, ValidationReference, AuditReference, RollbackMetadata } from './models/patch.js';
export { PATCH_SCHEMA_VERSION, PATCH_STORAGE_DIR } from './models/patch.js';
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
} from './models/replay.js';
export type {
  DomComparisonResult,
  StructuralChange,
  AttributeChange,
  LocatorSurvivabilityResult,
  SimilarityMetrics,
  NormalizedElement,
  SnapshotPair,
} from './models/dom-intelligence.js';
export type {
  HealingCandidate,
  CandidateRanking,
  CandidateExplanation,
  ChangeExplanation,
  DomEvidence,
  CandidateStrategy,
  HealingStrategyDefinition,
} from './models/healing-candidate.js';
export type {
  ValidationResult,
  ValidationStatus,
  FalsePositiveIndicator,
  ExecutionMetadata,
} from './models/validation.js';
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
} from './models/runtime.js';
export type {
  PipelineInput,
  PipelineResult,
  PipelineSummary,
  PipelineStatus,
  PipelineStage,
} from './models/pipeline.js';
export type {
  HealingExplanation,
  ConfidenceBreakdown,
  ExplanationEvidence,
} from './models/healing-explanation.js';
export type {
  AuditTrailEntry,
  AuditTrailSummary,
  RejectionDecision,
  StageTiming,
  StageOutput,
} from './models/audit-trail.js';
export type {
  StabilityReport,
  StabilityRunResult,
} from './models/stability.js';
export type { Result } from './models/result.js';
export { success, failure } from './models/result.js';
export { HealingPipeline } from './core/pipeline/healing-pipeline.js';
export { ExplainabilityEngine, ConfidenceGovernance, StabilityAnalyzer, AuditPersister } from './core/pipeline/index.js';
export type { GovernanceConfig, GovernanceResult, GateResult } from './core/pipeline/confidence-governance.js';

// Patch Generation
export { PatchGenerator, PatchDiffEngine, PatchSafetyValidator, PatchStorage } from './core/patcher/index.js';
export type { PatchGeneratorInput, LocatorAstMatch } from './core/patcher/patch-generator.js';
export type { SafetyGateResult, SafetyValidationInput, SafetyValidationOutput } from './core/patcher/patch-safety-validator.js';
