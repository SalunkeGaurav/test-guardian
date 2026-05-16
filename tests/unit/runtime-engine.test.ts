import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Result } from '../../src/models/result.js';
import type { ElementNode } from '../../src/models/snapshot.js';
import type { DomSnapshot } from '../../src/models/snapshot.js';
import type { ReplaySession, ReplayStep } from '../../src/models/replay.js';
import type { HealingCandidate } from '../../src/models/healing-candidate.js';
import type { BrowserEngine } from '../../src/core/runtime/browser.js';
import type { BrowserContextState, NavigationResult, InteractionResult, MatchedElement, BrowserConfig, RuntimeValidationResult } from '../../src/models/runtime.js';
import { ReplayRuntime } from '../../src/core/runtime/engine.js';
import { StepExecutor } from '../../src/core/runtime/step-executor.js';
import { SessionManager } from '../../src/core/runtime/session-manager.js';
import { ReplayCoordinator } from '../../src/core/runtime/replay-coordinator.js';
import { EvidenceCollector } from '../../src/core/runtime/evidence-collector.js';
import { DivergenceDetector } from '../../src/core/runtime/divergence.js';
import { RuntimeFalsePositiveDetector } from '../../src/core/runtime/false-positive.js';
import { RuntimePersister } from '../../src/core/runtime/persister.js';
import { success, failure } from '../../src/models/result.js';

// ─── Mock Browser Engine ──────────────────────────────────────────

class MockBrowserEngine implements BrowserEngine {
  private _isLaunched = false;
  private _contextCounter = 0;
  private contexts: Map<string, { currentUrl: string; dom: ElementNode[] }> = new Map();
  mockDom: ElementNode[] = [];
  mockCurrentUrl = 'https://example.com';
  failNextAction = false;
  failNextActionError = 'Mock failure';
  mockConsoleErrors: string[] = [];

  async launch(_config?: BrowserConfig): Promise<Result<void>> {
    this._isLaunched = true;
    return success(undefined);
  }

  async close(): Promise<Result<void>> {
    this._isLaunched = false;
    this.contexts.clear();
    return success(undefined);
  }

  async createContext(): Promise<Result<BrowserContextState>> {
    if (!this._isLaunched) return failure('Not launched');
    const id = `mock-ctx-${this._contextCounter++}`;
    const state: BrowserContextState = { id, currentUrl: this.mockCurrentUrl, currentFrame: 'main' };
    this.contexts.set(state.id, { currentUrl: this.mockCurrentUrl, dom: [...this.mockDom] });
    return success(state);
  }

  async closeContext(context: BrowserContextState): Promise<Result<void>> {
    this.contexts.delete(context.id);
    return success(undefined);
  }

  async goto(context: BrowserContextState, url: string): Promise<Result<NavigationResult>> {
    if (this.failNextAction) return failure(this.failNextActionError);
    const ctx = this.contexts.get(context.id);
    if (ctx) {
      ctx.currentUrl = url;
      context.currentUrl = url;
    }
    return success({ url, title: 'Mock Page', timing: 50 });
  }

  async click(_context: BrowserContextState, _strategy: string, value: string): Promise<Result<InteractionResult>> {
    if (this.failNextAction) return success({ success: false, timing: 0, error: this.failNextActionError });
    const el = this.resolveElementInDom(value);
    if (!el) return success({ success: false, timing: 0, error: 'Element not found' });
    return success({
      success: el.visible && el.interactable !== false,
      matchedElement: {
        tagName: el.tagName,
        attributes: el.attributes,
        textContent: el.textContent,
        visible: el.visible,
        interactable: el.interactable !== false,
      },
      timing: 30,
      ...(!el.visible ? { error: 'Element is not visible' } : {}),
    });
  }

  async fill(_context: BrowserContextState, _strategy: string, value: string, _text: string): Promise<Result<InteractionResult>> {
    if (this.failNextAction) return success({ success: false, timing: 0, error: this.failNextActionError });
    const el = this.resolveElementInDom(value);
    if (!el) return success({ success: false, timing: 0, error: 'Element not found' });
    if (!el.visible) {
      return success({
        success: false,
        matchedElement: {
          tagName: el.tagName,
          attributes: el.attributes,
          textContent: el.textContent,
          visible: el.visible,
          interactable: el.interactable !== false,
        },
        timing: 40,
        error: 'Element is not visible',
      });
    }
    if (el.tagName !== 'input' && el.tagName !== 'textarea') {
      return success({ success: false, timing: 0, error: 'Element is not fillable' });
    }
    return success({ success: true, timing: 40 });
  }

