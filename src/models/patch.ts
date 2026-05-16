/**
 * Patch domain models.
 *
 * Patch is a single source-level change (find -> replace).
 * PatchProposal is the full reviewable patch generation output.
 *
 * Patch generation does NOT apply patches. All output is review-only.
 */

export type PatchStatus = 'proposed' | 'validated' | 'applied' | 'rejected' | 'superseded' | 'rolled-back';

export type PatchReviewStatus = 'proposed' | 'approved' | 'rejected' | 'applied' | 'rolled_back';

export interface Patch {
  id: string;
  locatorId: string;
  proposalId: string;
  targetFile: string;
  targetLine: number;
  originalCode: string;
  patchedCode: string;
  strategy: string;
  confidence: number;
  status: PatchStatus;
  createdAt: number;
  appliedAt?: number;
  rolledBackAt?: number;
  validatedBy?: string;
  validationTraceId?: string;
}

export interface PatchFile {
  filePath: string;
  patches: Patch[];
}

export interface ASTNodeMetadata {
  nodeType: string;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  parentType?: string;
  expressionType: string;
}

export interface ConfidenceMetadata {
  staticValidationConfidence: number;
  runtimeConfidence?: number;
  governanceConfidence: number;
  stabilityScore?: number;
}

export interface ValidationReference {
  validationId: string;
  validationStatus: string;
  matchedElementCount: number;
  falsePositiveCount: number;
}

export interface AuditReference {
  auditTrailId?: string;
  pipelineRunId?: string;
}

export interface RollbackMetadata {
  originalLocatorExpression: string;
  originalStrategy: string;
  originalValue: string;
  originalSourceFile: string;
  originalLine: number;
  originalColumn: number;
  patchReversalCode: string;
  validationIds: string[];
  replaySessionIds: string[];
  createdAt: number;
}

export interface PatchDiff {
  unifiedDiff: string;
  beforeSnippet: string;
  afterSnippet: string;
  beforeStartLine: number;
  beforeEndLine: number;
  afterStartLine: number;
  afterEndLine: number;
  addedLines: number;
  removedLines: number;
}

export interface PatchSummary {
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
}

export interface PatchProposal {
  patchId: string;
  proposalId: string;
  targetFile: string;
  targetLocator: {
    expression: string;
    strategy: string;
    value: string;
    sourceLine: number;
    sourceColumn: number;
  };
  originalCodeSnippet: string;
  replacementCodeSnippet: string;
  astNodeMetadata: ASTNodeMetadata;
  confidenceMetadata: ConfidenceMetadata;
  rollbackMetadata: RollbackMetadata;
  patchSummary: string;
  validationRefs: ValidationReference[];
  auditRefs: AuditReference[];
  patchDiff: PatchDiff;
  status: PatchReviewStatus;
  schemaVersion: number;
  createdAt: number;
  updatedAt: number;
}

export const PATCH_SCHEMA_VERSION = 1;
export const PATCH_STORAGE_DIR = 'patches';
