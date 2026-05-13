// Domain models — framework-agnostic entities shared across all modules.

export type { TestFile, TestSuite, FrameworkInfo, AdapterCapabilities } from './framework.js';
export type { Locator, LocatorStrategy, LocatorIndexEntry, LocatorIndex } from './locator.js';
export type { ExecutionTrace, TraceEvent, TraceSummary } from './trace.js';
export type { DomSnapshot, ElementSnapshot, DomDiff } from './snapshot.js';
export type { NavigationStep, NavigationSession, StepCommand } from './navigation.js';
export type { HealingProposal, HealingStrategy, HealingHistoryEntry, StrategyVerdict } from './healing.js';
export type { Patch, PatchFile, PatchStatus } from './patch.js';
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
export type { Result } from './result.js';
