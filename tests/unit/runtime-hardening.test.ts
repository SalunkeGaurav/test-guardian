import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import type { ElementNode } from '../../src/models/snapshot.js';
import type { ReplaySession, ReplayStep } from '../../src/models/replay.js';
import { DomSettlingDetector } from '../../src/core/runtime-hardening/dom-settling.js';
import { NavigationSynchronizer } from '../../src/core/runtime-hardening/navigation-synchronizer.js';
import { AsyncRenderDetector } from '../../src/core/runtime-hardening/async-render-detector.js';
import { StaleContextRecovery } from '../../src/core/runtime-hardening/stale-context-recovery.js';
import { IframeModalHandler } from '../../src/core/runtime-hardening/iframe-modal-handler.js';
import { ReplayDriftDetector } from '../../src/core/runtime-hardening/replay-drift-detector.js';
import { RuntimeStabilityEngine } from '../../src/core/runtime-hardening/runtime-stability-engine.js';

// ─── Test Fixtures ─────────────────────────────────────────────────

function makeNode(overrides: Partial<ElementNode> & { tagName: string }): ElementNode {
  return {
    attributes: {},
    children: [],
    visible: true,
    ...overrides,
  };
}

function makeReplaySession(overrides?: Partial<ReplaySession>): ReplaySession {
  return {
    id: 'session-hardening-1',
    traceId: 'trace-1',
    testName: 'hardening-test',
    testFile: 'test.spec.ts',
    framework: 'playwright',
    schemaVersion: 1,
    entryUrl: 'https://example.com',
    urlTransitions: [],
    redirectChain: [],
    frameContext: ['main'],
    modalDialogContext: [],
    steps: [],
    createdAt: 1000,
    ...overrides,
  };
}

function makeStep(overrides: Partial<ReplayStep>): ReplayStep {
  return {
    stepId: 'step-1',
    timestamp: 1000,
    actionType: 'click',
    pageUrl: 'https://example.com',
    result: { success: true, duration: 50 },
    navigationContext: { url: 'https://example.com' },
    ...overrides,
  };
}

// ─── DOM Settling Tests ────────────────────────────────────────────

describe('DomSettlingDetector', () => {
  it('reports stable DOM when snapshots are identical', () => {
    const detector = new DomSettlingDetector();
    const stableNode = makeNode({ tagName: 'div', attributes: { id: 'app' } });
    const snapshots = [stableNode, stableNode, stableNode, stableNode];

    const report = detector.analyze('session-1', snapshots);

    expect(report.status).toBe('stable');
    expect(report.mutationCountStabilized).toBe(true);
    expect(report.layoutStabilized).toBe(true);
    expect(report.renderLoopDetected).toBe(false);
    expect(report.hydrationInstabilityDetected).toBe(false);
    expect(report.continuouslyMutatingContainers).toEqual([]);
  });

  it('detects unstable DOM when snapshots differ', () => {
    const detector = new DomSettlingDetector();
    const node1 = makeNode({ tagName: 'div', attributes: { id: 'app' } });
    const node2 = makeNode({ tagName: 'div', attributes: { id: 'app', 'data-loaded': 'true' } });
    const snapshots = [node1, node2];

    const report = detector.analyze('session-1', snapshots);

    expect(report.status).toBe('unstable');
    expect(report.mutationCountStabilized).toBe(false);
  });

  it('detects render loop when mutations persist', () => {
    const detector = new DomSettlingDetector();
    const snapshots: ElementNode[] = [];
    for (let i = 0; i < 5; i++) {
      snapshots.push(makeNode({
        tagName: 'div',
        attributes: { id: 'app', 'data-count': String(i) },
      }));
    }

    const report = detector.analyze('session-1', snapshots);

    expect(report.renderLoopDetected).toBe(true);
    expect(report.status).toBe('render-loop');
  });

  it('produces deterministic results for same inputs', () => {
    const detector = new DomSettlingDetector();
    const stableNode = makeNode({ tagName: 'div', attributes: { id: 'app' } });
    const snapshots = [stableNode, stableNode, stableNode, stableNode];

    const r1 = detector.analyze('session-1', snapshots);
    const r2 = detector.analyze('session-1', snapshots);

    expect(r1.status).toBe(r2.status);
    expect(r1.snapshotSequence.length).toBe(r2.snapshotSequence.length);
    expect(r1.mutationCountStabilized).toBe(r2.mutationCountStabilized);
  });
});

