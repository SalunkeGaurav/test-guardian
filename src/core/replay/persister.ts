/**
 * ReplaySessionPersister
 *
 * Persists ReplaySession data into .testguardian/replay/ with
 * corruption-safe writes (atomic write via temp file + rename).
 *
 * Structure:
 *   .testguardian/replay/
 *     index.json          — index of all persisted sessions
 *     {sessionId}.json    — individual session
 *
 * Uses centralized storage utilities for determinism and consistency.
 */

import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import type { Result } from '../../models/result.js';
import type { ReplaySession, ReplaySessionIndexEntry } from '../../models/replay.js';
import { REPLAY_STORAGE_DIR } from './schema.js';
import { success, failure } from '../../models/result.js';
import {
  atomicWriteJson,
  safeReadJson,
  IndexManager,
  validateSchemaVersionForwardCompatible,
} from '../storage/utils/index.js';

const ENTITIES_SCHEMA_VERSION = 1;

class ReplayIndexManager extends IndexManager<ReplaySessionIndexEntry> {
  constructor(root: string) {
    super({
      storageDir: join(root, '.testguardian', REPLAY_STORAGE_DIR),
      indexFileName: 'index.json',
      sortField: 'createdAt',
      sortDirection: 'desc',
    });
  }
}

export class ReplaySessionPersister {
  private readonly replayDir: string;
  private readonly indexManager: ReplayIndexManager;

  constructor(private readonly root: string) {
    this.replayDir = join(root, '.testguardian', REPLAY_STORAGE_DIR);
    this.indexManager = new ReplayIndexManager(root);
  }

  private sessionFilePath(id: string): string {
    return join(this.replayDir, `${id}.json`);
  }

  /**
   * Save a replay session.
   * Atomically writes the session file and updates the index.
   */
  async save(session: ReplaySession): Promise<Result<void>> {
    try {
      if (!existsSync(this.replayDir)) {
        mkdirSync(this.replayDir, { recursive: true });
      }

      const entry: ReplaySessionIndexEntry = {
        id: session.id,
        traceId: session.traceId,
        testName: session.testName,
        testFile: session.testFile,
        framework: session.framework,
        stepCount: session.steps.length,
        schemaVersion: ENTITIES_SCHEMA_VERSION,
        createdAt: session.createdAt,
      };

      const withSchema = { ...session, schemaVersion: ENTITIES_SCHEMA_VERSION } as ReplaySession & { schemaVersion: number };
      atomicWriteJson(this.sessionFilePath(session.id), withSchema);
      this.indexManager.upsert(entry);

      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Load a single replay session by ID.
   */
  async load(id: string): Promise<Result<ReplaySession>> {
    try {
      const path = this.sessionFilePath(id);
      if (!existsSync(path)) {
        return failure(`Replay session ${id} not found`);
      }
      const data = safeReadJson<ReplaySession & { schemaVersion: number }>(path);
      if (!data) return failure(`Failed to parse replay session ${id}`);

      const schemaResult = validateSchemaVersionForwardCompatible(
        data, ENTITIES_SCHEMA_VERSION, `ReplaySession:${id}`,
      );
      if (!schemaResult.ok) {
        return failure(schemaResult.error ?? 'Schema version mismatch');
      }

return success(data as ReplaySession);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * List all persisted replay sessions (sorted by createdAt desc).
   */
  async list(): Promise<Result<ReplaySession[]>> {
    try {
      const entries = this.indexManager.list();
      const sessions: ReplaySession[] = [];
      for (const entry of entries) {
        const r = await this.load(entry.id);
        if (r.ok) sessions.push(r.value);
      }
      return success(sessions);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Delete a replay session by ID.
   */
  async delete(id: string): Promise<Result<void>> {
    try {
      if (existsSync(this.sessionFilePath(id))) {
        unlinkSync(this.sessionFilePath(id));
      }
      this.indexManager.remove(id);
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Delete all replay sessions.
   */
  async clear(): Promise<Result<void>> {
    try {
      if (!existsSync(this.replayDir)) return success(undefined);
      const files = readdirSync(this.replayDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        unlinkSync(join(this.replayDir, file));
      }
      this.indexManager.clear();
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }
}