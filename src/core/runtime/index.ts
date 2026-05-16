/**
 * Deterministic Browser Replay Runtime Module
 *
 * Provides browser-based replay execution and healing proposal validation.
 *
 * Architecture:
 *   ReplayRuntime         — Main entry point (validates proposals via replay)
 *   ReplayCoordinator     — Orchestrates step-by-step replay execution
 *   StepExecutor          — Executes individual browser actions
 *   SessionManager        — Manages browser lifecycle and context isolation
 *   EvidenceCollector     — Captures runtime evidence per step
 *   DivergenceDetector    — Detects unexpected changes during replay
 *   RuntimeFalsePositiveDetector — Validates matched elements at runtime
 *   RuntimePersister      — Persists validation results to disk
 *
 * This module is browser-aware but framework-agnostic at the core layer.
 * Actual browser automation is abstracted via the BrowserEngine interface.
 *
 * No patches. No AI. No autonomous healing.
 */

export { ReplayRuntime } from './engine.js';
export { RuntimePersister } from './persister.js';
export { ReplayCoordinator } from './replay-coordinator.js';
export { StepExecutor } from './step-executor.js';
export { SessionManager } from './session-manager.js';
export { EvidenceCollector } from './evidence-collector.js';
export { DivergenceDetector } from './divergence.js';
export { RuntimeFalsePositiveDetector } from './false-positive.js';
export type { BrowserEngine } from './browser.js';
export { RUNTIME_SCHEMA_VERSION, RUNTIME_STORAGE_DIR } from './schema.js';
