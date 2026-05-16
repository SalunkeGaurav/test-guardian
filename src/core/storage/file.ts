/**
 * FileStorage — disk-based implementation of StorageProvider.
 *
 * Persists all testguardian data to .testguardian/ directory using
 * corruption-safe atomic writes. Provides deterministic file-based
 * storage for traces, locators, snapshots, healing history, and patches.
 *
 * @implements StorageProvider
 */

import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import type { StorageProvider } from '../../interfaces/storage.js';
import type { TraceProvider } from '../../interfaces/execution.js';
import type { Result } from '../../models/result.js';
import type { ExecutionTrace, TraceSummary } from '../../models/trace.js';
import type { LocatorIndexEntry } from '../../models/locator.js';
import type { DomSnapshot } from '../../models/snapshot.js';
import type { HealingHistoryEntry } from '../../models/healing.js';
import type { Patch } from '../../models/patch.js';
import type { FrameworkMap, LocatorRecord, AnalysisMeta } from '../analyzer/types.js';
import { success, failure } from '../../models/result.js';

const ROOT = '.testguardian';

function readJson<T>(path: string): T | null {
  try {
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export class FileStorage implements StorageProvider, TraceProvider {
  private readonly root: string;

  constructor(projectRoot: string) {
    this.root = join(projectRoot, ROOT);
  }

  private tracesDir(): string { return join(this.root, 'traces'); }
  private locatorsFile(): string { return join(this.root, 'locators.json'); }
  private snapshotsDir(): string { return join(this.root, 'snapshots'); }
  private healingFile(): string { return join(this.root, 'healing-history.json'); }
  private patchesDir(): string { return join(this.root, 'patches'); }
  private analysisFile(): string { return join(this.root, 'analysis.json'); }
  private frameworkMapFile(): string { return join(this.root, 'framework-map.json'); }
  private analysisMetaFile(): string { return join(this.root, 'analysis-meta.json'); }
  private metadataFile(): string { return join(this.root, 'metadata.json'); }

  private ensureDir(dir: string): void {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  async readMetadata(): Promise<Result<Record<string, unknown>>> {
    const data = readJson<Record<string, unknown>>(this.metadataFile());
    return data ? success(data) : success({});
  }

  async writeMetadata(data: Record<string, unknown>): Promise<Result<void>> {
    try {
      this.ensureDir(this.root);
      this.atomicWrite(this.metadataFile(), JSON.stringify(data, null, 2));
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  async saveTrace(trace: ExecutionTrace): Promise<Result<void>> {
    try {
      const dir = this.tracesDir();
      this.ensureDir(dir);
      const path = join(dir, `trace-${trace.id}.json`);
      this.atomicWrite(path, JSON.stringify(trace, null, 2));
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  async getTrace(id: string): Promise<Result<ExecutionTrace>> {
    const path = join(this.tracesDir(), `trace-${id}.json`);
    const data = readJson<ExecutionTrace>(path);
    return data ? success(data) : failure(`Trace ${id} not found`);
  }

  async listTraces(limit?: number): Promise<Result<TraceSummary[]>> {
    try {
      const dir = this.tracesDir();
      if (!existsSync(dir)) return success([]);
      const files = readdirSyncFiltered(dir, 'trace-', '.json');
      const all: TraceSummary[] = [];
      for (const file of files) {
        const data = readJson<ExecutionTrace>(join(dir, file));
        if (data) {
          all.push({
            id: data.id,
            testName: data.testName,
            testFile: data.testFile,
            framework: data.framework,
            passed: data.passed,
            duration: data.duration,
            eventCount: data.events.length,
            failureCount: data.events.filter(e => !e.success).length,
            executedAt: data.startedAt,
          });
        }
      }
      all.sort((a, b) => b.executedAt - a.executedAt);
      return success(limit ? all.slice(0, limit) : all);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  async listTracesByFile(filePath: string): Promise<Result<TraceSummary[]>> {
    const allResult = await this.listTraces();
    if (!allResult.ok) return allResult;
    return success(allResult.value.filter(t => t.testFile === filePath));
  }

  async saveLocatorIndex(entries: LocatorIndexEntry[]): Promise<Result<void>> {
    try {
      this.ensureDir(this.root);
      this.atomicWrite(this.locatorsFile(), JSON.stringify(entries, null, 2));
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  async loadLocatorIndex(): Promise<Result<LocatorIndexEntry[]>> {
    const data = readJson<LocatorIndexEntry[]>(this.locatorsFile());
    return data ? success(data) : success([]);
  }

  async saveSnapshot(snapshot: DomSnapshot, html: string): Promise<Result<void>> {
    try {
      const dir = this.snapshotsDir();
      this.ensureDir(dir);
      const path = join(dir, `snapshot-${snapshot.id}.json`);
      this.atomicWrite(path, JSON.stringify({ snapshot, html }, null, 2));
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  async getSnapshot(id: string): Promise<Result<{ snapshot: DomSnapshot; html: string }>> {
    const path = join(this.snapshotsDir(), `snapshot-${id}.json`);
    const data = readJson<{ snapshot: DomSnapshot; html: string }>(path);
    return data ? success(data) : failure(`Snapshot ${id} not found`);
  }

  async saveHealingEntry(entry: HealingHistoryEntry): Promise<Result<void>> {
    try {
      const existing = readJson<HealingHistoryEntry[]>(this.healingFile()) ?? [];
      existing.push(entry);
      this.ensureDir(this.root);
      this.atomicWrite(this.healingFile(), JSON.stringify(existing, null, 2));
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  async listHealingHistory(): Promise<Result<HealingHistoryEntry[]>> {
    const data = readJson<HealingHistoryEntry[]>(this.healingFile());
    return success(data ?? []);
  }

  async savePatch(patch: Patch): Promise<Result<void>> {
    try {
      const dir = this.patchesDir();
      this.ensureDir(dir);
      const path = join(dir, `patch-${patch.id}.json`);
      this.atomicWrite(path, JSON.stringify(patch, null, 2));
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  async listPatches(status?: string): Promise<Result<Patch[]>> {
    try {
      const dir = this.patchesDir();
      if (!existsSync(dir)) return success([]);
      const files = readdirSyncFiltered(dir, 'patch-', '.json');
      const all: Patch[] = [];
      for (const file of files) {
        const data = readJson<Patch>(join(dir, file));
        if (data) all.push(data);
      }
      if (status) return success(all.filter(p => p.status === status));
      return success(all);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  async updatePatchStatus(id: string, status: string): Promise<Result<void>> {
    try {
      const path = join(this.patchesDir(), `patch-${id}.json`);
      const data = readJson<Patch>(path);
      if (!data) return failure(`Patch ${id} not found`);
      data.status = status as Patch['status'];
      this.atomicWrite(path, JSON.stringify(data, null, 2));
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  async saveAnalysis(
    projectRoot: string,
    frameworkMap: FrameworkMap,
    locatorRecords: LocatorRecord[],
    analysisMeta: AnalysisMeta,
  ): Promise<Result<void>> {
    try {
      this.ensureDir(this.root);

      this.atomicWrite(this.frameworkMapFile(), JSON.stringify(frameworkMap, null, 2));
      this.atomicWrite(this.locatorsFile(), JSON.stringify(locatorRecords, null, 2));
      this.atomicWrite(this.analysisMetaFile(), JSON.stringify(analysisMeta, null, 2));

      const legacyData = { projectRoot, frameworkMap, locatorRecords, analysisMeta, savedAt: Date.now() };
      this.atomicWrite(this.analysisFile(), JSON.stringify(legacyData, null, 2));

      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  private atomicWrite(path: string, content: string): void {
    const tmp = path + '.tmp';
    const { writeFileSync, renameSync } = require('node:fs');
    writeFileSync(tmp, content, 'utf-8');
    renameSync(tmp, path);
  }

  async save(trace: ExecutionTrace): Promise<Result<void>> {
    return this.saveTrace(trace);
  }

  async getById(id: string): Promise<Result<ExecutionTrace>> {
    return this.getTrace(id);
  }

  async listByFile(filePath: string, limit?: number): Promise<Result<TraceSummary[]>> {
    const allResult = await this.listTracesByFile(filePath);
    if (!allResult.ok) return allResult;
    return success(limit ? allResult.value.slice(0, limit) : allResult.value);
  }

  async listRecent(limit?: number): Promise<Result<TraceSummary[]>> {
    return this.listTraces(limit);
  }

  async prune(before: number): Promise<Result<number>> {
    try {
      const dir = this.tracesDir();
      if (!existsSync(dir)) return success(0);
      const files = readdirSyncFiltered(dir, 'trace-', '.json');
      let count = 0;
      for (const file of files) {
        const data = readJson<ExecutionTrace>(join(dir, file));
        if (data && data.startedAt < before) {
          unlinkSync(join(dir, file));
          count++;
        }
      }
      return success(count);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }
}

function readdirSyncFiltered(dir: string, prefix: string, suffix: string): string[] {
  const { readdirSync } = require('node:fs');
  try {
    return readdirSync(dir)
      .filter((f: string) => f.startsWith(prefix) && f.endsWith(suffix))
      .sort();
  } catch {
    return [];
  }
}