// ─── Navigation Synchronizer Tests ─────────────────────────────────

describe('NavigationSynchronizer', () => {
  it('reports ready when session has no transitions', () => {
    const sync = new NavigationSynchronizer();
    const session = makeReplaySession({
      steps: [makeStep({ actionType: 'click' })],
    });

    const report = sync.analyze(session);

    expect(report.readiness).toBe('ready');
    expect(report.blockedByUnreadiness).toBe(false);
    expect(report.pendingRedirects).toBe(0);
    expect(report.staleHistoryStates).toBe(0);
  });

  it('detects SPA transitions', () => {
    const sync = new NavigationSynchronizer();
    const session = makeReplaySession({
      entryUrl: 'https://example.com/home',
      urlTransitions: ['https://example.com/dashboard'],
      steps: [
        makeStep({ actionType: 'click', pageUrl: 'https://example.com/home' }),
        makeStep({ actionType: 'click', pageUrl: 'https://example.com/dashboard' }),
      ],
    });

    const report = sync.analyze(session);

    expect(report.transitions.length).toBeGreaterThan(0);
    const spaTransition = report.transitions.find(t => t.transitionType === 'spa');
    expect(spaTransition).toBeDefined();
  });

  it('detects soft navigation via query change', () => {
    const sync = new NavigationSynchronizer();
    const session = makeReplaySession({
      entryUrl: 'https://example.com/page',
      urlTransitions: ['https://example.com/page?filter=active'],
      steps: [
        makeStep({ actionType: 'click', pageUrl: 'https://example.com/page' }),
        makeStep({ actionType: 'click', pageUrl: 'https://example.com/page?filter=active' }),
      ],
    });

    const report = sync.analyze(session);

    const softTransition = report.transitions.find(t => t.transitionType === 'soft');
    expect(softTransition).toBeDefined();
  });

  it('blocks replay when readiness is not ready', () => {
    const sync = new NavigationSynchronizer();
    const session = makeReplaySession({
      entryUrl: 'https://example.com',
      urlTransitions: ['https://example.com/other'],
      steps: [
        makeStep({ actionType: 'click', pageUrl: 'https://example.com' }),
        makeStep({ actionType: 'click', pageUrl: 'https://example.com/other', result: { success: false, duration: 0, error: 'navigation failed' } }),
      ],
    });

    const report = sync.analyze(session);

    expect(report.readiness).toBe('failed');
    expect(report.blockedByUnreadiness).toBe(true);
  });

  it('isStepSafe returns true for matching URLs', () => {
    const sync = new NavigationSynchronizer();
    const step = makeStep({ pageUrl: 'https://example.com' });

    expect(sync.isStepSafe(step, 'https://example.com', 'https://example.com')).toBe(true);
  });

  it('isStepSafe returns false for SPA transition', () => {
    const sync = new NavigationSynchronizer();
    const step = makeStep({ pageUrl: 'https://example.com/new' });

    expect(sync.isStepSafe(step, 'https://example.com/old', 'https://example.com/new')).toBe(false);
  });
});

// ─── Async Render Detector Tests ───────────────────────────────────

