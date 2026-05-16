import { describe, it, expect } from 'vitest';
import type { ElementNode } from '../../src/models/snapshot.js';
import type { Locator } from '../../src/models/locator.js';
import type { Result } from '../../src/models/result.js';
import type { BrowserContextState, NavigationResult, InteractionResult, MatchedElement, BrowserConfig, DomSnapshot } from '../../src/models/runtime.js';
import type { BrowserEngine } from '../../src/core/runtime/browser.js';
import { HealingPipeline } from '../../src/core/pipeline/healing-pipeline.js';
import { success } from '../../src/models/result.js';

// ─── Helpers ──────────────────────────────────────────────────────

function makeNode(overrides: Partial<ElementNode> & { tagName: string }): ElementNode {
  return {
    attributes: {},
    children: [],
    visible: true,
    ...overrides,
  };
}

function makeLocator(overrides: Partial<Locator> & { id: string; value: string }): Locator {
  return {
    strategy: 'css',
    expression: overrides.value,
    sourceFile: 'test.spec.ts',
    sourceLine: 1,
    propertyName: null,
    verified: false,
    ...overrides,
  };
}

class MockBrowserEngine implements BrowserEngine {
  private _isLaunched = false;
  private _ctxCounter = 0;
  mockDom: ElementNode[] = [];
  mockCurrentUrl = 'https://example.com';

  async launch(_config?: BrowserConfig): Promise<Result<void>> {
    this._isLaunched = true;
    return success(undefined);
  }

  async close(): Promise<Result<void>> {
    this._isLaunched = false;
    return success(undefined);
  }

  async createContext(): Promise<Result<BrowserContextState>> {
    if (!this._isLaunched) return { ok: false, error: 'Not launched' } as any;
    return success({ id: `pipeline-mock-ctx-${this._ctxCounter++}`, currentUrl: this.mockCurrentUrl, currentFrame: 'main' });
  }

  async closeContext(_context: BrowserContextState): Promise<Result<void>> {
    return success(undefined);
  }

  async goto(_context: BrowserContextState, url: string): Promise<Result<NavigationResult>> {
    return success({ url, title: 'Mock', timing: 10 });
  }

  async click(_context: BrowserContextState, _strategy: string, value: string): Promise<Result<InteractionResult>> {
    const el = this.resolveElementInDom(value);
    if (!el) return success({ success: false, timing: 0, error: 'Not found' });
    return success({ success: true, matchedElement: { tagName: el.tagName, attributes: el.attributes, visible: true, interactable: true }, timing: 10 });
  }

  async fill(_context: BrowserContextState, _strategy: string, value: string, _text: string): Promise<Result<InteractionResult>> {
    const el = this.resolveElementInDom(value);
    if (!el) return success({ success: false, timing: 0, error: 'Not found' });
    if (el.tagName !== 'input' && el.tagName !== 'textarea') {
      return success({ success: false, timing: 0, error: 'Not fillable' });
    }
    return success({ success: true, timing: 10 });
  }

  async press(_context: BrowserContextState, _strategy: string, _value: string, _key: string): Promise<Result<InteractionResult>> {
    return success({ success: true, timing: 10 });
  }

  async select(_context: BrowserContextState, _strategy: string, _value: string, _option: string): Promise<Result<InteractionResult>> {
    return success({ success: true, timing: 10 });
  }

  async wait(_context: BrowserContextState, _timeout: number): Promise<Result<void>> {
    return success(undefined);
  }

  async captureSnapshot(_context: BrowserContextState): Promise<Result<DomSnapshot>> {
    return success({
      id: 'mock-snap', traceId: 'pipeline', eventIndex: 0, capturedAt: Date.now(),
      url: 'https://example.com', viewport: { width: 1280, height: 720 },
    });
  }

  async getCurrentUrl(_context: BrowserContextState): Promise<string> {
    return this.mockCurrentUrl;
  }

  async getConsoleErrors(_context: BrowserContextState): Promise<string[]> {
    return [];
  }

  async resolveElement(_context: BrowserContextState, _strategy: string, value: string): Promise<Result<MatchedElement[]>> {
    const el = this.resolveElementInDom(value);
    if (!el) return success([]);
    return success([{ tagName: el.tagName, attributes: el.attributes, visible: true, interactable: true }]);
  }

  private resolveElementInDom(value: string): ElementNode | undefined {
    const flat = this.flattenDom(this.mockDom);
    return flat.find(n =>
      n.attributes['id'] === value ||
      n.attributes['data-testid'] === value ||
      n.tagName.toLowerCase() === value.toLowerCase(),
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

// ─── Pipeline Tests ──────────────────────────────────────────────

describe('HealingPipeline', () => {
  it('runs full pipeline with validation only (no browser)', async () => {
    const originalDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { id: 'submit', 'data-testid': 'submit-btn' }, textContent: 'Submit' }),
    ];
    const currentDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { id: 'new-submit', 'data-testid': 'submit-btn' }, textContent: 'Submit' }),
    ];
    const locator = makeLocator({ id: 'loc-1', value: '#submit' });

