/**
 * Runtime Healing Loop Module
 *
 * End-to-end orchestrator for runtime healing execution:
 *   Failure capture → Candidate generation → Validation → Sandbox → Review
 *
 * Sub-modules:
 *   - FailureCapture: extract failure context from Playwright errors
 *   - CandidateExecutor: validate and reject candidates via existing pipeline
 *   - SandboxRevalidator: apply patches in sandbox and verify
 *   - ReviewPackageGenerator: produce deterministic review artifacts
 *
 * @module runtime-healing-loop
 */

export { RuntimeHealingLoop } from './runtime-healing-loop.js';
export { FailureCapture } from './failure-capture.js';
export type { FailureInput } from './failure-capture.js';
export { CandidateExecutor } from './candidate-executor.js';
export type { CandidateExecutorInput } from './candidate-executor.js';
export { SandboxRevalidator } from './sandbox-revalidator.js';
export type { SandboxRevalidatorInput } from './sandbox-revalidator.js';
export { ReviewPackageGenerator } from './review-package-generator.js';
export type { ReviewPackageInput } from './review-package-generator.js';

export type {
  FailureContext,
  CandidateExecutionResult,
  RejectionCriteria,
  SandboxPatchResult,
  RuntimeHealingReviewPackage,
  RuntimeHealingMetrics,
  RuntimeHealingLoopResult,
  RuntimeHealingLoopInput,
} from './types.js';
