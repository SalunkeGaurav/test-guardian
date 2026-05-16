/**
 * AuditPersister
 *
 * Persists pipeline audit trail entries to .testguardian/audit/
 * with corruption-safe atomic writes.
 *
 * Structure:
 *   .testguardian/audit/
 *     index.json           — lightweight index sorted by timestamp
 *     {auditId}.json        — individual audit entry
 *
 * Uses centralized storage utilities.
 */

import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import type { Result } from '../../models/result.js';
import type { AuditTrailEntry, AuditTrailSummary } from '../../models/audit-trail.js';
import { AUDIT_SCHEMA_VERSION, AUDIT_STORAGE_DIR } from '../../models/audit-trail.js';
import { success, failure } from '../../models/result.js';
import {
  atomicWriteJson,
  safeReadJson,
  IndexManager,
  validateSchemaVersionForwardCompatible,
} from '../storage/utils/index.js';

interface PersistedAudit extends AuditTrailEntry {
  schemaVersion: number;
}

class AuditIndexManager extends IndexManager<AuditTrailSummary> {
  constructor(root: string) {
    super({
      storageDir: join(root, '.testguardian', AUDIT_STORAGE_DIR),
      indexFileName: 'index.json',
      sortField: 'timestamp',
      sortDirection: 'desc',
    });
  }
}

export class AuditPersister {
  private readonly auditDir: string;
  private readonly indexManager: AuditIndexManager;

  constructor(private readonly root: string) {
    this.auditDir = join(root, '.testguardian', AUDIT_STORAGE_DIR);
    this.indexManager = new AuditIndexManager(root);
  }

  private filePath(id: string): string {
    return join(this.auditDir, `${id}.json`);
  }

  private ensureDir(): void {
    if (!existsSync(this.auditDir)) {
      mkdirSync(this.auditDir, { recursive: true });
    }
  }

  /**
   * Save an audit trail entry atomically.
   * Writes entry file + updates the index.
   */
  async save(entry: AuditTrailEntry): Promise<Result<void>> {
    try {
      this.ensureDir();

      const summary: AuditTrailSummary = {
        id: entry.id,
        pipelineRunId: entry.pipelineRunId,
        locatorId: entry.locatorId,
        timestamp: entry.timestamp,
        finalStatus: entry.finalStatus,
        duration: entry.duration,
        candidateCount: entry.candidateIds.length,
        stagesCompleted: entry.stageTimings.length,
      };

      const withSchema: PersistedAudit = { ...entry, schemaVersion: AUDIT_SCHEMA_VERSION };
      atomicWriteJson(this.filePath(entry.id), withSchema);
      this.indexManager.upsert(summary);

      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Load a single audit entry by ID.
   */
  async load(id: string): Promise<Result<AuditTrailEntry>> {
    try {
      const path = this.filePath(id);
      if (!existsSync(path)) {
        return failure(`Audit entry ${id} not found`);
      }
      const data = safeReadJson<PersistedAudit>(path);
      if (!data) return failure(`Failed to parse audit entry ${id}`);

      const schemaResult = validateSchemaVersionForwardCompatible(
        data, AUDIT_SCHEMA_VERSION, `AuditTrailEntry:${id}`,
      );
      if (!schemaResult.ok) {
        return failure(schemaResult.error ?? 'Schema version mismatch');
      }

      return success(data as AuditTrailEntry);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * List all persisted audit entries (newest first).
   */
  async list(): Promise<Result<AuditTrailSummary[]>> {
    try {
      return success(this.indexManager.list());
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Delete an audit entry by ID.
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
   * Delete all audit entries.
   */
  async clear(): Promise<Result<void>> {
    try {
      if (!existsSync(this.auditDir)) return success(undefined);
      const files = readdirSync(this.auditDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        unlinkSync(join(this.auditDir, file));
      }
      this.indexManager.clear();
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }
}