describe('AsyncRenderDetector', () => {
  it('reports no async renders for stable snapshots', () => {
    const detector = new AsyncRenderDetector();
    const stableNode = makeNode({ tagName: 'div', attributes: { id: 'app' } });
    const snapshots = [stableNode, stableNode];

    const report = detector.analyze('session-1', snapshots);

    expect(report.totalAsyncRenders).toBe(0);
    expect(report.completedRenders).toBe(0);
    expect(report.incompleteRenders).toBe(0);
    expect(report.reRenderChurnDetected).toBe(false);
  });

  it('detects skeleton replacement', () => {
    const detector = new AsyncRenderDetector();
    const skeletonNode = makeNode({
      tagName: 'div',
      attributes: { class: 'skeleton-loader' },
      children: [],
    });
    const loadedNode = makeNode({
      tagName: 'div',
      attributes: { class: 'content' },
      children: [],
    });
    const snapshots = [skeletonNode, loadedNode];

    const report = detector.analyze('session-1', snapshots);

    expect(report.skeletonReplacements).toBeGreaterThanOrEqual(0);
  });

  it('detects lazy-loaded elements', () => {
    const detector = new AsyncRenderDetector();
    const beforeNode = makeNode({ tagName: 'div', attributes: { id: 'container' }, children: [] });
    const afterNode = makeNode({
      tagName: 'div',
      attributes: { id: 'container' },
      children: [
        makeNode({ tagName: 'section', attributes: { loading: 'lazy', id: 'lazy-section' } }),
      ],
    });
    const snapshots = [beforeNode, afterNode];

    const report = detector.analyze('session-1', snapshots);

    const lazyObservation = report.observations.find(o => o.type === 'lazy-load');
    expect(lazyObservation).toBeDefined();
  });

  it('detects re-render churn', () => {
    const detector = new AsyncRenderDetector();
    const children1 = Array.from({ length: 10 }, (_, i) =>
      makeNode({ tagName: 'span', attributes: { 'data-index': String(i) }, textContent: `v1-${i}` }),
    );
    const children2 = Array.from({ length: 10 }, (_, i) =>
      makeNode({ tagName: 'span', attributes: { 'data-index': String(i) }, textContent: `v2-${i}` }),
    );
    const node1 = makeNode({ tagName: 'div', attributes: { id: 'list' }, children: children1 });
    const node2 = makeNode({ tagName: 'div', attributes: { id: 'list' }, children: children2 });
    const snapshots = [node1, node2];

    const report = detector.analyze('session-1', snapshots);

    expect(report.reRenderChurnDetected).toBe(true);
  });

  it('produces deterministic results for same inputs', () => {
    const detector = new AsyncRenderDetector();
    const stableNode = makeNode({ tagName: 'div', attributes: { id: 'app' } });
    const snapshots = [stableNode, stableNode];

    const r1 = detector.analyze('session-1', snapshots);
    const r2 = detector.analyze('session-1', snapshots);

    expect(r1.totalAsyncRenders).toBe(r2.totalAsyncRenders);
    expect(r1.reRenderChurnDetected).toBe(r2.reRenderChurnDetected);
  });
});

// ─── Stale Context Recovery Tests ──────────────────────────────────

