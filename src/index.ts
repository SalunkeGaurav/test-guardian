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
export type { Patch, PatchFile, PatchStatus } from './models/patch.js';
export type { Result } from './models/result.js';
export { success, failure } from './models/result.js';
