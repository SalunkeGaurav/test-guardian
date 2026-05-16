import { performance } from 'node:perf_hooks';
import type { Page, Locator, TestInfo } from 'playwright-core';
import type { ExecutionTrace, TraceEvent, TraceEventType } from '../../../models/trace.js';
import type { DomSnapshot } from '../../../models/snapshot.js';

const ACTION_METHODS = new Set([
  'click', 'dblclick', 'fill', 'type', 'clear', 'press',
  'selectOption', 'check', 'uncheck', 'hover', 'focus', 'tap',
  'dispatchEvent', 'scrollIntoViewIfNeeded', 'selectText',
  'setInputFiles', 'tripleclick',
]);

export class TraceRecorder {
  private events: TraceEvent[] = [];
  private startTime: number;
  private navigations: string[] = [];
  private snapshotRefs: string[] = [];
  private snapshotCount = 0;

  constructor(
    private readonly testFile: string,
    private readonly testName: string,
  ) {
    this.startTime = performance.now();
  }

  relativeTime(): number {
    return Math.round(performance.now() - this.startTime);
  }

  pushEvent(event: Omit<TraceEvent, 'timestamp'>): void {
    this.events.push({
      ...event,
      timestamp: this.relativeTime(),
    } as TraceEvent);
  }

  /** Called when page navigates to a new URL. */
  onNavigation(url: string): void {
    this.navigations.push(url);
    this.pushEvent({
      type: 'navigation',
      duration: 0,
      resolvedSelector: url,
      success: true,
    });
  }

  /** Called when a locator action is performed (click, fill, etc.). */
  onLocatorAction(method: string, strategy: string, value: string, durationMs: number, success: boolean, error?: string): void {
    const eventType = mapMethodToEventType(method);
    const locatorExpr = strategy === 'css' ? value : `${strategy}:${value}`;
    this.pushEvent({
      type: eventType,
      duration: durationMs,
      locator: locatorExpr,
      resolvedSelector: value,
      success,
      error,
    });
  }

  /** Called when a locator is resolved (but not yet acted upon). */
  onLocatorResolve(strategy: string, value: string, success: boolean): void {
    this.pushEvent({
      type: 'locator_resolve',
      duration: 0,
      locator: strategy === 'css' ? value : `${strategy}:${value}`,
      success,
    });
  }

  /** Called when an assertion runs. */
  onAssertion(durationMs: number, success: boolean, error?: string): void {
    this.pushEvent({
      type: 'assertion',
      duration: durationMs,
      success,
      error,
    });
  }

  /** Called on error. */
  onError(message: string): void {
    this.pushEvent({
      type: 'error',
      duration: 0,
      success: false,
      error: message,
    });
  }

  /** Capture a DOM snapshot of the current page state. */
  async captureSnapshot(page: Page, testInfo: TestInfo): Promise<string | null> {
    this.snapshotCount++;
    const snapshotId = `snap_${testInfo.testId}_${this.snapshotCount}`;
    try {
      const html = await page.content();
      const url = page.url();
      const snapshot: DomSnapshot = {
        id: snapshotId,
        traceId: '',
        eventIndex: this.events.length,
        capturedAt: Date.now(),
        url,
        viewport: page.viewportSize() ?? undefined,
        elementTree: [],
      };
      return snapshotId;
    } catch {
      return null;
    }
  }

  /** Build the final ExecutionTrace. */
  buildTrace(passed: boolean, error?: string): ExecutionTrace {
    const now = Date.now();
    const startMs = now - this.relativeTime();
    return {
      id: generateTraceId(),
      testFile: this.testFile,
      testName: this.testName,
      framework: 'playwright',
      startedAt: startMs,
      finishedAt: now,
      duration: this.relativeTime(),
      passed,
      events: this.events,
      error,
      metadata: {
        navigations: this.navigations,
        snapshotRefs: this.snapshotRefs,
      },
    };
  }

  getEvents(): readonly TraceEvent[] {
    return this.events;
  }
}

function mapMethodToEventType(method: string): TraceEventType {
  switch (method) {
    case 'click':
    case 'dblclick':
    case 'tap':
    case 'tripleclick':
      return 'click';
    case 'fill':
    case 'type':
    case 'clear':
    case 'press':
      return 'type';
    case 'selectOption':
      return 'select';
    case 'check':
    case 'uncheck':
      return 'click';
    case 'hover':
      return 'hover';
    case 'focus':
      return 'custom';
    default:
      return 'custom';
  }
}

function generateTraceId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `trace_${ts}_${rand}`;
}

/** Wraps a Playwright Locator to capture actions. */
export function wrapLocator(loc: Locator, strategy: string, value: string, recorder: TraceRecorder): Locator {
  return new Proxy(loc, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && ACTION_METHODS.has(prop)) {
        return async (...args: unknown[]) => {
          const start = performance.now();
          try {
            const result = await (target as any)[prop](...args);
            recorder.onLocatorAction(prop, strategy, value, Math.round(performance.now() - start), true);
            return result;
          } catch (err) {
            recorder.onLocatorAction(prop, strategy, value, Math.round(performance.now() - start), false, String(err));
            throw err;
          }
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}
