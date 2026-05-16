/**
 * Runtime Hardening Module
 *
 * Real browser runtime hardening for stability under unstable conditions:
 *   DOM settling, navigation sync, async render detection,
 *   stale context recovery, iframe/modal stability, replay drift.
 *
 * @module runtime-hardening
 */

export { RuntimeStabilityEngine } from './runtime-stability-engine.js';
export { DomSettlingDetector } from './dom-settling.js';
export { NavigationSynchronizer } from './navigation-synchronizer.js';
export { AsyncRenderDetector } from './async-render-detector.js';
export { StaleContextRecovery } from './stale-context-recovery.js';
export { IframeModalHandler } from './iframe-modal-handler.js';
export { ReplayDriftDetector } from './replay-drift-detector.js';

export type {
  DomStabilityStatus,
  DomSnapshotDiff,
  DomSettlingReport,
  NavigationReadiness,
  NavigationTransition,
  NavigationSyncReport,
  AsyncRenderType,
  AsyncRenderObservation,
  AsyncRenderReport,
  StaleContextType,
  StaleContextEvent,
  StaleContextRecoveryReport,
  FrameStabilityEntry,
  ModalStabilityEntry,
  FrameModalStabilityReport,
  DriftType,
  ReplayDriftEvent,
  ReplayDriftReport,
  RuntimeStabilityMetrics,
  RuntimeHardeningInput,
  RuntimeHardeningResult,
} from './types.js';
