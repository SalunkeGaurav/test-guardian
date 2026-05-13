// Interface contracts — strict boundaries between modules.
// These are the ONLY types that cross module boundaries.
// Internal domain models live in src/models/ and are consumed via these interfaces.

export type { FrameworkAdapter, AdapterHooks } from './framework.js';
export type { LocatorIndexProvider } from './locator.js';
export type { TraceProvider } from './execution.js';
export type { HealingStrategyProvider } from './healing.js';
export type { StorageProvider } from './storage.js';
export type { PatchProvider } from './patch.js';
export type { DomAnalyzer } from './dom.js';
export type { ReplayEngine } from './replay.js';
