/**
 * Public API Module
 *
 * Provides stable, well-documented exports for external consumers.
 * Clear separation between:
 * - Public API (stable, semver-guaranteed)
 * - Internal Runtime (subject to change)
 * - Experimental APIs (unstable, may be removed)
 *
 * @module public-api
 */

// ============================================================================
// Public API - Stable Exports
// These exports are guaranteed to be stable across minor versions.
// ============================================================================

// Core interfaces
export {
  FrameworkAdapter,
  AdapterHooks,
  LocatorIndexProvider,
  TraceProvider,
  HealingStrategyProvider,
  StorageProvider,
  PatchProvider,
  DomAnalyzer,
  ReplayEngine,
} from '../interfaces/index.js';

// Domain models
export {
  // Framework
  TestFile,
  TestSuite,
  FrameworkInfo,
  AdapterCapabilities,
} from '../models/framework.js';

export {
  // Locator
  Locator,
  LocatorStrategy,
  LocatorIndexEntry,
  LocatorIndex,
} from '../models/locator.js';

export {
  // Trace
  ExecutionTrace,
  TraceEvent,
  TraceSummary,
  TraceEventType,
} from '../models/trace.js';

export {
  // DOM
  DomSnapshot,
  ElementSnapshot,
  ElementNode,
  DomDiff,
} from '../models/snapshot.js';

export {
  // Navigation
  NavigationStep,
  NavigationSession,
  StepCommand,
} from '../models/navigation.js';

export {
  // Healing
  HealingProposal,
  HealingStrategy,
  HealingHistoryEntry,
  StrategyVerdict,
} from '../models/healing.js';

export {
  // Patch
  Patch,
  PatchFile,
  PatchStatus,
  PatchProposal,
  PatchReviewStatus,
  PatchDiff,
  PatchSummary,
  ASTNodeMetadata,
  ConfidenceMetadata,
  ValidationReference,
  AuditReference,
  RollbackMetadata,
  PATCH_SCHEMA_VERSION,
  PATCH_STORAGE_DIR,
} from '../models/patch.js';

export {
  // Replay
  ReplayStep,
  ReplaySession,
  ReplaySessionIndexEntry,
  CanonicalActionType,
  LocatorReference,
  NavigationContext,
  StepResult,
  SnapshotReference,
  InputPayload,
} from '../models/replay.js';

export {
  // DOM Intelligence
  DomComparisonResult,
  StructuralChange,
  AttributeChange,
  LocatorSurvivabilityResult,
  SimilarityMetrics,
  NormalizedElement,
  SnapshotPair,
} from '../models/dom-intelligence.js';

export {
  // Healing Candidate
  HealingCandidate,
  CandidateRanking,
  CandidateExplanation,
  ChangeExplanation,
  DomEvidence,
  CandidateStrategy,
  HealingStrategyDefinition,
} from '../models/healing-candidate.js';

export {
  // Validation
  ValidationResult,
  ValidationStatus,
  FalsePositiveIndicator,
  ExecutionMetadata,
} from '../models/validation.js';

export {
  // Runtime
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
} from '../models/runtime.js';

export {
  // Pipeline
  PipelineInput,
  PipelineResult,
  PipelineSummary,
  PipelineStatus,
  PipelineStage,
} from '../models/pipeline.js';

export {
  // Explanation
  HealingExplanation,
  ConfidenceBreakdown,
  ExplanationEvidence,
} from '../models/healing-explanation.js';

export {
  // Audit
  AuditTrailEntry,
  AuditTrailSummary,
  RejectionDecision,
  StageTiming,
  StageOutput,
} from '../models/audit-trail.js';

export {
  // Stability
  StabilityReport,
  StabilityRunResult,
} from '../models/stability.js';

export {
  // Result
  Result,
  success,
  failure,
} from '../models/result.js';

// Core classes
export { HealingPipeline } from '../core/pipeline/index.js';
export { ExplainabilityEngine, ConfidenceGovernance, StabilityAnalyzer, AuditPersister } from '../core/pipeline/index.js';
export { GovernanceConfig, GovernanceResult, GateResult } from '../core/pipeline/index.js';
export { PatchGenerator, PatchDiffEngine, PatchSafetyValidator, PatchStorage } from '../core/patcher/index.js';
export { PatchGeneratorInput, LocatorAstMatch } from '../core/patcher/index.js';
export { SafetyGateResult, SafetyValidationInput, SafetyValidationOutput } from '../core/patcher/index.js';

// ============================================================================
// Internal Runtime - Not guaranteed stable
// These exports are for internal use and may change without notice.
// ============================================================================

/** @internal */
export const internal = {
  // Re-exported for internal tooling only
  UnifiedRuntime: () => import('../core/unified-runtime/index.js'),
  RepositoryValidator: () => import('../core/repository-validator/index.js'),
  RuntimeHardening: () => import('../core/runtime-hardening/index.js'),
  RuntimeHealingLoop: () => import('../core/runtime-healing-loop/index.js'),
  ExecutionLab: () => import('../core/execution-lab/index.js'),
  OperationalReliability: () => import('../core/operational-reliability/index.js'),
  LargeScaleCorpus: () => import('../core/large-scale-corpus/index.js'),
  Stabilization: () => import('../core/stabilization/index.js'),
  ProductionReadiness: () => import('../core/production-readiness/index.js'),
  DeveloperReview: () => import('../core/developer-review/index.js'),
} as const;

// ============================================================================
// Experimental APIs - Unstable, may be removed
// These exports are experimental and not covered by semver guarantees.
// ============================================================================

/** @experimental */
export const experimental = {
  ConfidenceCalibration: () => import('../core/confidence-calibration/index.js'),
  HealingBenchmark: () => import('../core/healing-benchmark/index.js'),
  HealingIntelligence: () => import('../core/healing-intelligence/index.js'),
  PatternIntelligence: () => import('../core/pattern-intelligence/index.js'),
  AdversarialTester: () => import('../core/adversarial-tester/index.js'),
  CorpusExecution: () => import('../core/corpus-execution/index.js'),
  DeveloperWorkflow: () => import('../core/developer-workflow/index.js'),
  CIFailureValidation: () => import('../core/ci-failure-validation/index.js'),
  ArchitectureCohesionAudit: () => import('../core/architecture-cohesion-audit/index.js'),
  RiskDiscrimination: () => import('../core/risk-discrimination/index.js'),
} as const;
