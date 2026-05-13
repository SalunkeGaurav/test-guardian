// Domain models — framework-agnostic entities shared across all modules.

export type { TestFile, TestSuite, FrameworkInfo, AdapterCapabilities } from './framework.js';
export type { Locator, LocatorStrategy, LocatorIndexEntry, LocatorIndex } from './locator.js';
export type { ExecutionTrace, TraceEvent, TraceSummary } from './trace.js';
export type { DomSnapshot, ElementSnapshot, DomDiff } from './snapshot.js';
export type { NavigationStep, NavigationSession, StepCommand } from './navigation.js';
export type { HealingProposal, HealingStrategy, HealingHistoryEntry, StrategyVerdict } from './healing.js';
export type { Patch, PatchFile, PatchStatus } from './patch.js';
export type { Result } from './result.js';
