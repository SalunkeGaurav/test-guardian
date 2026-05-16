import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AuditPersister } from '../../src/core/pipeline/audit-persister.js';
import type { AuditTrailEntry } from '../../src/models/audit-trail.js';

function getTempDir(): string {
  const dir = join(tmpdir(), `tg-audit-test-${Date.now()}`);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function makeEntry(overrides: Partial<AuditTrailEntry> & { id: string }): AuditTrailEntry {
  return {
    pipelineRunId: 'run-1',
    locatorId: 'loc-1',
    timestamp: Date.now(),
    schemaVersion: 1,
    stageTimings: [{ stage: 'healing', startedAt: 0, finishedAt: 1, duration: 1 }],
    stageOutputs: [{ stage: 'healing', candidateCount: 1, success: true }],
    candidateIds: ['cand-1'],
    validationOutcomes: [],
    rejectionDecisions: [],
    explanations: [],
    finalStatus: 'completed',
    duration: 10,
    ...overrides,
  };
}

describe('AuditPersister', () => {
  let tempDir: string;
  let persister: AuditPersister;

  beforeEach(() => {
    tempDir = getTempDir();
    persister = new AuditPersister(tempDir);
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('saves and loads an audit entry', async () => {
    const entry = makeEntry({ id: 'audit-test-1' });

    const saveResult = await persister.save(entry);
    expect(saveResult.ok).toBe(true);

    const loadResult = await persister.load('audit-test-1');
    expect(loadResult.ok).toBe(true);
    if (!loadResult.ok) return;
    expect(loadResult.value.id).toBe('audit-test-1');
    expect(loadResult.value.finalStatus).toBe('completed');
  });

  it('lists persisted entries in reverse chronological order', async () => {
    const e1 = makeEntry({ id: 'a1', timestamp: 100, duration: 5 });
    const e2 = makeEntry({ id: 'a2', timestamp: 200, duration: 10 });

    await persister.save(e1);
    await persister.save(e2);

    const list = await persister.list();
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.value).toHaveLength(2);
    expect(list.value[0]!.id).toBe('a2');
    expect(list.value[1]!.id).toBe('a1');
  });

  it('deletes an audit entry by ID', async () => {
    const entry = makeEntry({ id: 'to-delete' });
    await persister.save(entry);

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

  it('clears all entries', async () => {
    await persister.save(makeEntry({ id: 'c1' }));
    await persister.save(makeEntry({ id: 'c2' }));
    await persister.clear();

    const list = await persister.list();
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.value).toHaveLength(0);
  });

  it('returns error for non-existent load', async () => {
    const result = await persister.load('non-existent');
    expect(result.ok).toBe(false);
  });

  it('handles empty directory gracefully', async () => {
    const list = await persister.list();
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.value).toHaveLength(0);
  });

  it('handles corrupt index file gracefully', async () => {
    await persister.save(makeEntry({ id: 'survivor' }));
    const list = await persister.list();
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.value.length).toBeGreaterThanOrEqual(1);
  });

  it('index contains summary of saved entry', async () => {
    await persister.save(makeEntry({ id: 'summary-test', finalStatus: 'partial', duration: 42, candidateIds: ['c1', 'c2'] }));

    const list = await persister.list();
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    const found = list.value.find(e => e.id === 'summary-test');
    expect(found).toBeDefined();
    expect(found!.finalStatus).toBe('partial');
    expect(found!.duration).toBe(42);
    expect(found!.candidateCount).toBe(2);
  });
});
