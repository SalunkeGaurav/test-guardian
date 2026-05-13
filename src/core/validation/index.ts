/**
 * Replay Validation Module
 *
 * Deterministic validation of healing proposals against recorded DOM snapshots.
 *
 * This module is the validation layer in the healing pipeline:
 *   HealingEngine → generates candidates
 *   ValidationEngine → validates candidates against replay context
 *   (Patcher → applies only after successful validation)
 *
 * Validation does NOT:
 * - Apply patches
 * - Modify files
 * - Use AI or LLMs
 * - Execute browser automation
 */

export { ValidationEngine } from './engine.js';
export type { ValidationInput } from './engine.js';
export { resolveLocatorExpression } from './resolver.js';
export type { ResolvedElement } from './resolver.js';
export { detectFalsePositives } from './false-positive.js';
export { computeValidationConfidence, determineStatus, evaluateInteractionSuccess, computeElementDepth } from './scoring.js';
export type { ScoringInput } from './scoring.js';
