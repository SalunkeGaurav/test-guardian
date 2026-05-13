/**
 * Patch domain models.
 *
 * Patch is a single source-level change (find → replace).
 * PatchFile groups all patches for one source file.
 */

export type PatchStatus = 'proposed' | 'validated' | 'applied' | 'rejected' | 'superseded' | 'rolled-back';

export interface Patch {
  id: string;
  /** Locator ID this patch addresses. */
  locatorId: string;
  /** Healing proposal that produced this patch. */
  proposalId: string;
  /** Source file to modify. */
  targetFile: string;
  /** Line number of the original locator. */
  targetLine: number;
  /** Exact string to replace. */
  originalCode: string;
  /** Replacement string. */
  patchedCode: string;
  /** Strategy that generated this patch. */
  strategy: string;
  /** Confidence at patch time. */
  confidence: number;
  /** Current lifecycle status. */
  status: PatchStatus;
  /** Timeline. */
  createdAt: number;
  appliedAt?: number;
  rolledBackAt?: number;
  /** Who or what validated it. */
  validatedBy?: string;
  /** Reference to validation trace if re-ran. */
  validationTraceId?: string;
}

export interface PatchFile {
  /** Path to the source file. */
  filePath: string;
  /** All patches for this file. */
  patches: Patch[];
}