    const pipeline = new HealingPipeline();
    const result = await pipeline.run({
      locator,
      originalDom,
      currentDom,
      stepIndex: 0,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.stagesCompleted).toContain('healing');
    expect(result.value.stagesCompleted).toContain('validation');
    expect(result.value.stagesCompleted).not.toContain('runtime');
    expect(result.value.candidates.length).toBeGreaterThan(0);
    expect(result.value.validationResults.length).toBeGreaterThan(0);
    expect(result.value.summary.totalCandidates).toBeGreaterThan(0);
    expect(result.value.summary.passedValidationCount).toBeGreaterThan(0);
    expect(result.value.summary.status).toBe('completed');
  });

  it('runs full pipeline with browser validation', async () => {
    const originalDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { id: 'submit', 'data-testid': 'submit-btn' }, textContent: 'Submit' }),
    ];
    const currentDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { id: 'new-submit', 'data-testid': 'submit-btn' }, textContent: 'Submit' }),
    ];
    const locator = makeLocator({ id: 'loc-2', value: '#submit' });
    const browser = new MockBrowserEngine();
    browser.mockDom = currentDom;

    const replaySession = {
      id: 'pipe-session-1',
      traceId: 'pipe-trace',
      testName: 'pipeline test',
      testFile: 'test.spec.ts',
      framework: 'playwright',
      schemaVersion: 1,
      entryUrl: '',
      urlTransitions: [],
      redirectChain: [],
      frameContext: [],
      modalDialogContext: [],
      steps: [{
        stepId: 'step-1',
        timestamp: Date.now(),
        actionType: 'click' as const,
        pageUrl: '',
        result: { success: true, duration: 10 },
        navigationContext: { url: '' },
      }],
      createdAt: Date.now(),
    };

    const pipeline = new HealingPipeline();
    const result = await pipeline.run({
      locator,
      originalDom,
      currentDom,
      replaySession,
      stepIndex: 0,
      browser,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.stagesCompleted).toContain('healing');
    expect(result.value.stagesCompleted).toContain('validation');
    expect(result.value.stagesCompleted).toContain('runtime');
    expect(result.value.runtimeResult).toBeDefined();
    if (result.value.runtimeResult) {
      expect(result.value.runtimeResult.executedStepCount).toBe(1);
      expect(result.value.runtimeResult.runtimeConfidence).toBeGreaterThan(0);
    }
    expect(result.value.summary.runtimeValidated).toBe(true);
  });

  it('tracks pipeline summary correctly', async () => {
    const originalDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { id: 'old-id', 'data-testid': 'test-btn' }, textContent: 'Click' }),
    ];
    const currentDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { id: 'new-id', 'data-testid': 'test-btn' }, textContent: 'Click' }),
    ];
    const locator = makeLocator({ id: 'loc-summary', value: '#old-id' });

    const pipeline = new HealingPipeline();
    const result = await pipeline.run({ locator, originalDom, currentDom, stepIndex: 0 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const summary = result.value.summary;
    expect(summary.totalCandidates).toBeGreaterThan(0);
    expect(summary.validatedCount).toBe(summary.totalCandidates);
    expect(summary.runtimeValidated).toBe(false);
    expect(summary.runtimePassed).toBe(false);
    expect(summary.bestCandidateId).toBeTruthy();
    expect(summary.duration).toBeGreaterThanOrEqual(0);
  });

  it('returns partial status when no validation passes', async () => {
    const originalDom: ElementNode[] = [
      makeNode({ tagName: 'div', attributes: { id: 'old' } }),
    ];
    const currentDom: ElementNode[] = [
      makeNode({ tagName: 'section' }),
    ];
    const locator = makeLocator({ id: 'loc-fail', value: '#old' });

    const pipeline = new HealingPipeline();
    const result = await pipeline.run({ locator, originalDom, currentDom, stepIndex: 0 });

    expect(result.ok).toBe(false);
  });

  it('provides deterministic results for same inputs', async () => {
    const originalDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { 'data-testid': 'login' }, textContent: 'Login' }),
    ];
    const currentDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { 'data-testid': 'login', id: 'new-login' }, textContent: 'Login' }),
    ];
    const locator = makeLocator({ id: 'loc-d' });

    const pipeline1 = new HealingPipeline();
    const pipeline2 = new HealingPipeline();

    const r1 = await pipeline1.run({ locator, originalDom, currentDom, stepIndex: 0 });
    const r2 = await pipeline2.run({ locator, originalDom, currentDom, stepIndex: 0 });

    expect(r1.ok).toBe(r2.ok);
    if (!r1.ok || !r2.ok) return;
    expect(r1.value.candidates.length).toBe(r2.value.candidates.length);
    expect(r1.value.validationResults.length).toBe(r2.value.validationResults.length);
  });
});
