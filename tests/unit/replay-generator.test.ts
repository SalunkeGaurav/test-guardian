import { describe, it, expect, beforeEach } from 'vitest';
import { ReplayModelGenerator } from '../../src/core/replay/generator.js';
import { ReplaySessionPersister } from '../../src/core/replay/persister.js';
import { SCHEMA_VERSION } from '../../src/core/replay/schema.js';
import type { ExecutionTrace, TraceEvent } from '../../src/models/trace.js';

function makeEvent(overrides: Partial<TraceEvent> & { type: TraceEvent['type'] }): TraceEvent {
  return {
    timestamp: 0,
    duration: 10,
    success: true,
    ...overrides,
  };
}

function makeTrace(overrides: Partial<ExecutionTrace> & { events: TraceEvent[] }): ExecutionTrace {
  return {
    id: 'trace-1',
    testFile: 'tests/login.spec.ts',
    testName: 'should login successfully',
    framework: 'playwright',
    startedAt: 1000,
    finishedAt: 5000,
    duration: 4000,
    passed: true,
    ...overrides,
  };
}

describe('ReplayModelGenerator', () => {
  let generator: ReplayModelGenerator;

  beforeEach(() => {
    generator = new ReplayModelGenerator();
  });

  describe('generate', () => {
    it('produces a ReplaySession with correct schema version', () => {
      const trace = makeTrace({
        events: [
          makeEvent({ type: 'navigation', timestamp: 100, metadata: { url: 'https://example.com/login' } }),
          makeEvent({ type: 'click', timestamp: 200, locator: '#submit' }),
        ],
      });

      const result = generator.generate(trace);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.schemaVersion).toBe(SCHEMA_VERSION);
      expect(result.value.traceId).toBe('trace-1');
      expect(result.value.framework).toBe('playwright');
    });

    it('returns failure for empty trace', () => {
      const trace = makeTrace({ events: [] });
      const result = generator.generate(trace);
      expect(result.ok).toBe(false);
    });

    it('returns failure for trace with no replayable events', () => {
      const trace = makeTrace({
        events: [
          makeEvent({ type: 'screenshot', timestamp: 100 }),
          makeEvent({ type: 'hover', timestamp: 200 }),
        ],
      });
      const result = generator.generate(trace);
      expect(result.ok).toBe(false);
    });
  });

  describe('deterministic ordering', () => {
    it('preserves event ordering in generated steps', () => {
      const trace = makeTrace({
        events: [
          makeEvent({ type: 'navigation', timestamp: 100, metadata: { url: 'https://example.com/login' } }),
          makeEvent({ type: 'click', timestamp: 200, locator: '#username' }),
          makeEvent({ type: 'type', timestamp: 300, locator: '#username', metadata: { inputValue: 'admin' } }),
          makeEvent({ type: 'click', timestamp: 400, locator: '#submit' }),
        ],
      });

      const result = generator.generate(trace);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.steps).toHaveLength(4);
      expect(result.value.steps[0]!.actionType).toBe('goto');
      expect(result.value.steps[1]!.actionType).toBe('click');
      expect(result.value.steps[2]!.actionType).toBe('fill');
      expect(result.value.steps[3]!.actionType).toBe('click');
    });

    it('steps have monotonically increasing timestamps', () => {
      const trace = makeTrace({
        events: [
          makeEvent({ type: 'navigation', timestamp: 50, metadata: { url: 'https://example.com' } }),
          makeEvent({ type: 'click', timestamp: 150, locator: '#btn' }),
          makeEvent({ type: 'wait', timestamp: 250 }),
        ],
      });

      const result = generator.generate(trace);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      for (let i = 1; i < result.value.steps.length; i++) {
        expect(result.value.steps[i]!.timestamp).toBeGreaterThanOrEqual(
          result.value.steps[i - 1]!.timestamp,
        );
      }
    });
  });

  describe('navigation sequence reconstruction', () => {
    it('captures entry URL from navigation events', () => {
      const trace = makeTrace({
        events: [
          makeEvent({ type: 'navigation', timestamp: 100, metadata: { url: 'https://example.com/login' } }),
          makeEvent({ type: 'click', timestamp: 200, locator: '#btn' }),
        ],
      });

      const result = generator.generate(trace);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.entryUrl).toBe('https://example.com/login');
    });

    it('tracks URL transitions across navigation events', () => {
      const trace = makeTrace({
        events: [
          makeEvent({ type: 'navigation', timestamp: 100, metadata: { url: 'https://example.com/login' } }),
          makeEvent({ type: 'fill', timestamp: 200, locator: '#user', metadata: { inputValue: 'admin' } }),
          makeEvent({ type: 'click', timestamp: 300, locator: '#submit' }),
          makeEvent({ type: 'navigation', timestamp: 400, metadata: { url: 'https://example.com/dashboard' } }),
        ],
      });

      const result = generator.generate(trace);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.urlTransitions).toEqual([
        'https://example.com/login',
        'https://example.com/dashboard',
      ]);
    });

    it('captures redirect chain from navigation metadata', () => {
      const trace = makeTrace({
        events: [
          makeEvent({
            type: 'navigation', timestamp: 100,
            metadata: { url: 'https://example.com/final', redirectFrom: 'https://example.com/old' },
          }),
        ],
      });

      const result = generator.generate(trace);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.redirectChain).toContain('https://example.com/old');
      expect(result.value.redirectChain).toContain('https://example.com/final');
    });

    it('dereferences entry URL from trace metadata when available', () => {
      const trace = makeTrace({
        metadata: { entryUrl: 'https://example.com/from-meta' },
        events: [
          makeEvent({ type: 'click', timestamp: 100, locator: '#btn' }),
        ],
      });

      const result = generator.generate(trace);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.entryUrl).toBe('https://example.com/from-meta');
    });

    it('falls back to first step pageUrl when no navigation event exists', () => {
      const trace = makeTrace({
        events: [
          makeEvent({ type: 'click', timestamp: 100, locator: '#btn', metadata: { url: 'https://example.com/page' } }),
        ],
      });

      const result = generator.generate(trace);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.entryUrl).toBe('https://example.com/page');
    });
  });

  describe('action type normalization', () => {
    it('maps navigation to goto', () => {
      const result = generator.generate(makeTrace({
        events: [makeEvent({ type: 'navigation', metadata: { url: 'https://example.com' } })],
      }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.steps[0]!.actionType).toBe('goto');
    });

    it('maps click to click', () => {
      const result = generator.generate(makeTrace({
        events: [
          makeEvent({ type: 'navigation', metadata: { url: 'https://example.com' } }),
          makeEvent({ type: 'click', locator: '#btn' }),
        ],
      }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.steps[1]!.actionType).toBe('click');
    });

    it('maps type to fill', () => {
      const result = generator.generate(makeTrace({
        events: [
          makeEvent({ type: 'navigation', metadata: { url: 'https://example.com' } }),
          makeEvent({ type: 'type', locator: '#input', metadata: { inputValue: 'hello' } }),
        ],
      }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.steps[1]!.actionType).toBe('fill');
    });

    it('maps select to select', () => {
      const result = generator.generate(makeTrace({
        events: [
          makeEvent({ type: 'navigation', metadata: { url: 'https://example.com' } }),
          makeEvent({ type: 'select', locator: '#dropdown', metadata: { inputValue: 'option1' } }),
        ],
      }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.steps[1]!.actionType).toBe('select');
    });

    it('maps assertion to assertion', () => {
      const result = generator.generate(makeTrace({
        events: [
          makeEvent({ type: 'navigation', metadata: { url: 'https://example.com' } }),
          makeEvent({ type: 'assertion', locator: '.result' }),
        ],
      }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.steps[1]!.actionType).toBe('assertion');
    });

    it('maps wait to wait', () => {
      const result = generator.generate(makeTrace({
        events: [
          makeEvent({ type: 'navigation', metadata: { url: 'https://example.com' } }),
          makeEvent({ type: 'wait' }),
        ],
      }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.steps[1]!.actionType).toBe('wait');
    });
  });

  describe('locator interaction history', () => {
    it('preserves locator references on click steps', () => {
      const result = generator.generate(makeTrace({
        events: [
          makeEvent({ type: 'navigation', metadata: { url: 'https://example.com' } }),
          makeEvent({ type: 'click', locator: '#submit', resolvedSelector: '#submit' }),
        ],
      }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const step = result.value.steps[1]!;
      expect(step.locatorRef).toBeDefined();
      expect(step.locatorRef!.value).toBe('#submit');
    });

    it('preserves locator references on fill steps', () => {
      const result = generator.generate(makeTrace({
        events: [
          makeEvent({ type: 'navigation', metadata: { url: 'https://example.com' } }),
          makeEvent({ type: 'type', locator: '#email', metadata: { inputValue: 'a@b.com' } }),
        ],
      }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const step = result.value.steps[1]!;
      expect(step.locatorRef).toBeDefined();
      expect(step.locatorRef!.value).toBe('#email');
    });

    it('does not attach locatorRef to goto steps', () => {
      const result = generator.generate(makeTrace({
        events: [
          makeEvent({ type: 'navigation', timestamp: 100, metadata: { url: 'https://example.com' } }),
        ],
      }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.steps[0]!.locatorRef).toBeUndefined();
    });

    it('infers strategy from CSS locator syntax', () => {
      const result = generator.generate(makeTrace({
        events: [
          makeEvent({ type: 'navigation', metadata: { url: 'https://example.com' } }),
          makeEvent({ type: 'click', locator: '.btn-primary' }),
        ],
      }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.steps[1]!.locatorRef!.strategy).toBe('css');
    });

    it('infers strategy from XPath locator syntax', () => {
      const result = generator.generate(makeTrace({
        events: [
          makeEvent({ type: 'navigation', metadata: { url: 'https://example.com' } }),
          makeEvent({ type: 'click', locator: '//div[@id="main"]' }),
        ],
      }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.steps[1]!.locatorRef!.strategy).toBe('xpath');
    });
  });

  describe('state transition metadata', () => {
    it('preserves page URL in each step', () => {
      const result = generator.generate(makeTrace({
        events: [
          makeEvent({ type: 'navigation', timestamp: 100, metadata: { url: 'https://example.com/login' } }),
          makeEvent({ type: 'click', timestamp: 200, locator: '#btn' }),
        ],
      }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.steps[0]!.pageUrl).toBe('https://example.com/login');
      expect(result.value.steps[1]!.pageUrl).toBe('https://example.com/login');
    });

    it('preserves execution result metadata', () => {
      const result = generator.generate(makeTrace({
        events: [
          makeEvent({ type: 'navigation', metadata: { url: 'https://example.com' } }),
          makeEvent({
            type: 'click', locator: '#missing',
            success: false, duration: 500,
            error: 'Element not found',
          }),
        ],
      }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const step = result.value.steps[1]!;
      expect(step.result.success).toBe(false);
      expect(step.result.error).toBe('Element not found');
      expect(step.result.duration).toBe(500);
    });

    it('preserves snapshot reference when domSnapshotId is present', () => {
      const result = generator.generate(makeTrace({
        events: [
          makeEvent({ type: 'navigation', metadata: { url: 'https://example.com' } }),
          makeEvent({ type: 'click', locator: '#btn', domSnapshotId: 'snap-1', timestamp: 300 }),
        ],
      }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.steps[1]!.snapshotRef).toBeDefined();
      expect(result.value.steps[1]!.snapshotRef!.snapshotId).toBe('snap-1');
    });

    it('preserves frame context when available', () => {
      const result = generator.generate(makeTrace({
        events: [
          makeEvent({ type: 'navigation', metadata: { url: 'https://example.com' } }),
          makeEvent({ type: 'click', locator: '#iframe-btn', metadata: { frame: 'iframe-1' } }),
        ],
      }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.steps[1]!.navigationContext.frame).toBe('iframe-1');
    });

    it('detects frame context across events', () => {
      const result = generator.generate(makeTrace({
        events: [
          makeEvent({ type: 'navigation', metadata: { url: 'https://example.com' } }),
          makeEvent({ type: 'click', locator: '#btn', metadata: { frame: 'iframe-1' } }),
        ],
      }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.frameContext).toContain('iframe-1');
    });

    it('detects modal/dialog context', () => {
      const result = generator.generate(makeTrace({
        events: [
          makeEvent({ type: 'navigation', metadata: { url: 'https://example.com' } }),
          makeEvent({ type: 'click', locator: '#open-modal', metadata: { modal: true } }),
        ],
      }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.modalDialogContext).toContain('modal');
    });
  });

  describe('repeated locator interaction handling', () => {
    it('handles multiple clicks on same locator', () => {
      const result = generator.generate(makeTrace({
        events: [
          makeEvent({ type: 'navigation', metadata: { url: 'https://example.com' } }),
          makeEvent({ type: 'click', timestamp: 100, locator: '#counter' }),
          makeEvent({ type: 'click', timestamp: 200, locator: '#counter' }),
          makeEvent({ type: 'click', timestamp: 300, locator: '#counter' }),
        ],
      }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.steps).toHaveLength(4);
      expect(result.value.steps[0]!.actionType).toBe('goto');
      expect(result.value.steps[1]!.actionType).toBe('click');
      expect(result.value.steps[2]!.actionType).toBe('click');
      expect(result.value.steps[3]!.actionType).toBe('click');
      expect(result.value.steps[1]!.locatorRef!.value).toBe('#counter');
      expect(result.value.steps[2]!.locatorRef!.value).toBe('#counter');
      expect(result.value.steps[3]!.locatorRef!.value).toBe('#counter');
    });

    it('preserves fill steps with different values on same locator', () => {
      const result = generator.generate(makeTrace({
        events: [
          makeEvent({ type: 'navigation', metadata: { url: 'https://example.com' } }),
          makeEvent({ type: 'type', locator: '#field', metadata: { inputValue: 'first' } }),
          makeEvent({ type: 'type', locator: '#field', metadata: { inputValue: 'second' } }),
        ],
      }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.steps[1]!.inputPayload).toBe('first');
      expect(result.value.steps[2]!.inputPayload).toBe('second');
    });
  });

  describe('failed action preservation', () => {
    it('preserves failed steps in the session', () => {
      const result = generator.generate(makeTrace({
        events: [
          makeEvent({ type: 'navigation', metadata: { url: 'https://example.com' } }),
          makeEvent({ type: 'click', locator: '#missing', success: false, error: 'timeout' }),
        ],
      }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.steps).toHaveLength(2);
      expect(result.value.steps[1]!.result.success).toBe(false);
      expect(result.value.steps[1]!.result.error).toBe('timeout');
    });

    it('preserves failed navigations', () => {
      const result = generator.generate(makeTrace({
        events: [
          makeEvent({ type: 'navigation', metadata: { url: 'https://example.com/bad' }, success: false, error: 'ERR_CONNECTION_REFUSED' }),
        ],
      }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.steps[0]!.result.success).toBe(false);
      expect(result.value.steps[0]!.result.error).toBe('ERR_CONNECTION_REFUSED');
    });

    it('maps error events to wait steps with failed result', () => {
      const result = generator.generate(makeTrace({
        events: [
          makeEvent({ type: 'navigation', metadata: { url: 'https://example.com' } }),
          makeEvent({ type: 'error', success: false, error: 'Script error', duration: 5 }),
        ],
      }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.steps[1]!.actionType).toBe('wait');
      expect(result.value.steps[1]!.result.success).toBe(false);
      expect(result.value.steps[1]!.result.error).toBe('Script error');
    });
  });

  describe('malformed trace recovery', () => {
    it('handles trace with missing metadata gracefully', () => {
      const result = generator.generate(makeTrace({
        events: [
          // navigation without metadata.url
          makeEvent({ type: 'navigation', timestamp: 100 }),
          makeEvent({ type: 'click', timestamp: 200, locator: '#btn' }),
        ],
      }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.steps).toHaveLength(2);
      expect(result.value.steps[0]!.pageUrl).toBe('');
    });

    it('handles trace with no locator on fill step', () => {
      const result = generator.generate(makeTrace({
        events: [
          makeEvent({ type: 'navigation', metadata: { url: 'https://example.com' } }),
          makeEvent({ type: 'click', timestamp: 200 }),
        ],
      }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // Click without locator should still be included
      expect(result.value.steps).toHaveLength(2);
      expect(result.value.steps[1]!.locatorRef).toBeUndefined();
    });

    it('handles non-deterministic events by filtering them out', () => {
      const result = generator.generate(makeTrace({
        events: [
          makeEvent({ type: 'navigation', metadata: { url: 'https://example.com' } }),
          makeEvent({ type: 'screenshot' }),
          makeEvent({ type: 'scroll', x: 0, y: 100 }),
          makeEvent({ type: 'click', locator: '#btn' }),
        ],
      }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.steps).toHaveLength(2);
      expect(result.value.steps[0]!.actionType).toBe('goto');
      expect(result.value.steps[1]!.actionType).toBe('click');
    });

    it('handles trace with extremely large event count', () => {
      const events: TraceEvent[] = [
        makeEvent({ type: 'navigation', metadata: { url: 'https://example.com' } }),
      ];
      for (let i = 0; i < 1000; i++) {
        events.push(makeEvent({ type: 'click', locator: `#btn-${i}`, timestamp: 100 + i }));
      }

      const result = generator.generate(makeTrace({ events }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.steps.length).toBe(1001);
      expect(result.value.steps[1000]!.actionType).toBe('click');
      expect(result.value.steps[1000]!.locatorRef!.value).toBe('#btn-999');
    });
  });

  describe('replay session reproducibility', () => {
    it('produces consistent output for same input trace', () => {
      const events: TraceEvent[] = [
        makeEvent({ type: 'navigation', timestamp: 100, metadata: { url: 'https://example.com/login' } }),
        makeEvent({ type: 'fill', timestamp: 200, locator: '#user', metadata: { inputValue: 'admin' } }),
        makeEvent({ type: 'click', timestamp: 300, locator: '#submit' }),
      ];
      const trace = makeTrace({ events });

      const result1 = generator.generate(trace);
      const result2 = generator.generate(trace);

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
      if (!result1.ok || !result2.ok) return;

      // Same count, same types, same locators
      expect(result1.value.steps.length).toBe(result2.value.steps.length);
      for (let i = 0; i < result1.value.steps.length; i++) {
        expect(result1.value.steps[i]!.actionType).toBe(result2.value.steps[i]!.actionType);
        expect(result1.value.steps[i]!.locatorRef?.value).toBe(result2.value.steps[i]!.locatorRef?.value);
        expect(result1.value.steps[i]!.pageUrl).toBe(result2.value.steps[i]!.pageUrl);
      }
    });

    it('step IDs are unique even across generations', () => {
      const events: TraceEvent[] = [
        makeEvent({ type: 'navigation', timestamp: 100, metadata: { url: 'https://example.com' } }),
        makeEvent({ type: 'click', timestamp: 200, locator: '#btn' }),
      ];
      const trace = makeTrace({ events });

      const result1 = generator.generate(trace);
      const result2 = generator.generate(trace);

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
      if (!result1.ok || !result2.ok) return;

      const ids1 = result1.value.steps.map(s => s.stepId);
      const ids2 = result2.value.steps.map(s => s.stepId);
      const allUnique = new Set([...ids1, ...ids2]);
      expect(allUnique.size).toBe(ids1.length + ids2.length);
    });
  });
});

describe('ReplaySessionPersister', () => {
  let persister: ReplaySessionPersister;
  let generator: ReplayModelGenerator;
  const testRoot = '.testguardian-test-replay';

  beforeEach(() => {
    persister = new ReplaySessionPersister(testRoot);
    generator = new ReplayModelGenerator();
  });

  afterEach(async () => {
    await persister.clear();
  });

  it('saves and loads a replay session', async () => {
    const trace = makeTrace({
      id: 'trace-save-1',
      events: [
        makeEvent({ type: 'navigation', timestamp: 100, metadata: { url: 'https://example.com' } }),
        makeEvent({ type: 'click', timestamp: 200, locator: '#btn' }),
      ],
    });

    const genResult = generator.generate(trace);
    expect(genResult.ok).toBe(true);
    if (!genResult.ok) return;

    const saveResult = await persister.save(genResult.value);
    expect(saveResult.ok).toBe(true);

    const loadResult = await persister.load(genResult.value.id);
    expect(loadResult.ok).toBe(true);
    if (!loadResult.ok) return;

    expect(loadResult.value.id).toBe(genResult.value.id);
    expect(loadResult.value.steps).toHaveLength(2);
  });

  it('lists all saved sessions', async () => {
    const trace1 = makeTrace({
      id: 'trace-list-1',
      testName: 'test one',
      events: [
        makeEvent({ type: 'navigation', metadata: { url: 'https://example.com/a' } }),
      ],
    });
    const trace2 = makeTrace({
      id: 'trace-list-2',
      testName: 'test two',
      events: [
        makeEvent({ type: 'navigation', metadata: { url: 'https://example.com/b' } }),
      ],
    });

    const session1 = generator.generate(trace1);
    const session2 = generator.generate(trace2);
    expect(session1.ok).toBe(true);
    expect(session2.ok).toBe(true);
    if (!session1.ok || !session2.ok) return;

    await persister.save(session1.value);
    await persister.save(session2.value);

    const listResult = await persister.list();
    expect(listResult.ok).toBe(true);
    if (!listResult.ok) return;

    expect(listResult.value.length).toBe(2);
    const names = listResult.value.map(e => e.testName).sort();
    expect(names).toEqual(['test one', 'test two']);
  });

  it('deletes a saved session', async () => {
    const trace = makeTrace({
      id: 'trace-del-1',
      events: [
        makeEvent({ type: 'navigation', metadata: { url: 'https://example.com' } }),
      ],
    });

    const session = generator.generate(trace);
    expect(session.ok).toBe(true);
    if (!session.ok) return;

    await persister.save(session.value);
    expect((await persister.list()).value).toHaveLength(1);

    const delResult = await persister.delete(session.value.id);
    expect(delResult.ok).toBe(true);
    expect((await persister.list()).value).toHaveLength(0);
  });

  it('returns failure when loading nonexistent session', async () => {
    const result = await persister.load('nonexistent');
    expect(result.ok).toBe(false);
  });

  it('handles corrupt session file gracefully', async () => {
    const trace = makeTrace({
      id: 'trace-corrupt',
      events: [
        makeEvent({ type: 'navigation', metadata: { url: 'https://example.com' } }),
      ],
    });

    const session = generator.generate(trace);
    expect(session.ok).toBe(true);
    if (!session.ok) return;

    await persister.save(session.value);

    // Corrupt the saved file
    const { writeFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    writeFileSync(join(testRoot, '.testguardian', 'replay', `${session.value.id}.json`), '{invalid json');

    const loadResult = await persister.load(session.value.id);
    expect(loadResult.ok).toBe(false);
  });
});