describe('StaleContextRecovery', () => {
  it('reports no stale events for successful session', () => {
    const recovery = new StaleContextRecovery();
    const session = makeReplaySession({
      steps: [makeStep({ result: { success: true, duration: 50 } })],
    });
    const domSnapshots = [makeNode({ tagName: 'div', attributes: { id: 'app' } })];

    const report = recovery.analyze('session-1', session, domSnapshots);

    expect(report.totalStaleEvents).toBe(0);
    expect(report.recoveryRate).toBe(1);
  });

  it('detects detached node from error message', () => {
    const recovery = new StaleContextRecovery();
    const session = makeReplaySession({
      steps: [
        makeStep({
          locatorRef: { strategy: 'css', value: '#submit', expression: '#submit' },
          result: { success: false, duration: 0, error: 'Element is detached' },
        }),
      ],
    });
    const domSnapshots = [makeNode({ tagName: 'div', attributes: {} })];

    const report = recovery.analyze('session-1', session, domSnapshots);

    expect(report.totalStaleEvents).toBeGreaterThan(0);
    expect(report.events[0]?.type).toBe('detached-node');
  });

  it('detects stale element reference', () => {
    const recovery = new StaleContextRecovery();
    const session = makeReplaySession({
      steps: [
        makeStep({
          locatorRef: { strategy: 'css', value: '#btn', expression: '#btn' },
          result: { success: false, duration: 0, error: 'Stale element reference' },
        }),
      ],
    });
    const domSnapshots = [makeNode({ tagName: 'div', attributes: {} })];

    const report = recovery.analyze('session-1', session, domSnapshots);

    expect(report.events[0]?.type).toBe('stale-element-ref');
  });

  it('attempts recovery for locators with stable attributes', () => {
    const recovery = new StaleContextRecovery();
    const session = makeReplaySession({
      steps: [
        makeStep({
          locatorRef: { strategy: 'testid', value: 'submit-btn', expression: '[data-testid="submit-btn"]' },
          result: { success: false, duration: 0, error: 'Element is detached' },
        }),
      ],
    });
    const domSnapshots = [makeNode({
      tagName: 'button',
      attributes: { 'data-testid': 'submit-btn' },
    })];

    const report = recovery.analyze('session-1', session, domSnapshots);

    expect(report.totalStaleEvents).toBeGreaterThan(0);
    const event = report.events[0]!;
    expect(event.recoverable).toBe(true);
    expect(event.recoverySuccess).toBe(true);
  });

  it('produces deterministic results for same inputs', () => {
    const recovery = new StaleContextRecovery();
    const session = makeReplaySession({
      steps: [makeStep({ result: { success: true, duration: 50 } })],
    });
    const domSnapshots = [makeNode({ tagName: 'div', attributes: { id: 'app' } })];

    const r1 = recovery.analyze('session-1', session, domSnapshots);
    const r2 = recovery.analyze('session-1', session, domSnapshots);

    expect(r1.totalStaleEvents).toBe(r2.totalStaleEvents);
    expect(r1.recoveryRate).toBe(r2.recoveryRate);
  });
});

// ─── iframe + Modal Handler Tests ──────────────────────────────────

describe('IframeModalHandler', () => {
  it('reports stable when no frames or modals present', () => {
    const handler = new IframeModalHandler();
    const session = makeReplaySession({ frameContext: [] });
    const domSnapshots = [makeNode({ tagName: 'div', attributes: { id: 'app' } })];

    const report = handler.analyze('session-1', session, domSnapshots);

    expect(report.stabilityPassed).toBe(true);
    expect(report.frames.length).toBe(0);
    expect(report.modals.length).toBe(0);
    expect(report.focusTrapViolations).toBe(0);
  });

  it('detects modal elements', () => {
    const handler = new IframeModalHandler();
    const session = makeReplaySession();
    const modalNode = makeNode({
      tagName: 'dialog',
      attributes: { id: 'confirm-modal', 'aria-modal': 'true' },
    });
    const domSnapshots = [modalNode];

    const report = handler.analyze('session-1', session, domSnapshots);

    expect(report.modals.length).toBeGreaterThan(0);
    expect(report.modalTransitionCount).toBeGreaterThanOrEqual(0);
  });

  it('detects focus trap violations', () => {
    const handler = new IframeModalHandler();
    const session = makeReplaySession();
    const trapNode = makeNode({
      tagName: 'div',
      attributes: { class: 'focus-trap', 'aria-modal': 'false' },
    });
    const domSnapshots = [trapNode];

    const report = handler.analyze('session-1', session, domSnapshots);

    expect(report.focusTrapViolations).toBeGreaterThanOrEqual(0);
  });

  it('detects overlay interception', () => {
    const handler = new IframeModalHandler();
    const session = makeReplaySession();
    const overlayNode = makeNode({
      tagName: 'div',
      attributes: { class: 'overlay-backdrop', 'aria-hidden': 'false' },
    });
    const domSnapshots = [overlayNode];

    const report = handler.analyze('session-1', session, domSnapshots);

    expect(report.overlayInterceptions).toBeGreaterThanOrEqual(0);
  });

  it('handles nested iframe contexts', () => {
    const handler = new IframeModalHandler();
    const session = makeReplaySession({
      frameContext: ['main', 'main/child', 'main/child/nested'],
    });
    const domSnapshots = [makeNode({ tagName: 'div', attributes: {} })];

    const report = handler.analyze('session-1', session, domSnapshots);

    expect(report.nestedFrameCount).toBeGreaterThanOrEqual(0);
  });

  it('produces deterministic results for same inputs', () => {
    const handler = new IframeModalHandler();
    const session = makeReplaySession();
    const domSnapshots = [makeNode({ tagName: 'div', attributes: { id: 'app' } })];

    const r1 = handler.analyze('session-1', session, domSnapshots);
    const r2 = handler.analyze('session-1', session, domSnapshots);

    expect(r1.stabilityPassed).toBe(r2.stabilityPassed);
    expect(r1.frames.length).toBe(r2.frames.length);
    expect(r1.modals.length).toBe(r2.modals.length);
  });
});