  async press(_context: BrowserContextState, _strategy: string, value: string, _key: string): Promise<Result<InteractionResult>> {
    if (this.failNextAction) return success({ success: false, timing: 0, error: this.failNextActionError });
    const el = this.resolveElementInDom(value);
    if (!el) return success({ success: false, timing: 0, error: 'Element not found' });
    return success({ success: true, timing: 20 });
  }

  async select(_context: BrowserContextState, _strategy: string, value: string, _option: string): Promise<Result<InteractionResult>> {
    if (this.failNextAction) return success({ success: false, timing: 0, error: this.failNextActionError });
    const el = this.resolveElementInDom(value);
    if (!el) return success({ success: false, timing: 0, error: 'Element not found' });
    return success({ success: true, timing: 35 });
  }

  async wait(_context: BrowserContextState, _timeout: number): Promise<Result<void>> {
    if (this.failNextAction) return failure(this.failNextActionError);
    return success(undefined);
  }

  async captureSnapshot(_context: BrowserContextState): Promise<Result<DomSnapshot>> {
    return success({
      id: 'mock-snapshot',
      traceId: 'runtime',
      eventIndex: 0,
      capturedAt: Date.now(),
      url: 'https://example.com',
      viewport: { width: 1280, height: 720 },
    });
  }

  async getCurrentUrl(context: BrowserContextState): Promise<string> {
    const ctx = this.contexts.get(context.id);
    return ctx?.currentUrl ?? this.mockCurrentUrl;
  }

  async getConsoleErrors(_context: BrowserContextState): Promise<string[]> {
    return this.mockConsoleErrors;
  }

  async resolveElement(_context: BrowserContextState, _strategy: string, value: string): Promise<Result<MatchedElement[]>> {
    const el = this.resolveElementInDom(value);
    if (!el) return success([]);
    return success([{
      tagName: el.tagName,
      attributes: el.attributes,
      visible: el.visible,
      interactable: true,
    }]);
  }

  private resolveElementInDom(value: string): ElementNode | undefined {
    const flat = this.flattenDom(this.mockDom);
    return flat.find(n =>
      n.attributes['id'] === value ||
      n.attributes['data-testid'] === value ||
      n.attributes['name'] === value ||
      n.tagName.toLowerCase() === value.toLowerCase() ||
      (n.textContent && n.textContent.trim() === value),
    );
  }

