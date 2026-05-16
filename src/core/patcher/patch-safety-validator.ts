/**
 * PatchSafetyValidator
 *
 * Deterministic safety gates for patch generation.
 * Rejects patch generation if any gate fails.
 *
 * Gates:
 *   1. Target node is unique (no ambiguous/duplicate matches)
 *   2. Locator confidence meets governance threshold
 *   3. No replay instability detected
 *   4. Runtime validation passed (if executed)
 *   5. AST node is unambiguously locatable in source
 *
 * No AI. No adaptive thresholds. Fully deterministic.
 */

import type { HealingCandidate } from '../../models/healing-candidate.js';
import type { ValidationResult } from '../../models/validation.js';
import type { RuntimeValidationResult } from '../../models/runtime.js';
import type { StabilityReport } from '../../models/stability.js';
import type { Result } from '../../models/result.js';
import { success, failure } from '../../models/result.js';

export interface SafetyGateResult {
  gate: string;
  passed: boolean;
  detail: string;
}

export interface SafetyValidationInput {
  candidate: HealingCandidate;
  validation?: ValidationResult;
  runtimeValidation?: RuntimeValidationResult;
  stabilityReport?: StabilityReport;
  governanceThreshold: number;
}

export interface SafetyValidationOutput {
  passed: boolean;
  gates: SafetyGateResult[];
  rejectionReason?: string;
}

export class PatchSafetyValidator {
  private readonly defaultGovernanceThreshold: number;

  constructor(governanceThreshold: number = 0.5) {
    this.defaultGovernanceThreshold = governanceThreshold;
  }

  /**
   * Validate all safety gates for patch generation.
   * Returns failure if any gate is not passed.
   */
  validate(input: SafetyValidationInput): Result<SafetyValidationOutput> {
    const gates: SafetyGateResult[] = [];

    const threshold = input.governanceThreshold ?? this.defaultGovernanceThreshold;

    // Gate 1: Target node must be uniquely identifiable
    gates.push(this.gateNodeUniqueness(input));

    // Gate 2: Locator confidence above governance threshold
    gates.push(this.gateConfidenceThreshold(input, threshold));

    // Gate 3: No replay instability
    gates.push(this.gateReplayStability(input));

    // Gate 4: Runtime validation passed (if executed)
    gates.push(this.gateRuntimeValidation(input));

    // Gate 5: AST node must be unambiguously locatable (assessed by generator)
    // This is checked inline by the patch generator itself.

    const allPassed = gates.every(g => g.passed);
    const failedGates = gates.filter(g => !g.passed);

    return success({
      passed: allPassed,
      gates,
      rejectionReason: allPassed
        ? undefined
        : `Patch generation rejected: ${failedGates.map(g => g.detail).join('; ')}`,
    });
  }

  private gateNodeUniqueness(input: SafetyValidationInput): SafetyGateResult {
    const vr = input.validation;
    if (!vr) {
      return { gate: 'node-uniqueness', passed: true, detail: 'No validation result available, skipping' };
    }

    if (vr.matchedElementCount === 0) {
      return { gate: 'node-uniqueness', passed: false, detail: 'Target node not found (0 matches)' };
    }

    if (vr.matchedElementCount > 1) {
      return { gate: 'node-uniqueness', passed: false, detail: `Ambiguous target: ${vr.matchedElementCount} matching nodes` };
    }

    if (vr.status === 'ambiguous') {
      const multiMatch = vr.falsePositiveIndicators.find(f => f.type === 'multiple-matches');
      if (multiMatch) {
        return { gate: 'node-uniqueness', passed: false, detail: `Multiple matching nodes: ${multiMatch.detail}` };
      }
    }

    return { gate: 'node-uniqueness', passed: true, detail: 'Single unique target node identified' };
  }

  private gateConfidenceThreshold(input: SafetyValidationInput, threshold: number): SafetyGateResult {
    const vr = input.validation;
    if (!vr) {
      return { gate: 'confidence-threshold', passed: true, detail: 'No validation result available, skipping' };
    }

    if (vr.replayConfidence < threshold) {
      return {
        gate: 'confidence-threshold',
        passed: false,
        detail: `Validation confidence ${(vr.replayConfidence * 100).toFixed(0)}% below governance threshold ${(threshold * 100).toFixed(0)}%`,
      };
    }

    return { gate: 'confidence-threshold', passed: true, detail: `Confidence ${(vr.replayConfidence * 100).toFixed(0)}% meets threshold` };
  }

  private gateReplayStability(input: SafetyValidationInput): SafetyGateResult {
    const sr = input.stabilityReport;
    if (!sr) {
      return { gate: 'replay-stability', passed: true, detail: 'No stability report available, skipping' };
    }

    if (sr.flakinessIndicators.length > 0) {
      return {
        gate: 'replay-stability',
        passed: false,
        detail: `Replay instability detected: ${sr.flakinessIndicators.join('; ')}`,
      };
    }

    if (sr.reproducibilityScore < 0.8) {
      return {
        gate: 'replay-stability',
        passed: false,
        detail: `Low reproducibility score: ${(sr.reproducibilityScore * 100).toFixed(0)}%`,
      };
    }

    if (sr.confidenceVariance > 0.1) {
      return {
        gate: 'replay-stability',
        passed: false,
        detail: `High confidence variance: ${(sr.confidenceVariance * 100).toFixed(2)}%`,
      };
    }

    return { gate: 'replay-stability', passed: true, detail: 'Replay is stable' };
  }

  private gateRuntimeValidation(input: SafetyValidationInput): SafetyGateResult {
    const rv = input.runtimeValidation;
    if (!rv) {
      return { gate: 'runtime-validation', passed: true, detail: 'No runtime validation executed, skipping' };
    }

    if (rv.status !== 'passed') {
      return {
        gate: 'runtime-validation',
        passed: false,
        detail: `Runtime validation ${rv.status}: ${rv.replayDivergence.length} divergence(s), ${rv.falsePositiveIndicators.length} false positive(s)`,
      };
    }

    if (rv.runtimeConfidence < 0.6) {
      return {
        gate: 'runtime-validation',
        passed: false,
        detail: `Runtime confidence ${(rv.runtimeConfidence * 100).toFixed(0)}% below required 60%`,
      };
    }

    return { gate: 'runtime-validation', passed: true, detail: 'Runtime validation passed' };
  }
}
