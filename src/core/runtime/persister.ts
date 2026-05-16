/**
 * Runtime Evidence Persister
 *
 * Persists RuntimeValidationResult data into .testguardian/runtime/
 * with corruption-safe atomic writes.
 *
 * Structure:
 *   .testguardian/runtime/
 *     index.json              — lightweight index
 *     runtime-{id}.json        — individual runtime result
 *
 * Uses centralized storage utilities.
 */

import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import type { Result } from '../../models/result.js';
import type { RuntimeValidationResult } from '../../models/runtime.js';
import { RUNTIME_SCHEMA_VERSION } from './schema.js';
import { success, failure } from '../../models/result.js';
import {
  atomicWriteJson,
  safeReadJson,
  IndexManager,
  validateSchemaVersionForwardCompatible,
} from '../storage/utils/index.js';

interface PersistedRuntime extends RuntimeValidationResult {
  schemaVersion: number;
}

interface RuntimeIndexEntry {
  id: string;
  replaySessionId: string;
  proposalId: string;
  status: string;
  runtimeConfidence: number;
  executedStepCount: number;
  schemaVersion: number;
  createdAt: number;
  [key: string]: unknown;
}

class RuntimeIndexManager extends IndexManager<RuntimeIndexEntry> {
  constructor(root: string) {
    super({
      storageDir: join(root, '.testguardian', 'runtime'),
      indexFileName: 'index.json',
      sortField: 'createdAt',
      sortDirection: 'desc',
    });
  }
}

export class RuntimePersister {
  private readonly runtimeDir: string;
  private readonly indexManager: RuntimeIndexManager;

  constructor(private readonly root: string) {
    this.runtimeDir = join(root, '.testguardian', 'runtime');
    this.indexManager = new RuntimeIndexManager(root);
  }

  private ensureDir(): void {
    if (!existsSync(this.runtimeDir)) {
      mkdirSync(this.runtimeDir, { recursive: true });
    }
  }

  private filePath(id: string): string {
    return join(this.runtimeDir, `runtime-${id}.json`);
  }

  /**
   * Save a RuntimeValidationResult atomically.
   */
  async save(result: RuntimeValidationResult): Promise<Result<void>> {
    try {
      this.ensureDir();

      const entry: RuntimeIndexEntry = {
        id: result.id,
        replaySessionId: result.replaySessionId,
        proposalId: result.proposalId,
        status: result.status,
        runtimeConfidence: result.runtimeConfidence,
        executedStepCount: result.executedStepCount,
        schemaVersion: RUNTIME_SCHEMA_VERSION,
        createdAt: result.createdAt,
      };

      const withSchema: PersistedRuntime = { ...result, schemaVersion: RUNTIME_SCHEMA_VERSION };
      atomicWriteJson(this.filePath(result.id), withSchema);
      this.indexManager.upsert(entry);

      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Load a single RuntimeValidationResult by ID.
   */
  async load(id: string): Promise<Result<RuntimeValidationResult>> {
    try {
      const path = this.filePath(id);
      if (!existsSync(path)) {
        return failure(`Runtime result ${id} not found`);
      }
      const data = safeReadJson<PersistedRuntime>(path);
      if (!data) return failure(`Failed to parse runtime result ${id}`);

      const schemaResult = validateSchemaVersionForwardCompatible(
        data, RUNTIME_SCHEMA_VERSION, `RuntimeValidationResult:${id}`,
      );
      if (!schemaResult.ok) {
        return failure(schemaResult.error ?? 'Schema version mismatch');
      }

      return success(data as RuntimeValidationResult);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * List all persisted runtime results (newest first).
   */
  async list(): Promise<Result<RuntimeValidationResult[]>> {
    try {
      const entries = this.indexManager.list();
      const results: RuntimeValidationResult[] = [];
      for (const entry of entries) {
        const r = await this.load(entry.id);
        if (r.ok) results.push(r.value);
      }
      return success(results);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Delete a runtime result by ID.
   */
  async delete(id: string): Promise<Result<void>> {
    try {
      if (existsSync(this.filePath(id))) {
        unlinkSync(this.filePath(id));
      }
      this.indexManager.remove(id);
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Delete all runtime results.
   */
  async clear(): Promise<Result<void>> {
    try {
      if (!existsSync(this.runtimeDir)) return success(undefined);
      const files = readdirSync(this.runtimeDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        unlinkSync(join(this.runtimeDir, file));
      }
      this.indexManager.clear();
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }
}