  private flattenDom(nodes: ElementNode[]): ElementNode[] {
    const result: ElementNode[] = [];
    for (const n of nodes) {
      result.push(n);
      result.push(...this.flattenDom(n.children));
    }
    return result;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

function makeNode(overrides: Partial<ElementNode> & { tagName: string }): ElementNode {
  return {
    attributes: {},
    children: [],
    visible: true,
    ...overrides,
  };
}

function makeStep(overrides: Partial<ReplayStep> & { actionType: ReplayStep['actionType'] }): ReplayStep {
  return {
    stepId: `step-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    actionType: overrides.actionType,
    pageUrl: 'https://example.com/page',
    result: { success: true, duration: 100 },
    navigationContext: { url: 'https://example.com/page' },
    ...overrides,
  };
}

function makeSession(overrides: Partial<ReplaySession> & { steps: ReplayStep[] }): ReplaySession {
  return {
    id: 'session-1',
    traceId: 'trace-1',
    testName: 'replay test',
    testFile: 'test.spec.ts',
    framework: 'playwright',
    schemaVersion: 1,
    entryUrl: 'https://example.com',
    urlTransitions: [],
    redirectChain: [],
    frameContext: [],
    modalDialogContext: [],
    createdAt: Date.now(),
    ...overrides,
  };
}

function makeCandidate(overrides: Partial<HealingCandidate> & { proposedStrategy: string; proposedValue: string }): HealingCandidate {
  return {
    id: 'cand-1',
    locatorId: 'loc-1',
    originalExpression: '#old-id',
    proposedExpression: '',
    proposedStrategy: overrides.proposedStrategy,
    proposedValue: overrides.proposedValue,
    strategy: 'attribute-similarity',
    confidence: 0.7,
    ranking: { overall: 0.7, survivabilityScore: 0.5, structuralSimilarity: 0, attributeMatchScore: 0, hierarchyStability: 0, replayContextConfidence: 0 },
    explanation: {
      whyMatched: 'test',
      structuralChanges: [],
      confidenceBreakdown: { overall: 0.7, survivabilityScore: 0.5, structuralSimilarity: 0, attributeMatchScore: 0, hierarchyStability: 0, replayContextConfidence: 0 },
      survivabilityReasoning: 'test',
      attributeChanges: [],
      strategyApplied: 'attribute-similarity',
    },
    domEvidence: { matchedPath: 'button', matchedTag: 'button', stableAttributeMatches: ['data-testid'] },
    validated: false,
    createdAt: Date.now(),
    ...overrides,
  };
}

function getTempDir(): string {
  const dir = join(tmpdir(), `tg-runtime-test-${Date.now()}`);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

// ─── StepExecutor Tests ───────────────────────────────────────────

describe('StepExecutor', () => {
  let browser: MockBrowserEngine;

  beforeEach(() => {
    browser = new MockBrowserEngine();
    browser.mockDom = [makeNode({ tagName: 'button', attributes: { id: 'submit-btn', 'data-testid': 'submit' }, textContent: 'Submit' })];
  });

  it('executes goto step', async () => {
    const executor = new StepExecutor(browser);
    const step = makeStep({ actionType: 'goto', pageUrl: 'https://example.com' });
    const ctx: BrowserContextState = { id: 'ctx1', currentUrl: '', currentFrame: 'main' };

    const result = await executor.executeStep(step, ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.success).toBe(true);
    expect(result.value.actionType).toBe('goto');
  });

  it('executes click step', async () => {
    const executor = new StepExecutor(browser);
    const step = makeStep({ actionType: 'click', locatorRef: { strategy: 'id', value: 'submit-btn', expression: '#submit-btn' } });
    const ctx: BrowserContextState = { id: 'ctx2', currentUrl: 'https://example.com', currentFrame: 'main' };

    const result = await executor.executeStep(step, ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.success).toBe(true);
    expect(result.value.interactionResult?.matchedElement?.tagName).toBe('button');
  });

  it('executes fill step', async () => {
    browser.mockDom = [makeNode({ tagName: 'input', attributes: { id: 'email', type: 'text' } })];
    const executor = new StepExecutor(browser);
    const step = makeStep({ actionType: 'fill', locatorRef: { strategy: 'id', value: 'email', expression: '#email' }, inputPayload: 'test@example.com' });
    const ctx: BrowserContextState = { id: 'ctx3', currentUrl: 'https://example.com', currentFrame: 'main' };

    const result = await executor.executeStep(step, ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.success).toBe(true);
  });

  it('executes press step', async () => {
    browser.mockDom = [makeNode({ tagName: 'input', attributes: { id: 'search' } })];
    const executor = new StepExecutor(browser);
    const step = makeStep({ actionType: 'press', locatorRef: { strategy: 'id', value: 'search', expression: '#search' }, inputPayload: 'Enter' });
    const ctx: BrowserContextState = { id: 'ctx4', currentUrl: 'https://example.com', currentFrame: 'main' };

    const result = await executor.executeStep(step, ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.success).toBe(true);
  });

  it('executes select step', async () => {
    browser.mockDom = [makeNode({ tagName: 'select', attributes: { id: 'country' } })];
    const executor = new StepExecutor(browser);
    const step = makeStep({ actionType: 'select', locatorRef: { strategy: 'id', value: 'country', expression: '#country' }, inputPayload: 'US' });
    const ctx: BrowserContextState = { id: 'ctx5', currentUrl: 'https://example.com', currentFrame: 'main' };

    const result = await executor.executeStep(step, ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.success).toBe(true);
  });

  it('executes wait step', async () => {
    const executor = new StepExecutor(browser);
    const step = makeStep({ actionType: 'wait', inputPayload: 100 });
    const ctx: BrowserContextState = { id: 'ctx6', currentUrl: 'https://example.com', currentFrame: 'main' };

    const result = await executor.executeStep(step, ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.success).toBe(true);
  });

  it('overrides locator when overrideLocator is provided', async () => {
    const executor = new StepExecutor(browser);
    const step = makeStep({ actionType: 'click', locatorRef: { strategy: 'id', value: 'old-btn', expression: '#old-btn' } });
    const ctx: BrowserContextState = { id: 'ctx7', currentUrl: 'https://example.com', currentFrame: 'main' };

    const result = await executor.executeStep(step, ctx, { strategy: 'id', value: 'submit-btn' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.success).toBe(true);
  });

  it('returns failure result for missing element', async () => {
    browser.mockDom = [];
    const executor = new StepExecutor(browser);
    const step = makeStep({ actionType: 'click', locatorRef: { strategy: 'id', value: 'non-existent', expression: '#non-existent' } });
    const ctx: BrowserContextState = { id: 'ctx8', currentUrl: 'https://example.com', currentFrame: 'main' };

    const result = await executor.executeStep(step, ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.success).toBe(false);
  });

  it('handles unsupported action type gracefully', async () => {
    const executor = new StepExecutor(browser);
    const step = makeStep({ actionType: 'assertion' as any });
    const ctx: BrowserContextState = { id: 'ctx9', currentUrl: 'https://example.com', currentFrame: 'main' };

    const result = await executor.executeStep(step, ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.success).toBe(false);
  });
});

// ─── SessionManager Tests ─────────────────────────────────────────

describe('SessionManager', () => {
  let browser: MockBrowserEngine;

  beforeEach(() => {
    browser = new MockBrowserEngine();
  });

  it('starts and ends a session', async () => {
    const manager = new SessionManager(browser);
    const session = await manager.startSession();
    expect(session.ok).toBe(true);
    if (!session.ok) return;
    expect(session.value.browserContext.id).toBeTruthy();
    expect(session.value.metadata.browserName).toBe('chromium');

    const endResult = await manager.endSession(session.value);
    expect(endResult.ok).toBe(true);
  });

  it('creates isolated contexts for sequential sessions', async () => {
    const manager = new SessionManager(browser);
    const s1 = await manager.startSession();
    const s2 = await manager.startSession();
    expect(s1.ok).toBe(true);
    expect(s2.ok).toBe(true);
    if (!s1.ok || !s2.ok) return;
    expect(s1.value.browserContext.id).not.toBe(s2.value.browserContext.id);

    await manager.endSession(s1.value);
    await manager.endSession(s2.value);
  });

  it('shuts down browser', async () => {
    const manager = new SessionManager(browser);
    await manager.startSession();
    expect(manager.isLaunched).toBe(true);

    const result = await manager.shutdown();
    expect(result.ok).toBe(true);
    expect(manager.isLaunched).toBe(false);
  });

  it('handles shutdown when not launched', async () => {
    const manager = new SessionManager(browser);
    expect(manager.isLaunched).toBe(false);
    const result = await manager.shutdown();
    expect(result.ok).toBe(true);
  });
});

// ─── EvidenceCollector Tests ──────────────────────────────────────

describe('EvidenceCollector', () => {
  let browser: MockBrowserEngine;

  beforeEach(() => {
    browser = new MockBrowserEngine();
    browser.mockDom = [makeNode({ tagName: 'button', attributes: { id: 'btn' }, textContent: 'Click' })];
  });

  it('collects evidence from a successful step', async () => {
    const collector = new EvidenceCollector(browser);
    const step = makeStep({ actionType: 'click' });
    const ctx: BrowserContextState = { id: 'ctx', currentUrl: 'https://example.com', currentFrame: 'main' };

    const ev = await collector.collect(step, { success: true, actionType: 'click', timing: 30 }, ctx, 'https://example.com');

    expect(ev.actionType).toBe('click');
    expect(ev.timing).toBe(30);
    expect(typeof ev.url).toBe('string');
  });
});

// ─── DivergenceDetector Tests ─────────────────────────────────────

describe('DivergenceDetector', () => {
  it('detects interaction failure divergence', () => {
    const detector = new DivergenceDetector();
    const step = makeStep({ actionType: 'click', locatorRef: { strategy: 'id', value: 'btn', expression: '#btn' } });
    const divergences = detector.detect(
      step,
      { success: false, actionType: 'click', timing: 0, error: 'Element not found' },
      { stepIndex: 0, actionType: 'click', interactable: false, visible: false, navigationChanged: false, url: 'https://example.com', timing: 0, consoleErrors: [] },
      'https://example.com',
    );

    expect(divergences.some(d => d.type === 'interaction-failed')).toBe(true);
  });

  it('detects unexpected URL changes', () => {
    const detector = new DivergenceDetector();
    const step = makeStep({ actionType: 'click', pageUrl: 'https://example.com/page1' });
    const divergences = detector.detect(
      step,
      { success: true, actionType: 'click', timing: 30 },
      { stepIndex: 0, actionType: 'click', interactable: true, visible: true, navigationChanged: true, url: 'https://other.com', timing: 30, consoleErrors: [] },
      'https://example.com/page1',
    );

    expect(divergences.some(d => d.type === 'url-mismatch')).toBe(true);
  });

  it('detects missing element divergence', () => {
    const detector = new DivergenceDetector();
    const step = makeStep({ actionType: 'click', locatorRef: { strategy: 'id', value: 'missing', expression: '#missing' } });
    const divergences = detector.detect(
      step,
      { success: false, actionType: 'click', timing: 0, interactionResult: { success: false, timing: 0, error: 'Not found' } },
      { stepIndex: 0, actionType: 'click', interactable: false, visible: false, navigationChanged: false, url: 'https://example.com', timing: 0, consoleErrors: [] },
      'https://example.com',
    );

    expect(divergences.some(d => d.type === 'element-missing')).toBe(true);
  });

  it('detects console errors as DOM inconsistency', () => {
    const detector = new DivergenceDetector();
    const step = makeStep({ actionType: 'click' });
    const divergences = detector.detect(
      step,
      { success: true, actionType: 'click', timing: 30 },
      { stepIndex: 0, actionType: 'click', interactable: true, visible: true, navigationChanged: false, url: 'https://example.com', timing: 30, consoleErrors: ['TypeError: x is not a function'] },
      'https://example.com',
    );

    expect(divergences.some(d => d.type === 'dom-inconsistency')).toBe(true);
  });

  it('returns no divergences for clean execution', () => {
    const detector = new DivergenceDetector();
    const step = makeStep({ actionType: 'click' });
    const divergences = detector.detect(
      step,
      { success: true, actionType: 'click', timing: 30 },
      { stepIndex: 0, actionType: 'click', interactable: true, visible: true, navigationChanged: false, url: 'https://example.com', timing: 30, consoleErrors: [] },
      'https://example.com',
    );

    expect(divergences).toHaveLength(0);
  });
});

// ─── RuntimeFalsePositiveDetector Tests ───────────────────────────

describe('RuntimeFalsePositiveDetector', () => {
  it('detects hidden element', () => {
    const detector = new RuntimeFalsePositiveDetector();
    const proposal = makeCandidate({ proposedStrategy: 'id', proposedValue: 'btn', domEvidence: { matchedPath: 'button', matchedTag: 'button', stableAttributeMatches: ['data-testid'] } });

    const indicators = detector.detect(
      [{ stepIndex: 0, actionType: 'click', matchedElement: { tagName: 'button', attributes: { id: 'btn' }, visible: false, interactable: false }, interactable: false, visible: false, navigationChanged: false, url: '', timing: 0, consoleErrors: [] }],
      proposal,
      [],
    );

    expect(indicators.some(i => i.type === 'hidden-element')).toBe(true);
  });

  it('detects wrong element (tag mismatch)', () => {
    const detector = new RuntimeFalsePositiveDetector();
    const proposal = makeCandidate({ proposedStrategy: 'id', proposedValue: 'span-el', domEvidence: { matchedPath: 'span', matchedTag: 'span', stableAttributeMatches: [], originalTag: 'span' } });

    const indicators = detector.detect(
      [{ stepIndex: 0, actionType: 'click', matchedElement: { tagName: 'div', attributes: { id: 'span-el' }, visible: true, interactable: true }, interactable: true, visible: true, navigationChanged: false, url: '', timing: 0, consoleErrors: [] }],
      proposal,
      [],
    );

    expect(indicators.some(i => i.type === 'wrong-element')).toBe(true);
  });

  it('detects unstable dynamic attributes', () => {
    const detector = new RuntimeFalsePositiveDetector();
    const proposal = makeCandidate({ proposedStrategy: 'id', proposedValue: 'btn-123-456', domEvidence: { matchedPath: 'button', matchedTag: 'button', stableAttributeMatches: [] } });

    const indicators = detector.detect(
      [{ stepIndex: 0, actionType: 'click', matchedElement: { tagName: 'button', attributes: { id: 'btn-123-456' }, visible: true, interactable: true }, interactable: true, visible: true, navigationChanged: false, url: '', timing: 0, consoleErrors: [] }],
      proposal,
      [],
    );

    expect(indicators.some(i => i.type === 'unstable-dynamic')).toBe(true);
  });

  it('detects navigation divergence false positive', () => {
    const detector = new RuntimeFalsePositiveDetector();
    const proposal = makeCandidate({ proposedStrategy: 'id', proposedValue: 'btn', domEvidence: { matchedPath: 'button', matchedTag: 'button', stableAttributeMatches: [] } });

    const indicators = detector.detect(
      [{ stepIndex: 0, actionType: 'click', matchedElement: { tagName: 'button', attributes: { id: 'btn' }, visible: true, interactable: true }, interactable: true, visible: true, navigationChanged: true, url: 'https://other.com', timing: 0, consoleErrors: [] }],
      proposal,
      [{ type: 'url-mismatch', stepIndex: 0, expected: 'https://example.com', actual: 'https://other.com' }],
    );

    expect(indicators.some(i => i.type === 'navigation-divergence')).toBe(true);
  });

  it('returns no indicators for clean match', () => {
    const detector = new RuntimeFalsePositiveDetector();
    const proposal = makeCandidate({ proposedStrategy: 'id', proposedValue: 'btn', domEvidence: { matchedPath: 'button', matchedTag: 'button', stableAttributeMatches: [] } });

    const indicators = detector.detect(
      [{ stepIndex: 0, actionType: 'click', matchedElement: { tagName: 'button', attributes: { id: 'btn' }, visible: true, interactable: true }, interactable: true, visible: true, navigationChanged: false, url: 'https://example.com', timing: 0, consoleErrors: [] }],
      proposal,
      [],
    );

    expect(indicators).toHaveLength(0);
  });
});

// ─── ReplayCoordinator Tests ──────────────────────────────────────

describe('ReplayCoordinator', () => {
  let browser: MockBrowserEngine;

  beforeEach(() => {
    browser = new MockBrowserEngine();
    browser.mockDom = [makeNode({ tagName: 'button', attributes: { id: 'submit-btn', 'data-testid': 'submit' }, textContent: 'Submit' })];
  });

  it('replays session steps in order', async () => {
    const coordinator = new ReplayCoordinator(browser);
    const steps = [
      makeStep({ actionType: 'goto', pageUrl: 'https://example.com' }),
      makeStep({ actionType: 'click', locatorRef: { strategy: 'id', value: 'submit-btn', expression: '#submit-btn' } }),
    ];
    const session = makeSession({ steps });

    const result = await coordinator.replay(session);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.executedStepCount).toBe(2);
    expect(result.value.evidence).toHaveLength(2);
  });

  it('reports divergence when step fails', async () => {
    browser.failNextAction = true;
    browser.failNextActionError = 'Element not found';

    const coordinator = new ReplayCoordinator(browser);
    const steps = [
      makeStep({ actionType: 'goto', pageUrl: 'https://example.com' }),
      makeStep({ actionType: 'click', locatorRef: { strategy: 'id', value: 'missing', expression: '#missing' } }),
    ];
    const session = makeSession({ steps });

    const result = await coordinator.replay(session);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.divergences.length).toBeGreaterThan(0);
  });

  it('injects proposal locator at specified step', async () => {
    const coordinator = new ReplayCoordinator(browser);
    const steps = [
      makeStep({ actionType: 'goto', pageUrl: 'https://example.com' }),
      makeStep({ actionType: 'click', locatorRef: { strategy: 'id', value: 'old-btn', expression: '#old-btn' } }),
    ];
    const session = makeSession({ steps });
    const proposal = makeCandidate({ proposedStrategy: 'id', proposedValue: 'submit-btn', domEvidence: { matchedPath: 'button', matchedTag: 'button', stableAttributeMatches: [] } });

    const result = await coordinator.replay(session, {}, proposal, 1);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.executedStepCount).toBe(2);
  });

  it('builds validation result with correct status for passing replay', async () => {
    const coordinator = new ReplayCoordinator(browser);
    const steps = [makeStep({ actionType: 'click', locatorRef: { strategy: 'id', value: 'submit-btn', expression: '#submit-btn' } })];
    const session = makeSession({ steps });
    const proposal = makeCandidate({ proposedStrategy: 'id', proposedValue: 'submit-btn', domEvidence: { matchedPath: 'button', matchedTag: 'button', stableAttributeMatches: [] } });
    const browserMetadata = { browserName: 'chromium' };

    const replayResult = await coordinator.replay(session);
    expect(replayResult.ok).toBe(true);
    if (!replayResult.ok) return;

    const validationResult = coordinator.buildValidationResult(replayResult.value, session, proposal, browserMetadata);
    expect(validationResult.status).toBe('passed');
    expect(validationResult.runtimeConfidence).toBeGreaterThan(0.5);
    expect(validationResult.proposalId).toBe('cand-1');
    expect(validationResult.replaySessionId).toBe('session-1');
  });
});

// ─── ReplayRuntime Tests ──────────────────────────────────────────

describe('ReplayRuntime', () => {
  let browser: MockBrowserEngine;
  let tempDir: string;

  beforeEach(() => {
    browser = new MockBrowserEngine();
    browser.mockDom = [makeNode({ tagName: 'button', attributes: { id: 'submit-btn', 'data-testid': 'submit' }, textContent: 'Submit' })];
    tempDir = getTempDir();
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('validates a proposal successfully', async () => {
    const runtime = new ReplayRuntime(browser, tempDir);
    const steps = [
      makeStep({ actionType: 'goto', pageUrl: 'https://example.com' }),
      makeStep({ actionType: 'click', locatorRef: { strategy: 'id', value: 'old-btn', expression: '#old-btn' } }),
    ];
    const session = makeSession({ steps });
    const proposal = makeCandidate({ proposedStrategy: 'id', proposedValue: 'submit-btn', domEvidence: { matchedPath: 'button', matchedTag: 'button', stableAttributeMatches: [] } });

    const result = await runtime.validate(session, proposal, 1);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('passed');
    expect(result.value.runtimeConfidence).toBeGreaterThan(0.5);
    expect(result.value.proposalId).toBe('cand-1');
    expect(result.value.replaySessionId).toBe('session-1');
    expect(result.value.executedStepCount).toBe(2);
  });

  it('detects false positive via runtime', async () => {
    browser.mockDom = [makeNode({ tagName: 'button', attributes: { id: 'wrong-btn', 'data-testid': 'submit' }, visible: false })];
    const runtime = new ReplayRuntime(browser, tempDir);
    const steps = [makeStep({ actionType: 'click', locatorRef: { strategy: 'id', value: 'old-btn', expression: '#old-btn' } })];
    const session = makeSession({ steps });
    const proposal = makeCandidate({ proposedStrategy: 'testid', proposedValue: 'submit', domEvidence: { matchedPath: 'button', matchedTag: 'button', stableAttributeMatches: ['data-testid'] } });

    const result = await runtime.validate(session, proposal, 0);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.falsePositiveIndicators.some(i => i.type === 'hidden-element')).toBe(true);
  });

  it('detects replay divergence', async () => {
    browser.failNextAction = true;
    browser.failNextActionError = 'Navigation failed';

    const runtime = new ReplayRuntime(browser, tempDir);
    const steps = [makeStep({ actionType: 'click', locatorRef: { strategy: 'id', value: 'missing', expression: '#missing' } })];
    const session = makeSession({ steps });
    const proposal = makeCandidate({ proposedStrategy: 'id', proposedValue: 'missing', domEvidence: { matchedPath: 'button', matchedTag: 'button', stableAttributeMatches: [] } });

    const result = await runtime.validate(session, proposal, 0);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('diverged');
    expect(result.value.replayDivergence.length).toBeGreaterThan(0);
  });

  it('persists and loads runtime results', async () => {
    const runtime = new ReplayRuntime(browser, tempDir);
    const steps = [makeStep({ actionType: 'click', locatorRef: { strategy: 'id', value: 'submit-btn', expression: '#submit-btn' } })];
    const session = makeSession({ steps });
    const proposal = makeCandidate({ proposedStrategy: 'id', proposedValue: 'submit-btn', domEvidence: { matchedPath: 'button', matchedTag: 'button', stableAttributeMatches: [] } });

    const validateResult = await runtime.validate(session, proposal, 0);
    expect(validateResult.ok).toBe(true);
    if (!validateResult.ok) return;

    const persistResult = await runtime.persist(validateResult.value);
    expect(persistResult.ok).toBe(true);

    const loadResult = await runtime.load(validateResult.value.id);
    expect(loadResult.ok).toBe(true);
    if (!loadResult.ok) return;
    expect(loadResult.value.id).toBe(validateResult.value.id);
    expect(loadResult.value.status).toBe('passed');
  });

  it('validates batch proposals', async () => {
    const runtime = new ReplayRuntime(browser, tempDir);
    const steps = [makeStep({ actionType: 'click', locatorRef: { strategy: 'id', value: 'old-btn', expression: '#old-btn' } })];
    const session = makeSession({ steps });
    const proposal1 = makeCandidate({ id: 'cand-a', locatorId: 'loc-1', proposedStrategy: 'id', proposedValue: 'submit-btn', domEvidence: { matchedPath: 'button', matchedTag: 'button', stableAttributeMatches: [] } });
    const proposal2 = makeCandidate({ id: 'cand-b', locatorId: 'loc-1', proposedStrategy: 'testid', proposedValue: 'submit', domEvidence: { matchedPath: 'button', matchedTag: 'button', stableAttributeMatches: ['data-testid'] } });

    const result = await runtime.validateBatch(session, [proposal1, proposal2], 0);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(2);
  });

  it('shuts down browser cleanly', async () => {
    const runtime = new ReplayRuntime(browser, tempDir);
    const result = await runtime.shutdown();
    expect(result.ok).toBe(true);
  });

  it('produces deterministic results for same inputs', async () => {
    const runtime = new ReplayRuntime(browser, tempDir);
    const steps = [makeStep({ actionType: 'click', locatorRef: { strategy: 'id', value: 'submit-btn', expression: '#submit-btn' } })];
    const session = makeSession({ steps });
    const proposal = makeCandidate({ proposedStrategy: 'id', proposedValue: 'submit-btn', domEvidence: { matchedPath: 'button', matchedTag: 'button', stableAttributeMatches: [] } });

    const r1 = await runtime.validate(session, proposal, 0);
    const r2 = await runtime.validate(session, proposal, 0);

    expect(r1.ok).toBe(r2.ok);
    if (!r1.ok || !r2.ok) return;
    expect(r1.value.status).toBe(r2.value.status);
    expect(r1.value.runtimeConfidence).toBe(r2.value.runtimeConfidence);
  });

  it('lists persisted results', async () => {
    const runtime = new ReplayRuntime(browser, tempDir);
    const steps = [makeStep({ actionType: 'click', locatorRef: { strategy: 'id', value: 'submit-btn', expression: '#submit-btn' } })];
    const session = makeSession({ steps });
    const proposal = makeCandidate({ proposedStrategy: 'id', proposedValue: 'submit-btn', domEvidence: { matchedPath: 'button', matchedTag: 'button', stableAttributeMatches: [] } });

    const vr = await runtime.validate(session, proposal, 0);
    expect(vr.ok).toBe(true);
    if (!vr.ok) return;
    await runtime.persist(vr.value);

    const list = await runtime.listResults();
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.value.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── RuntimePersister Tests ───────────────────────────────────────

describe('RuntimePersister', () => {
  let tempDir: string;
  let persister: RuntimePersister;

  beforeEach(() => {
    tempDir = getTempDir();
    persister = new RuntimePersister(tempDir);
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('saves and loads a runtime result', async () => {
    const result: RuntimeValidationResult = {
      id: 'test-runtime-1',
      replaySessionId: 'session-1',
      proposalId: 'cand-1',
      status: 'passed',
      executedStepCount: 2,
      totalStepCount: 2,
      runtimeConfidence: 0.85,
      runtimeEvidence: [],
      timingMetadata: { startedAt: 0, finishedAt: 0, totalDuration: 0, stepDurations: [] },
      browserMetadata: { browserName: 'chromium' },
      replayDivergence: [],
      falsePositiveIndicators: [],
      createdAt: Date.now(),
    };

    const saveResult = await persister.save(result);
    expect(saveResult.ok).toBe(true);

    const loadResult = await persister.load('test-runtime-1');
    expect(loadResult.ok).toBe(true);
    if (!loadResult.ok) return;
    expect(loadResult.value.status).toBe('passed');
    expect(loadResult.value.runtimeConfidence).toBe(0.85);
  });

  it('lists all persisted results', async () => {
    const r1: RuntimeValidationResult = {
      id: 'r1', replaySessionId: 's1', proposalId: 'p1', status: 'passed',
      executedStepCount: 1, totalStepCount: 1, runtimeConfidence: 0.9,
      runtimeEvidence: [], timingMetadata: { startedAt: 1, finishedAt: 2, totalDuration: 1, stepDurations: [1] },
      browserMetadata: { browserName: 'chromium' }, replayDivergence: [], falsePositiveIndicators: [], createdAt: 100,
    };
    const r2: RuntimeValidationResult = {
      id: 'r2', replaySessionId: 's2', proposalId: 'p2', status: 'failed',
      executedStepCount: 0, totalStepCount: 1, runtimeConfidence: 0,
      runtimeEvidence: [], timingMetadata: { startedAt: 3, finishedAt: 4, totalDuration: 1, stepDurations: [] },
      browserMetadata: { browserName: 'chromium' }, replayDivergence: [], falsePositiveIndicators: [], createdAt: 200,
    };

    await persister.save(r1);
    await persister.save(r2);

    const list = await persister.list();
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.value).toHaveLength(2);
  });

  it('returns error for non-existent load', async () => {
    const result = await persister.load('non-existent');
    expect(result.ok).toBe(false);
  });

  it('deletes a runtime result', async () => {
    const result: RuntimeValidationResult = {
      id: 'to-delete', replaySessionId: 's', proposalId: 'p', status: 'passed',
      executedStepCount: 1, totalStepCount: 1, runtimeConfidence: 0.5,
      runtimeEvidence: [], timingMetadata: { startedAt: 0, finishedAt: 0, totalDuration: 0, stepDurations: [] },
      browserMetadata: { browserName: 'chromium' }, replayDivergence: [], falsePositiveIndicators: [], createdAt: 0,
    };

    await persister.save(result);
    let list = await persister.list();
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.value).toHaveLength(1);

    await persister.delete('to-delete');
    list = await persister.list();
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.value).toHaveLength(0);
  });

  it('clears all results', async () => {
    const r: RuntimeValidationResult = {
      id: 'clear-test', replaySessionId: 's', proposalId: 'p', status: 'passed',
      executedStepCount: 1, totalStepCount: 1, runtimeConfidence: 0.5,
      runtimeEvidence: [], timingMetadata: { startedAt: 0, finishedAt: 0, totalDuration: 0, stepDurations: [] },
      browserMetadata: { browserName: 'chromium' }, replayDivergence: [], falsePositiveIndicators: [], createdAt: 0,
    };

    await persister.save(r);
    await persister.clear();

    const list = await persister.list();
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.value).toHaveLength(0);
  });

  it('handles empty directory gracefully', async () => {
    const list = await persister.list();
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.value).toHaveLength(0);
  });
});
