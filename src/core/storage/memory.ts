/**
 * MemoryStorage — in-memory implementation of StorageProvider.
 *
 * Used during analysis sessions before data is flushed to disk.
 * Also useful for testing without touching the filesystem.
 *
 * @implements StorageProvider
 */

import type { StorageProvider } from '../../interfaces/storage.js';
import type { Result } from '../../models/result.js';
import type { ExecutionTrace, TraceSummary } from '../../models/trace.js';
import type { LocatorIndexEntry } from '../../models/locator.js';
import type { DomSnapshot } from '../../models/snapshot.js';
import type { HealingHistoryEntry } from '../../models/healing.js';
import type { Patch } from '../../models/patch.js';
import type { FrameworkMap, LocatorRecord, AnalysisMeta } from '../analyzer/types.js';

export class MemoryStorage implements StorageProvider {
  private metadata: Record<string, unknown> = {};
  private traces: Map<string, ExecutionTrace> = new Map();
  private locatorEntries: LocatorIndexEntry[] = [];
  private snapshots: Map<string, { snapshot: DomSnapshot; html: string }> = new Map();
  private healingHistory: HealingHistoryEntry[] = [];
  private patches: Map<string, Patch> = new Map();

  async readMetadata(): Promise<Result<Record<string, unknown>>> {
    return { ok: true, value: this.metadata };
  }

  async writeMetadata(data: Record<string, unknown>): Promise<Result<void>> {
    this.metadata = data;
    return { ok: true, value: undefined };
  }

  async saveTrace(trace: ExecutionTrace): Promise<Result<void>> {
    this.traces.set(trace.id, trace);
    return { ok: true, value: undefined };
  }

  async getTrace(id: string): Promise<Result<ExecutionTrace>> {
    const trace = this.traces.get(id);
    return trace ? { ok: true, value: trace } : { ok: false, error: `Trace ${id} not found` };
  }

  async listTraces(limit?: number): Promise<Result<TraceSummary[]>> {
    const all = Array.from(this.traces.values()).map(t => ({
      id: t.id, testName: t.testName, testFile: t.testFile,
      framework: t.framework, passed: t.passed, duration: t.duration,
      eventCount: t.events.length, failureCount: t.events.filter(e => !e.success).length,
      executedAt: t.startedAt,
    }));
    return { ok: true, value: limit ? all.slice(0, limit) : all };
  }

  async listTracesByFile(filePath: string): Promise<Result<TraceSummary[]>> {
    const all = Array.from(this.traces.values())
      .filter(t => t.testFile === filePath)
      .map(t => ({
        id: t.id, testName: t.testName, testFile: t.testFile,
        framework: t.framework, passed: t.passed, duration: t.duration,
        eventCount: t.events.length, failureCount: t.events.filter(e => !e.success).length,
        executedAt: t.startedAt,
      }));
    return { ok: true, value: all };
  }

  async saveLocatorIndex(entries: LocatorIndexEntry[]): Promise<Result<void>> {
    this.locatorEntries = entries;
    return { ok: true, value: undefined };
  }

  async loadLocatorIndex(): Promise<Result<LocatorIndexEntry[]>> {
    return { ok: true, value: this.locatorEntries };
  }

  async saveSnapshot(snapshot: DomSnapshot, html: string): Promise<Result<void>> {
    this.snapshots.set(snapshot.id, { snapshot, html });
    return { ok: true, value: undefined };
  }

  async getSnapshot(id: string): Promise<Result<{ snapshot: DomSnapshot; html: string }>> {
    const entry = this.snapshots.get(id);
    return entry ? { ok: true, value: entry } : { ok: false, error: `Snapshot ${id} not found` };
  }

  async saveHealingEntry(entry: HealingHistoryEntry): Promise<Result<void>> {
    this.healingHistory.push(entry);
    return { ok: true, value: undefined };
  }

  async listHealingHistory(): Promise<Result<HealingHistoryEntry[]>> {
    return { ok: true, value: this.healingHistory };
  }

  async savePatch(patch: Patch): Promise<Result<void>> {
    this.patches.set(patch.id, patch);
    return { ok: true, value: undefined };
  }

  async listPatches(status?: string): Promise<Result<Patch[]>> {
    const all = Array.from(this.patches.values());
    return { ok: true, value: status ? all.filter(p => p.status === status) : all };
  }

  async updatePatchStatus(id: string, status: string): Promise<Result<void>> {
    const patch = this.patches.get(id);
    if (!patch) return { ok: false, error: `Patch ${id} not found` };
    patch.status = status as Patch['status'];
    return { ok: true, value: undefined };
  }

  async saveAnalysis(
    _projectRoot: string,
    _frameworkMap: FrameworkMap,
    _locatorRecords: LocatorRecord[],
    _analysisMeta: AnalysisMeta,
  ): Promise<Result<void>> {
    return { ok: true, value: undefined };
  }
}
