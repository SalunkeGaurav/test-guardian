/**
 * Storage Module
 *
 * Purpose: Implement the StorageProvider contract using the local
 * filesystem (.testguardian/ directory). Provides persistence for
 * traces, locators, snapshots, patches, and healing history.
 *
 * Storage layout:
 *   .testguardian/
 *     index.json              — Project metadata and stats
 *     traces/{id}.json        — ExecutionTrace data
 *     locators.json           — Serialized LocatorIndexEntry[]
 *     snapshots/{id}.html     — Raw DOM HTML
 *     snapshots/{id}.meta.json — DomSnapshot metadata
 *     patches/{id}.json       — Patch records
 *     history.json            — HealingHistoryEntry[]
 *
 * Concurrency: File-based, no locking. CLI is single-process.
 * For future multi-process use, add file-level advisory locking.
 *
 * Boundary:
 *   - Pure I/O — no business logic, no transformation
 *   - All data is serialized as JSON (except raw HTML snapshots)
 *   - Implements StorageProvider, TraceProvider, LocatorIndexProvider
 */

import type { StorageProvider } from '../../interfaces/storage.js';
import type { Result } from '../../models/result.js';
import type { ExecutionTrace, TraceSummary } from '../../models/trace.js';
import type { LocatorIndexEntry } from '../../models/locator.js';
import type { DomSnapshot } from '../../models/snapshot.js';
import type { HealingHistoryEntry } from '../../models/healing.js';
import type { Patch } from '../../models/patch.js';

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
}

export { MemoryStorage } from './memory.js';