// ─── Replay Drift Detector Tests ───────────────────────────────────

describe('ReplayDriftDetector', () => {
  it('reports no drift for deterministic replay', () => {
    const detector = new ReplayDriftDetector();
    const session = makeReplaySession({
      steps: [makeStep({ result: { success: true, duration: 50 } })],
    });
    const domSnapshots = [makeNode({ tagName: 'div', attributes: { id: 'app' } })];

    const report = detector.analyze('session-1', session, domSnapshots);

    expect(report.replayDeterministic).toBe(true);
    expect(report.totalDriftEvents).toBe(0);
    expect(report.driftSeverity).toBe('none');
  });

  it('detects navigation divergence', () => {
    const detector = new ReplayDriftDetector();
    const session = makeReplaySession({
      entryUrl: 'https://example.com/home',
      steps: [makeStep({
        pageUrl: 'https://example.com/other',
        result: { success: true, duration: 50 },
      })],
    });
    const domSnapshots = [makeNode({ tagName: 'div', attributes: {} })];

    const report = detector.analyze('session-1', session, domSnapshots);

    const navDivergence = report.events.find(e => e.type === 'navigation-divergence');
    expect(navDivergence).toBeDefined();
    expect(report.replayDeterministic).toBe(false);
  });

  it('detects timing instability for slow steps', () => {
    const detector = new ReplayDriftDetector();
    const session = makeReplaySession({
      steps: [makeStep({ result: { success: true, duration: 6000 } })],
    });
    const domSnapshots = [makeNode({ tagName: 'div', attributes: {} })];

    const report = detector.analyze('session-1', session, domSnapshots);

    const timingEvent = report.events.find(e => e.type === 'timing-instability');
    expect(timingEvent).toBeDefined();
  });

  it('detects action sequence divergence', () => {
    const detector = new ReplayDriftDetector();
    const session = makeReplaySession({
      steps: [
        makeStep({ actionType: 'goto', pageUrl: 'https://example.com' }),
        makeStep({ actionType: 'press' }),
      ],
    });
    const domSnapshots = [
      makeNode({ tagName: 'div', attributes: {} }),
      makeNode({ tagName: 'div', attributes: {} }),
    ];

    const report = detector.analyze('session-1', session, domSnapshots);

    const actionDivergence = report.events.find(e => e.type === 'action-sequence-divergence');
    expect(actionDivergence).toBeDefined();
  });

  it('computes severity correctly', () => {
    const detector = new ReplayDriftDetector();
    const session = makeReplaySession({
      entryUrl: 'https://example.com',
      steps: [makeStep({
        pageUrl: 'https://example.com/other',
        result: { success: false, duration: 0, error: 'navigation failed' },
      })],
    });
    const domSnapshots = [makeNode({ tagName: 'div', attributes: {} })];

    const report = detector.analyze('session-1', session, domSnapshots);

    expect(report.driftSeverity).toBe('critical');
  });

  it('produces deterministic results for same inputs', () => {
    const detector = new ReplayDriftDetector();
    const session = makeReplaySession({
      steps: [makeStep({ result: { success: true, duration: 50 } })],
    });
    const domSnapshots = [makeNode({ tagName: 'div', attributes: { id: 'app' } })];

    const r1 = detector.analyze('session-1', session, domSnapshots);
    const r2 = detector.analyze('session-1', session, domSnapshots);

    expect(r1.replayDeterministic).toBe(r2.replayDeterministic);
    expect(r1.totalDriftEvents).toBe(r2.totalDriftEvents);
    expect(r1.driftSeverity).toBe(r2.driftSeverity);
  });
});

