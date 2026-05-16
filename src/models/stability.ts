/**
 * Stability Report schema.
 *
 * Captures the result of repeated healing validations to measure
 * reproducibility, confidence variance, and flakiness.
 *
 * Used by StabilityAnalyzer to detect unstable repairs.
 * No AI. No patches.
 */

export interface StabilityRunResult {
  runIndex: number;
  validationStatus: string;
  runtimeStatus?: string;
  validationConfidence: number;
  runtimeConfidence?: number;
  matchedElementCount: number;
  falsePositiveCount: number;
  divergenceCount: number;
  duration: number;
}

export interface StabilityReport {
  candidateId: string;
  locatorId: string;
  proposedExpression: string;
  runCount: number;
  reproducibilityScore: number;
  confidenceVariance: number;
  runtimeReproducible: boolean;
  replayConsistent: boolean;
  flakinessIndicators: string[];
  runs: StabilityRunResult[];
  createdAt: number;
}

export const STABILITY_SCHEMA_VERSION = 1;
export const DEFAULT_STABILITY_RUNS = 3;
