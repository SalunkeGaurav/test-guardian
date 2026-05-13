/**
 * StorageProvider — unified contract for .testguardian persistence.
 *
 * Implemented by the storage module. All I/O flows through this interface.
 *
 * Schema layout in .testguardian/:
 *   index.json       — project metadata
 *   traces/{id}.json — ExecutionTrace
 *   locators.json    — LocatorIndex (serialized)
 *   snapshots/{id}/  — DomSnapshot (html + metadata.json)
 *   patches/{id}.json — Patch records
 *   history.json     — HealingHistoryEntry[]
 */

import type { Result } from '../models/result.js';
import type { ExecutionTrace, TraceSummary } from '../models/trace.js';
import type { LocatorIndexEntry } from '../models/locator.js';
import type { DomSnapshot } from '../models/snapshot.js';
import type { HealingHistoryEntry } from '../models/healing.js';
import type { Patch } from '../models/patch.js';

export interface StorageProvider {
  /** Project metadata. */
  readMetadata(): Promise<Result<Record<string, unknown>>>;
  writeMetadata(data: Record<string, unknown>): Promise<Result<void>>;

  /** Traces. */
  saveTrace(trace: ExecutionTrace): Promise<Result<void>>;
  getTrace(id: string): Promise<Result<ExecutionTrace>>;
  listTraces(limit?: number): Promise<Result<TraceSummary[]>>;
  listTracesByFile(filePath: string): Promise<Result<TraceSummary[]>>;

  /** Locator index. */
  saveLocatorIndex(entries: LocatorIndexEntry[]): Promise<Result<void>>;
  loadLocatorIndex(): Promise<Result<LocatorIndexEntry[]>>;

  /** DOM snapshots. */
  saveSnapshot(snapshot: DomSnapshot, html: string): Promise<Result<void>>;
  getSnapshot(id: string): Promise<Result<{ snapshot: DomSnapshot; html: string }>>;

  /** Healing history. */
  saveHealingEntry(entry: HealingHistoryEntry): Promise<Result<void>>;
  listHealingHistory(): Promise<Result<HealingHistoryEntry[]>>;

  /** Patches. */
  savePatch(patch: Patch): Promise<Result<void>>;
  listPatches(status?: string): Promise<Result<Patch[]>>;
  updatePatchStatus(id: string, status: string): Promise<Result<void>>;
}
