import { writeFileSync, renameSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { info, warn, debug } from '../../logger/index.js';
import type { StorageProvider } from '../../interfaces/storage.js';
import type { Result } from '../../models/result.js';
import type { ExecutionTrace, TraceSummary } from '../../models/trace.js';
import type { LocatorIndexEntry } from '../../models/locator.js';
import type { DomSnapshot } from '../../models/snapshot.js';
import type { HealingHistoryEntry } from '../../models/healing.js';
import type { Patch } from '../../models/patch.js';
import type { FrameworkMap, LocatorRecord, AnalysisMeta } from '../analyzer/types.js';

export class FileStorage implements StorageProvider {
  constructor(private readonly root: string) {}

  async readMetadata(): Promise<Result<Record<string, unknown>>> {
    throw new Error('Not implemented');
  }

  async writeMetadata(_data: Record<string, unknown>): Promise<Result<void>> {
    throw new Error('Not implemented');
  }

  async saveTrace(_trace: ExecutionTrace): Promise<Result<void>> {
    throw new Error('Not implemented');
  }

  async getTrace(_id: string): Promise<Result<ExecutionTrace>> {
    throw new Error('Not implemented');
  }

  async listTraces(_limit?: number): Promise<Result<TraceSummary[]>> {
    throw new Error('Not implemented');
  }

  async listTracesByFile(_filePath: string): Promise<Result<TraceSummary[]>> {
    throw new Error('Not implemented');
  }

  async saveLocatorIndex(_entries: LocatorIndexEntry[]): Promise<Result<void>> {
    throw new Error('Not implemented');
  }

  async loadLocatorIndex(): Promise<Result<LocatorIndexEntry[]>> {
    throw new Error('Not implemented');
  }

  async saveSnapshot(_snapshot: DomSnapshot, _html: string): Promise<Result<void>> {
    throw new Error('Not implemented');
  }

  async getSnapshot(_id: string): Promise<Result<{ snapshot: DomSnapshot; html: string }>> {
    throw new Error('Not implemented');
  }

  async saveHealingEntry(_entry: HealingHistoryEntry): Promise<Result<void>> {
    throw new Error('Not implemented');
  }

  async listHealingHistory(): Promise<Result<HealingHistoryEntry[]>> {
    throw new Error('Not implemented');
  }

  async savePatch(_patch: Patch): Promise<Result<void>> {
    throw new Error('Not implemented');
  }

  async listPatches(_status?: string): Promise<Result<Patch[]>> {
    throw new Error('Not implemented');
  }

  async updatePatchStatus(_id: string, _status: string): Promise<Result<void>> {
    throw new Error('Not implemented');
  }

  async saveAnalysis(
    _projectRoot: string,
    frameworkMap: FrameworkMap,
    locatorRecords: LocatorRecord[],
    analysisMeta: AnalysisMeta,
  ): Promise<Result<void>> {
    try {
      const tgDir = join(this.root, '.testguardian');
      if (!existsSync(tgDir)) {
        mkdirSync(tgDir, { recursive: true });
      }

      // Deterministic sort before persistence — ensures reproducibility
      const sortedFrameworkMap = sortFrameworkMap(frameworkMap);
      const sortedLocatorRecords = sortLocatorRecords(locatorRecords);

      // Write framework-map.json
      writeJsonSafe(join(tgDir, 'framework-map.json'), sortedFrameworkMap);
      info('storage', `Wrote .testguardian/framework-map.json (${sortedFrameworkMap.testFiles.length} files, ${sortedFrameworkMap.totalTests} tests)`);

      // Write locators.json
      writeJsonSafe(join(tgDir, 'locators.json'), sortedLocatorRecords);
      info('storage', `Wrote .testguardian/locators.json (${sortedLocatorRecords.length} locators)`);

      // Write analysis-meta.json
      writeJsonSafe(join(tgDir, 'analysis-meta.json'), analysisMeta);
      info('storage', `Wrote .testguardian/analysis-meta.json`);

      return { ok: true, value: undefined };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      warn('storage', `Failed to persist analysis: ${msg}`);
      return { ok: false, error: msg };
    }
  }
}

function sortFrameworkMap(map: FrameworkMap): FrameworkMap {
  return {
    ...map,
    testFiles: [...map.testFiles].sort((a, b) => a.relativePath.localeCompare(b.relativePath)),
    pageObjects: [...map.pageObjects].sort((a, b) => a.name.localeCompare(b.name)),
    navigations: [...map.navigations].sort((a, b) => {
      if (a.filePath !== b.filePath) return a.filePath.localeCompare(b.filePath);
      return a.line - b.line;
    }),
  };
}

function sortLocatorRecords(records: LocatorRecord[]): LocatorRecord[] {
  return [...records].sort((a, b) => {
    if (a.sourceFile !== b.sourceFile) return a.sourceFile.localeCompare(b.sourceFile);
    if (a.sourceLine !== b.sourceLine) return a.sourceLine - b.sourceLine;
    return a.id.localeCompare(b.id);
  });
}

function writeJsonSafe(filePath: string, data: unknown): void {
  // Write to a .tmp file first, then atomically rename
  // This prevents partial/corrupt files if the process crashes mid-write
  const tmpPath = filePath + '.tmp';
  const json = JSON.stringify(data, null, 2);
  writeFileSync(tmpPath, json, 'utf-8');
  renameSync(tmpPath, filePath);
}

export { MemoryStorage } from './memory.js';
