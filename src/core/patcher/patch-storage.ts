/**
 * PatchStorage
 *
 * Persists PatchProposal data into .testguardian/patches/ with
 * corruption-safe atomic writes.
 *
 * Structure:
 *   .testguardian/patches/
 *     index.json              — lightweight index
 *     patch-{patchId}.json    — individual PatchProposal (full data)
 *
 * Uses centralized storage utilities.
 */

import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import type { Result } from '../../models/result.js';
import type { PatchProposal, PatchSummary, PatchReviewStatus } from '../../models/patch.js';
import { PATCH_SCHEMA_VERSION, PATCH_STORAGE_DIR } from '../../models/patch.js';
import { success, failure } from '../../models/result.js';
import {
  atomicWriteJson,
  safeReadJson,
  IndexManager,
  validateSchemaVersionForwardCompatible,
} from '../storage/utils/index.js';

interface PatchIndexEntry {
  id: string;
  patchId: string;
  proposalId: string;
  targetFile: string;
  targetLine: number;
  originalExpression: string;
  replacementExpression: string;
  strategy: string;
  status: PatchReviewStatus;
  confidence: number;
  lineCount: number;
  [key: string]: unknown;
}

class PatchIndexManager extends IndexManager<PatchIndexEntry> {
  constructor(root: string) {
    super({
      storageDir: join(root, '.testguardian', PATCH_STORAGE_DIR),
      indexFileName: 'index.json',
      sortField: 'confidence',
      sortDirection: 'desc',
    });
  }
}

export class PatchStorage {
  private readonly patchesDir: string;
  private readonly indexManager: PatchIndexManager;

  constructor(private readonly root: string) {
    this.patchesDir = join(root, '.testguardian', PATCH_STORAGE_DIR);
    this.indexManager = new PatchIndexManager(root);
  }

  private ensureDir(): void {
    if (!existsSync(this.patchesDir)) {
      mkdirSync(this.patchesDir, { recursive: true });
    }
  }

  private filePath(patchId: string): string {
    return join(this.patchesDir, `patch-${patchId}.json`);
  }

  /**
   * Save a patch proposal atomically.
   * Writes individual file + updates the index.
   */
  async save(proposal: PatchProposal): Promise<Result<void>> {
    try {
      this.ensureDir();

      const summary: PatchIndexEntry = {
        id: proposal.patchId,
        patchId: proposal.patchId,
        proposalId: proposal.proposalId,
        targetFile: proposal.targetFile,
        targetLine: proposal.targetLocator.sourceLine,
        originalExpression: proposal.targetLocator.expression,
        replacementExpression: proposal.replacementCodeSnippet,
        strategy: proposal.targetLocator.strategy,
        status: proposal.status,
        confidence: proposal.confidenceMetadata.staticValidationConfidence,
        lineCount: proposal.patchDiff.removedLines + proposal.patchDiff.addedLines,
      };

      const withSchema = { ...proposal };
      (withSchema as Record<string, unknown>)['schemaVersion'] = PATCH_SCHEMA_VERSION;
      atomicWriteJson(this.filePath(proposal.patchId), withSchema);
      this.indexManager.upsert(summary);

      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Load a single patch proposal by ID.
   */
  async load(patchId: string): Promise<Result<PatchProposal>> {
    try {
      const path = this.filePath(patchId);
      if (!existsSync(path)) {
        return failure(`Patch proposal ${patchId} not found`);
      }
      const data = safeReadJson<PatchProposal>(path);
      if (!data) return failure(`Failed to parse patch proposal ${patchId}`);

      const schemaResult = validateSchemaVersionForwardCompatible(
        data, PATCH_SCHEMA_VERSION, `PatchProposal:${patchId}`,
      );
      if (!schemaResult.ok) {
        return failure(schemaResult.error ?? 'Schema version mismatch');
      }

      return success(data);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * List all persisted patch proposals (sorted by confidence desc).
   */
  async list(): Promise<Result<PatchSummary[]>> {
    try {
      return success(this.indexManager.list());
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * List patches by status.
   */
  async listByStatus(status: PatchReviewStatus): Promise<Result<PatchSummary[]>> {
    try {
      return success(this.indexManager.listWhere(e => e.status === status));
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Update a patch proposal's status.
   */
  async updateStatus(patchId: string, status: PatchReviewStatus): Promise<Result<void>> {
    try {
      const loadResult = await this.load(patchId);
      if (!loadResult.ok) return failure(loadResult.error);

      const proposal = loadResult.value;
      proposal.status = status;
      proposal.updatedAt = Date.now();

      atomicWriteJson(this.filePath(patchId), proposal);

      const summary = this.indexManager.get(patchId);
      if (summary) {
        summary.status = status;
        this.indexManager.upsert(summary);
      }

      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Delete a patch proposal by ID.
   */
  async delete(patchId: string): Promise<Result<void>> {
    try {
      if (existsSync(this.filePath(patchId))) {
        unlinkSync(this.filePath(patchId));
      }
      this.indexManager.remove(patchId);
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Delete all patch proposals.
   */
  async clear(): Promise<Result<void>> {
    try {
      if (!existsSync(this.patchesDir)) return success(undefined);
      const files = readdirSync(this.patchesDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        unlinkSync(join(this.patchesDir, file));
      }
      this.indexManager.clear();
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }
}