/**
 * Sandbox domain models.
 *
 * Defines the mutation sandbox environment for safely applying
 * validated patch proposals to isolated framework copies.
 *
 * No AI. No autonomous execution. Deterministic sandbox isolation.
 */

import type { PatchProposal } from './patch.js';

export type SandboxStatus = 'created' | 'patching' | 'verifying' | 'completed' | 'failed' | 'rolled-back' | 'cleaned';

export type VerificationStatus = 'pending' | 'passed' | 'failed' | 'skipped';

export interface SandboxConfig {
  sandboxId: string;
  originalFrameworkPath: string;
  sandboxRoot: string;
  createdAt: number;
  timeout: number;
}

export interface SandboxState {
  config: SandboxConfig;
  status: SandboxStatus;
  appliedPatches: AppliedPatch[];
  verificationResults: VerificationResult[];
  rollbackHistory: RollbackRecord[];
  error?: string;
  startedAt: number;
  completedAt?: number;
}

export interface AppliedPatch {
  patchId: string;
  proposalId: string;
  targetFile: string;
  originalContent: string;
  patchedContent: string;
  appliedAt: number;
  rollbackAvailable: boolean;
}

export interface VerificationResult {
  verificationType: 'static' | 'runtime' | 'structural';
  status: VerificationStatus;
  passedChecks: string[];
  failedChecks: string[];
  details: string;
  duration: number;
}

export interface RollbackRecord {
  patchId: string;
  originalContent: string;
  restoredContent: string;
  rolledBackAt: number;
  verified: boolean;
}

export interface StaticVerification {
  astReparseSuccess: boolean;
  typescriptCompileSuccess: boolean;
  syntaxValid: boolean;
  formattingPreserved: boolean;
  commentsPreserved: boolean;
  errors: string[];
}

export interface RuntimeVerification {
  replaySuccess: boolean;
  runtimeValidationSuccess: boolean;
  healingConsistencyMaintained: boolean;
  executionDuration: number;
  errorCount: number;
  errors: string[];
}

export interface StructuralVerification {
  fileIntegrity: boolean;
  importIntegrity: boolean;
  directoryStructureValid: boolean;
  missingFiles: string[];
  brokenImports: string[];
}

export interface MutationValidationResult {
  sandboxId: string;
  proposalId: string;
  patchId: string;
  targetFile: string;
  staticVerification: StaticVerification;
  runtimeVerification: RuntimeVerification;
  structuralVerification: StructuralVerification;
  overallPassed: boolean;
  failedCategories: string[];
  duration: number;
  createdAt: number;
}

export interface MutationReport {
  reportId: string;
  sandboxId: string;
  sandboxPath: string;
  originalFrameworkPath: string;
  appliedPatches: AppliedPatchInfo[];
  compileResult: CompileResult;
  replayResult: ReplayResult;
  runtimeResult: RuntimeResult;
  rollbackResult?: RollbackResult;
  failureReasons: string[];
  mutationDuration: number;
  validationSummaries: ValidationSummary[];
  createdAt: number;
}

export interface AppliedPatchInfo {
  patchId: string;
  proposalId: string;
  targetFile: string;
  targetLine: number;
  strategy: string;
  success: boolean;
  error?: string;
}

export interface CompileResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  duration: number;
}

export interface ReplayResult {
  success: boolean;
  passedSteps: number;
  failedSteps: number;
  divergedSteps: number;
  errors: string[];
  duration: number;
}

export interface RuntimeResult {
  success: boolean;
  validationPassed: boolean;
  confidence: number;
  errors: string[];
  duration: number;
}

export interface RollbackResult {
  success: boolean;
  patchesRolledBack: number;
  verificationPassed: boolean;
  errors: string[];
}

export interface ValidationSummary {
  type: string;
  passed: boolean;
  message: string;
  details: Record<string, unknown>;
}

export const SANDBOX_SCHEMA_VERSION = 1;
export const SANDBOX_STORAGE_DIR = 'sandbox';
export const MUTATION_REPORT_DIR = 'mutations';