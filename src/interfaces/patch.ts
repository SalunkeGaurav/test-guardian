/**
 * PatchProvider — contract for the patcher module.
 *
 * Generates and manages source-level patches for broken locators.
 */

import type { Result } from '../models/result.js';
import type { Patch, PatchStatus } from '../models/patch.js';

export interface PatchProvider {
  /** Create a new patch from a validated healing proposal. */
  create(locatorId: string, proposalId: string, targetFile: string, targetLine: number, originalCode: string, patchedCode: string, strategy: string, confidence: number): Promise<Result<Patch>>;

  /** Apply a patch (write to source file). */
  apply(id: string): Promise<Result<void>>;

  /** Roll back a previously applied patch. */
  rollback(id: string): Promise<Result<void>>;

  /** Get patch by ID. */
  getById(id: string): Promise<Result<Patch>>;

  /** List patches by status. */
  listByStatus(status: PatchStatus): Promise<Result<Patch[]>>;
}
