/**
 * Runtime Hardening types.
 *
 * Captures contracts for real browser runtime hardening:
 *   DOM settling, navigation sync, async render detection,
 *   stale context recovery, iframe/modal stability, replay drift.
 *
 * No AI. No autonomous behavior. Deterministic analysis.
 */

import type { Result } from '../../models/result.js';
import type { ElementNode } from '../../models/snapshot.js';
import type { ReplaySession, ReplayStep } from '../../models/replay.js';
import type { ReplayDivergence } from '../../models/runtime.js';

// ─── DOM Settling ──────────────────────────────────────────────────

export type DomStabilityStatus = 'stable' | 'unstable' | 'mutating' | 'render-loop';

export interface DomSnapshotDiff {
  addedNodes: number;
  removedNodes: number;
  changedAttributes: number;
  changedText: number;
  totalMutations: number;
}

export interface DomSettlingReport {
  sessionId: string;
  status: DomStabilityStatus;
  snapshotSequence: DomSnapshotDiff[];
  stabilizationCheckCount: number;
  mutationCountStabilized: boolean;
  layoutStabilized: boolean;
  renderLoopDetected: boolean;
  continuouslyMutatingContainers: string[];
  hydrationInstabilityDetected: boolean;
  settledAt: number;
}

// ─── Navigation Synchronization ────────────────────────────────────

export type NavigationReadiness = 'ready' | 'pending' | 'redirecting' | 'stale' | 'failed';

export interface NavigationTransition {
  fromUrl: string;
  toUrl: string;
  transitionType: 'hard' | 'spa' | 'soft' | 'redirect' | 'history';
  urlUpdated: boolean;
  historyStateValid: boolean;
  documentReady: boolean;
}

export interface NavigationSyncReport {
  sessionId: string;
  transitions: NavigationTransition[];
  readiness: NavigationReadiness;
  pendingRedirects: number;
  staleHistoryStates: number;
  softNavigations: number;
  blockedByUnreadiness: boolean;
  syncedAt: number;
}

// ─── Async Render Detection ────────────────────────────────────────

export type AsyncRenderType =
  | 'lazy-load'
  | 'virtualized-list'
  | 'skeleton-replacement'
  | 'deferred-component'
  | 're-render-churn'
  | 'hydration';

export interface AsyncRenderObservation {
  type: AsyncRenderType;
  containerPath: string;
  initialElementCount: number;
  finalElementCount: number;
  renderCycles: number;
  completed: boolean;
}

export interface AsyncRenderReport {
  sessionId: string;
  observations: AsyncRenderObservation[];
  totalAsyncRenders: number;
  completedRenders: number;
  incompleteRenders: number;
  reRenderChurnDetected: boolean;
  skeletonReplacements: number;
  virtualizedListInstability: number;
  detectedAt: number;
}

// ─── Stale Context Recovery ────────────────────────────────────────

export type StaleContextType =
  | 'detached-node'
  | 'stale-element-ref'
  | 'invalid-execution-context'
  | 'navigation-invalidated';

export interface StaleContextEvent {
  type: StaleContextType;
  locatorExpression: string;
  stepIndex: number;
  recoverable: boolean;
  recoveryAttempted: boolean;
  recoverySuccess: boolean;
  reResolutionPath?: string;
}

export interface StaleContextRecoveryReport {
  sessionId: string;
  events: StaleContextEvent[];
  totalStaleEvents: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  recoveryRate: number;
  recoveredAt: number;
}

// ─── iframe + Modal Stability ──────────────────────────────────────

export interface FrameStabilityEntry {
  frameId: string;
  parentFrameId?: string;
  depth: number;
  loaded: boolean;
  navigated: boolean;
  detached: boolean;
  reattached: boolean;
}

export interface ModalStabilityEntry {
  modalId: string;
  opened: boolean;
  closed: boolean;
  focusTrapActive: boolean;
  overlayInterception: boolean;
  dynamicMounting: boolean;
}

export interface FrameModalStabilityReport {
  sessionId: string;
  frames: FrameStabilityEntry[];
  modals: ModalStabilityEntry[];
  nestedFrameCount: number;
  modalTransitionCount: number;
  focusTrapViolations: number;
  overlayInterceptions: number;
  stabilityPassed: boolean;
  detectedAt: number;
}

// ─── Replay Drift Detection ────────────────────────────────────────

export type DriftType =
  | 'navigation-divergence'
  | 'selector-drift'
  | 'timing-instability'
  | 'action-sequence-divergence'
  | 'nondeterministic-replay';

export interface ReplayDriftEvent {
  type: DriftType;
  stepIndex: number;
  expected: string;
  actual: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ReplayDriftReport {
  sessionId: string;
  events: ReplayDriftEvent[];
  totalDriftEvents: number;
  navigationDivergences: number;
  selectorDriftCount: number;
  timingInstabilityCount: number;
  actionSequenceDivergences: number;
  nondeterministicReplays: number;
  driftSeverity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  replayDeterministic: boolean;
  detectedAt: number;
}

// ─── Runtime Stability Metrics ─────────────────────────────────────

export interface RuntimeStabilityMetrics {
  domStabilizationSuccessRate: number;
  replayRecoverySuccess: number;
  staleRecoverySuccess: number;
  iframeRecoveryRate: number;
  asyncRenderInstabilityFrequency: number;
  replayDriftFrequency: number;
  totalSessionsAnalyzed: number;
  stableSessions: number;
  unstableSessions: number;
}

// ─── Hardening Input / Result ──────────────────────────────────────

export interface RuntimeHardeningInput {
  session: ReplaySession;
  domSnapshots: ElementNode[];
  projectRoot: string;
}

export interface RuntimeHardeningResult {
  sessionId: string;
  domSettling: DomSettlingReport;
  navigationSync: NavigationSyncReport;
  asyncRender: AsyncRenderReport;
  staleContext: StaleContextRecoveryReport;
  frameModal: FrameModalStabilityReport;
  replayDrift: ReplayDriftReport;
  metrics: RuntimeStabilityMetrics;
  overallStable: boolean;
  persistedPaths: string[];
}
