/**
 * Index Manager
 *
 * Manages lightweight indexes for all persistence directories.
 * Provides deterministic ordering, corruption-safe reads, and atomic updates.
 *
 * Each index maps entity ID → summary record.
 * Index is always sorted deterministically (by a stable field).
 *
 * Index file: {storageDir}/index.json
 *
 * No AI. Deterministic. No side effects beyond file I/O.
 */

import { writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { atomicWriteJson, safeReadJson } from './atomic-write.js';

export type SortField = 'createdAt' | 'timestamp' | 'confidence' | 'duration';
export type SortDirection = 'asc' | 'desc';

/**
 * Index entry — a minimal record stored in the index file.
 * Each persister defines its own summary shape.
 */
export interface IndexEntry {
  id: string;
  [key: string]: unknown;
}

/**
 * Configuration for index behavior.
 */
export interface IndexConfig {
  storageDir: string;
  indexFileName: string;
  sortField: SortField;
  sortDirection: SortDirection;
}

export class IndexManager<T extends IndexEntry = IndexEntry> {
  private readonly indexPath: string;

  constructor(private readonly config: IndexConfig) {
    this.indexPath = join(config.storageDir, config.indexFileName);
  }

  /**
   * Ensure the storage directory exists.
   */
  ensureDir(): void {
    const { existsSync, mkdirSync } = require('node:fs');
    if (!existsSync(this.config.storageDir)) {
      mkdirSync(this.config.storageDir, { recursive: true });
    }
  }

  /**
   * Read the index file, returning empty map if missing or corrupt.
   */
  readIndex(): Map<string, T> {
    try {
      if (!existsSync(this.indexPath)) return new Map();
      const raw = readFileSync(this.indexPath, 'utf-8');
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return new Map();
      return new Map((arr as T[]).map(e => [e.id, e]));
    } catch {
      return new Map();
    }
  }

  /**
   * Write the index file atomically with deterministic ordering.
   */
  writeIndex(entries: Map<string, T>): void {
    this.ensureDir();
    const sorted = this.sortEntries(Array.from(entries.values()));
    const arr = sorted;
    const json = JSON.stringify(arr, null, 2);
    const tmpPath = this.indexPath + '.tmp';
    writeFileSync(tmpPath, json, 'utf-8');
    const { renameSync } = require('node:fs');
    renameSync(tmpPath, this.indexPath);
  }

  /**
   * Insert or update a single entry atomically.
   * Reads current index, updates entry, writes back.
   */
  upsert(entry: T): void {
    const index = this.readIndex();
    index.set(entry.id, entry);
    this.writeIndex(index);
  }

  /**
   * Remove an entry by ID atomically.
   */
  remove(id: string): void {
    const index = this.readIndex();
    if (index.has(id)) {
      index.delete(id);
      this.writeIndex(index);
    }
  }

  /**
   * List all entries in deterministic order.
   */
  list(): T[] {
    const index = this.readIndex();
    return this.sortEntries(Array.from(index.values()));
  }

  /**
   * List entries by a predicate, maintaining sort order.
   */
  listWhere(predicate: (entry: T) => boolean): T[] {
    return this.list().filter(predicate);
  }

  /**
   * Get a single entry by ID.
   */
  get(id: string): T | undefined {
    const index = this.readIndex();
    return index.get(id);
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.ensureDir();
    const markerPath = this.indexPath + '.clearing';
    try {
      writeFileSync(markerPath, '', 'utf-8');
      const { unlinkSync } = require('node:fs');
      if (existsSync(this.indexPath)) {
        unlinkSync(this.indexPath);
      }
    } catch {
      // ignore
    } finally {
      const { unlinkSync } = require('node:fs');
      try { unlinkSync(markerPath); } catch { /* ignore */ }
    }
  }

  /**
   * Sort entries deterministically by configured field + direction.
   * Ties are broken by id for stability.
   */
  private sortEntries(entries: T[]): T[] {
    const field = this.config.sortField as keyof T;
    const dir = this.config.sortDirection === 'desc' ? -1 : 1;

    return [...entries].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];

      if (aVal === bVal) {
        const aId = String(a.id ?? '');
        const bId = String(b.id ?? '');
        return aId.localeCompare(bId);
      }

      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * dir;
      }

      return String(aVal).localeCompare(String(bVal)) * dir;
    });
  }
}

/**
 * List all entity files in a storage directory.
 * Returns file names (not full paths) sorted.
 */
export function listStorageFiles(storageDir: string, prefix: string): string[] {
  try {
    if (!existsSync(storageDir)) return [];
    return readdirSync(storageDir)
      .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
      .sort();
  } catch {
    return [];
  }
}

/**
 * Load a single entity file, returning null if missing or corrupt.
 */
export function loadEntityFile<T>(storageDir: string, fileName: string): T | null {
  const path = join(storageDir, fileName);
  return safeReadJson<T>(path);
}