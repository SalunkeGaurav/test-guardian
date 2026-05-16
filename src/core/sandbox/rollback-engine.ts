/**
 * Rollback Engine
 *
 * Provides deterministic rollback for applied patches.
 * Ensures original files are restored with hash verification.
 *
 * No AI. No autonomous execution. Deterministic restoration.
 */

import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Result } from '../../models/result.js';
import type { RollbackRecord, SandboxState } from '../../models/sandbox.js';
import { success, failure } from '../../models/result.js';
import { contentHash } from '../storage/utils/serialization.js';
import { SandboxManager } from './sandbox-manager.js';

export interface RollbackResult {
  success: boolean;
  patchesRolledBack: number;
  verificationPassed: boolean;
  restoredFiles: string[];
  errors: string[];
}

export class RollbackEngine {
  private readonly sandboxManager: SandboxManager;

  constructor(projectRoot: string) {
    this.sandboxManager = new SandboxManager(projectRoot);
  }

  /**
   * Rollback a specific patch in a sandbox.
   */
  rollbackPatch(sandboxId: string, patchId: string): Result<RollbackResult> {
    try {
      const stateResult = this.sandboxManager.loadSandbox(sandboxId);
      if (!stateResult.ok) return failure(stateResult.error!);

      const state = stateResult.value;
      const appliedPatch = state.appliedPatches.find(p => p.patchId === patchId);

      if (!appliedPatch) {
        return failure(`Patch ${patchId} not found in sandbox ${sandboxId}`);
      }

      const originalResult = this.sandboxManager.getOriginalFile(sandboxId, appliedPatch.targetFile);
      if (!originalResult.ok) {
        return failure(originalResult.error!);
      }

      const workspacePath = this.sandboxManager.getWorkspacePath(sandboxId);
      const targetPath = join(workspacePath, appliedPatch.targetFile);

      if (!existsSync(targetPath)) {
        return failure(`Target file no longer exists: ${appliedPatch.targetFile}`);
      }

      const currentHash = contentHash(readFileSync(targetPath, 'utf-8'));
      const patchedHash = contentHash(appliedPatch.patchedContent);
      const originalHash = contentHash(originalResult.value);

      if (currentHash !== patchedHash) {
        return failure('File has been modified since patch was applied - cannot rollback');
      }

      writeFileSync(targetPath, originalResult.value, 'utf-8');

      const restoredHash = contentHash(readFileSync(targetPath, 'utf-8'));
      const verificationPassed = restoredHash === originalHash;

      const rollbackRecord: RollbackRecord = {
        patchId,
        originalContent: originalResult.value,
        restoredContent: appliedPatch.originalContent,
        rolledBackAt: Date.now(),
        verified: verificationPassed,
      };

      state.rollbackHistory.push(rollbackRecord);
      state.appliedPatches = state.appliedPatches.filter(p => p.patchId !== patchId);
      state.status = 'rolled-back';

      this.sandboxManager.updateSandbox(state);

      return success({
        success: verificationPassed,
        patchesRolledBack: 1,
        verificationPassed,
        restoredFiles: [appliedPatch.targetFile],
        errors: verificationPassed ? [] : ['Hash verification failed after rollback'],
      });
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Rollback all patches in a sandbox.
   */
  rollbackAllPatches(sandboxId: string): Result<RollbackResult> {
    try {
      const stateResult = this.sandboxManager.loadSandbox(sandboxId);
      if (!stateResult.ok) return failure(stateResult.error!);

      const state = stateResult.value;
      const patchesToRollback = [...state.appliedPatches];

      if (patchesToRollback.length === 0) {
        return success({
          success: true,
          patchesRolledBack: 0,
          verificationPassed: true,
          restoredFiles: [],
          errors: [],
        });
      }

      const restoredFiles: string[] = [];
      const errors: string[] = [];
      let allVerified = true;

      for (const patch of patchesToRollback) {
        const originalResult = this.sandboxManager.getOriginalFile(sandboxId, patch.targetFile);
        if (!originalResult.ok) {
          errors.push(`Failed to get original for ${patch.targetFile}: ${originalResult.error}`);
          continue;
        }

        const workspacePath = this.sandboxManager.getWorkspacePath(sandboxId);
        const targetPath = join(workspacePath, patch.targetFile);

        if (existsSync(targetPath)) {
          writeFileSync(targetPath, originalResult.value, 'utf-8');
          restoredFiles.push(patch.targetFile);

          const restoredHash = contentHash(readFileSync(targetPath, 'utf-8'));
          const originalHash = contentHash(originalResult.value);

          if (restoredHash !== originalHash) {
            errors.push(`Hash verification failed for ${patch.targetFile}`);
            allVerified = false;
          }

          state.rollbackHistory.push({
            patchId: patch.patchId,
            originalContent: originalResult.value,
            restoredContent: patch.originalContent,
            rolledBackAt: Date.now(),
            verified: restoredHash === originalHash,
          });
        }
      }

      state.appliedPatches = [];
      state.status = 'rolled-back';

      this.sandboxManager.updateSandbox(state);

      return success({
        success: allVerified,
        patchesRolledBack: patchesToRollback.length,
        verificationPassed: allVerified,
        restoredFiles,
        errors,
      });
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Verify rollback - ensure original files are correctly restored.
   */
  verifyRollback(sandboxId: string): Result<{ verified: boolean; discrepancies: string[] }> {
    try {
      const stateResult = this.sandboxManager.loadSandbox(sandboxId);
      if (!stateResult.ok) return failure(stateResult.error!);

      const state = stateResult.value;
      const discrepancies: string[] = [];

      const workspacePath = this.sandboxManager.getWorkspacePath(sandboxId);

      for (const record of state.rollbackHistory) {
        const originalResult = this.sandboxManager.getOriginalFile(sandboxId, record.patchId);
        if (!originalResult.ok) continue;

        const targetPath = join(workspacePath, record.patchId);
        if (!existsSync(targetPath)) {
          discrepancies.push(`File no longer exists: ${record.patchId}`);
          continue;
        }

        const currentContent = readFileSync(targetPath, 'utf-8');
        const originalHash = contentHash(originalResult.value);
        const currentHash = contentHash(currentContent);

        if (currentHash !== originalHash) {
          discrepancies.push(`Content mismatch for: ${record.patchId}`);
        }
      }

      return success({
        verified: discrepancies.length === 0,
        discrepancies,
      });
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Get rollback history for a sandbox.
   */
  getRollbackHistory(sandboxId: string): Result<RollbackRecord[]> {
    try {
      const stateResult = this.sandboxManager.loadSandbox(sandboxId);
      if (!stateResult.ok) return failure(stateResult.error!);

      return success(stateResult.value.rollbackHistory);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }
}

export function createRollbackEngine(projectRoot: string): RollbackEngine {
  return new RollbackEngine(projectRoot);
}