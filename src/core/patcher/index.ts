/**
 * Controlled Patch Generation Module v1
 *
 * Generates deterministic, reviewable patch proposals from validated
 * healing candidates. All output is review-only — patches are NOT applied.
 *
 * Lifecycle:
 *   proposed -> approved -> applied -> rolled_back
 *
 * Sub-modules:
 *   PatchGenerator     — AST-based patch proposal generation
 *   PatchDiffEngine    — Unified diff generation
 *   PatchSafetyValidator — Safety gates for patch generation
 *   PatchStorage       — Persistence to .testguardian/patches/
 *
 * Architecture constraints:
 *   - No automatic file modification
 *   - No git commits
 *   - No autonomous approvals
 *   - No AI-generated code rewriting
 *   - AST-safe deterministic patching only
 */

export { PatchGenerator } from './patch-generator.js';
export type { PatchGeneratorInput, LocatorAstMatch } from './patch-generator.js';

export { PatchDiffEngine } from './patch-diff-engine.js';

export { PatchSafetyValidator } from './patch-safety-validator.js';
export type { SafetyGateResult, SafetyValidationInput, SafetyValidationOutput } from './patch-safety-validator.js';

export { PatchStorage } from './patch-storage.js';