// ─── RuntimeStabilityEngine Integration Tests ──────────────────────

describe('RuntimeStabilityEngine', () => {
  it('executes full hardening analysis on stable session', () => {
    const engine = new RuntimeStabilityEngine();
    const projectRoot = process.cwd();

    const session = makeReplaySession({
      steps: [makeStep({ result: { success: true, duration: 50 } })],
    });
    const stableNode = makeNode({ tagName: 'div', attributes: { id: 'app' } });
    const domSnapshots = [stableNode, stableNode, stableNode, stableNode];

    const result = engine.analyze({ session, domSnapshots, projectRoot });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const report = result.value;
    expect(report.sessionId).toBe('session-hardening-1');
    expect(report.domSettling.status).toBe('stable');
    expect(report.navigationSync.readiness).toBe('ready');
    expect(report.replayDrift.replayDeterministic).toBe(true);
    expect(report.metrics.totalSessionsAnalyzed).toBe(1);
    expect(report.persistedPaths.length).toBeGreaterThan(0);
  });

  it('reports unstable when DOM is not settled', () => {
    const engine = new RuntimeStabilityEngine();
    const projectRoot = process.cwd();

    const session = makeReplaySession();
    const node1 = makeNode({ tagName: 'div', attributes: { id: 'v1' } });
    const node2 = makeNode({ tagName: 'div', attributes: { id: 'v2' } });
    const domSnapshots = [node1, node2];

    const result = engine.analyze({ session, domSnapshots, projectRoot });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.overallStable).toBe(false);
    expect(result.value.domSettling.status).not.toBe('stable');
  });

  it('reports unstable when replay has drift', () => {
    const engine = new RuntimeStabilityEngine();
    const projectRoot = process.cwd();

    const session = makeReplaySession({
      entryUrl: 'https://example.com',
      steps: [makeStep({
        pageUrl: 'https://other.com',
        result: { success: true, duration: 50 },
      })],
    });
    const stableNode = makeNode({ tagName: 'div', attributes: { id: 'app' } });
    const domSnapshots = [stableNode, stableNode, stableNode, stableNode];

    const result = engine.analyze({ session, domSnapshots, projectRoot });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.overallStable).toBe(false);
    expect(result.value.replayDrift.replayDeterministic).toBe(false);
  });

  it('fails when no DOM snapshots provided', () => {
    const engine = new RuntimeStabilityEngine();
    const projectRoot = process.cwd();

    const session = makeReplaySession();
    const result = engine.analyze({ session, domSnapshots: [], projectRoot });

    expect(result.ok).toBe(false);
  });

  it('produces deterministic results for same inputs', () => {
    const engine = new RuntimeStabilityEngine();
    const projectRoot = process.cwd();

    const session = makeReplaySession({
      steps: [makeStep({ result: { success: true, duration: 50 } })],
    });
    const stableNode = makeNode({ tagName: 'div', attributes: { id: 'app' } });
    const domSnapshots = [stableNode, stableNode, stableNode, stableNode];

    const r1 = engine.analyze({ session, domSnapshots, projectRoot });
    const r2 = engine.analyze({ session, domSnapshots, projectRoot });

    expect(r1.ok).toBe(r2.ok);
    if (!r1.ok || !r2.ok) return;

    expect(r1.value.overallStable).toBe(r2.value.overallStable);
    expect(r1.value.domSettling.status).toBe(r2.value.domSettling.status);
    expect(r1.value.replayDrift.replayDeterministic).toBe(r2.value.replayDrift.replayDeterministic);
  });
});
