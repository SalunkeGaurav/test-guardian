/**
 * Sandbox Module
 *
 * Provides isolated framework mutation testing environment.
 * Never modifies original framework - all mutations happen in sandbox.
 *
 * Sub-modules:
 *   - sandbox-manager: Workspace creation and management
 *   - patch-applier: AST-safe patch application
 *   - mutation-verifier: Static/runtime/structural verification
 *   - rollback-engine: Deterministic rollback with hash verification
 *   - mutation-reporter: Report generation and persistence
 *   - mutation-sandbox: Main orchestrator
 *
 * No AI. No autonomous execution.
 */

export { SandboxManager, createSandboxManager } from './sandbox-manager.js';
export { PatchApplicationEngine, createPatchApplicationEngine } from './patch-applier.js';
export type { PatchApplicationResult, PatchValidationResult } from './patch-applier.js';
export { MutationVerificationPipeline, createMutationVerificationPipeline } from './mutation-verifier.js';
export type { VerificationContext } from './mutation-verifier.js';
export { RollbackEngine, createRollbackEngine } from './rollback-engine.js';
export type { RollbackResult as RollbackOperationResult } from './rollback-engine.js';
export { MutationReporter, createMutationReporter } from './mutation-reporter.js';
export { MutationSandbox, createMutationSandbox } from './mutation-sandbox.js';
export type { SandboxExecutionResult } from './mutation-sandbox.js';

export type {
  SandboxConfig,
  SandboxState,
  SandboxStatus,
  AppliedPatch,
  RollbackRecord,
  VerificationResult,
  StaticVerification,
  RuntimeVerification,
  StructuralVerification,
  MutationValidationResult,
  MutationReport,
  AppliedPatchInfo,
  CompileResult,
  ReplayResult,
  RuntimeResult,
  RollbackResult,
  ValidationSummary,
} from '../../models/sandbox.js';

export {
  SANDBOX_SCHEMA_VERSION,
  SANDBOX_STORAGE_DIR,
  MUTATION_REPORT_DIR,
} from '../../models/sandbox.js';