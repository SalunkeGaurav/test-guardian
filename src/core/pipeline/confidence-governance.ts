/**
 * ConfidenceGovernance
 *
 * Deterministic approval gates for the healing pipeline.
 * Each gate evaluates a specific condition and either passes or rejects.
 *
 * Gates:
 *   1. Minimum static validation confidence
 *   2. Minimum runtime confidence (if runtime validation executed)
 *   3. Uniqueness (no duplicate proposals)
 *   4. Replay consistency (no divergences during runtime replay)
 *
 * No AI. No adaptive thresholds. Fully deterministic.
 */

import type { HealingCandidate } from '../../models/healing-candidate.js';
import type { ValidationResult } from '../../models/validation.js';
import type { RuntimeValidationResult } from '../../models/runtime.js';

export interface GovernanceConfig {
  /** Minimum validation confidence to pass static gate (0-1). Default 0.5. */
  minStaticValidationConfidence: number;
  /** Minimum runtime confidence to pass runtime gate (0-1). Default 0.6. */
  minRuntimeConfidence: number;
  /** Require that all proposals be unique (no expression duplicates). Default true. */
  requireUniqueness: boolean;
  /** Require no replay divergences for runtime validation. Default true. */
  requireReplayConsistency: boolean;
}

export interface GateResult {
  gate: string;
  passed: boolean;
  detail: string;
  failedCandidates?: string[];
}

export interface GovernanceResult {
  passed: boolean;
  gates: GateResult[];
  approvedCandidates: HealingCandidate[];
  rejectedCandidates: Array<{ candidate: HealingCandidate; reason: string; gate: string }>;
}

export const DEFAULT_GOVERNANCE_CONFIG: GovernanceConfig = {
  minStaticValidationConfidence: 0.5,
  minRuntimeConfidence: 0.6,
  requireUniqueness: true,
  requireReplayConsistency: true,
};

export class ConfidenceGovernance {
  private readonly config: GovernanceConfig;

  constructor(config?: Partial<GovernanceConfig>) {
    this.config = { ...DEFAULT_GOVERNANCE_CONFIG, ...config };
  }

  /**
   * Evaluate all governance gates against candidates and their validations.
   * Returns approved candidates and a list of rejected ones with reasons.
   */
  evaluate(
    candidates: HealingCandidate[],
    validations: Map<string, ValidationResult>,
    runtimeResult?: RuntimeValidationResult,
  ): GovernanceResult {
    const gates: GateResult[] = [];
    const rejected: Array<{ candidate: HealingCandidate; reason: string; gate: string }> = [];
    const approved: HealingCandidate[] = [];

    // Gate 1: Minimum static validation confidence
    const lowConfidenceRejects: string[] = [];
    for (const c of candidates) {
      const vr = validations.get(c.id);
      if (!vr || vr.replayConfidence < this.config.minStaticValidationConfidence) {
        lowConfidenceRejects.push(c.id);
        rejected.push({
          candidate: c,
          reason: `Validation confidence ${vr ? Math.round(vr.replayConfidence * 100) : 0}% below minimum ${Math.round(this.config.minStaticValidationConfidence * 100)}%`,
          gate: 'min-static-confidence',
        });
      }
    }

    gates.push({
      gate: 'min-static-confidence',
      passed: lowConfidenceRejects.length === 0,
      detail: lowConfidenceRejects.length > 0
        ? `${lowConfidenceRejects.length} candidate(s) below ${Math.round(this.config.minStaticValidationConfidence * 100)}% confidence threshold`
        : 'All candidates meet minimum static confidence',
      failedCandidates: lowConfidenceRejects.length > 0 ? lowConfidenceRejects : undefined,
    });

    // Gate 2: Minimum runtime confidence (only if runtime was executed)
    if (runtimeResult) {
      const runtimePassed = runtimeResult.runtimeConfidence >= this.config.minRuntimeConfidence;
      gates.push({
        gate: 'min-runtime-confidence',
        passed: runtimePassed,
        detail: runtimePassed
          ? `Runtime confidence ${Math.round(runtimeResult.runtimeConfidence * 100)}% meets minimum ${Math.round(this.config.minRuntimeConfidence * 100)}%`
          : `Runtime confidence ${Math.round(runtimeResult.runtimeConfidence * 100)}% below minimum ${Math.round(this.config.minRuntimeConfidence * 100)}%`,
      });

      if (!runtimePassed) {
        for (const c of candidates) {
          rejected.push({
            candidate: c,
            reason: `Runtime confidence ${Math.round(runtimeResult.runtimeConfidence * 100)}% below minimum ${Math.round(this.config.minRuntimeConfidence * 100)}%`,
            gate: 'min-runtime-confidence',
          });
        }
      }
    }

    // Gate 3: Uniqueness
    if (this.config.requireUniqueness) {
      const expressions = new Map<string, string[]>();
      for (const c of candidates) {
        const key = c.proposedExpression;
        if (!expressions.has(key)) expressions.set(key, []);
        expressions.get(key)!.push(c.id);
      }

      const duplicateIds = new Set<string>();
      for (const [, ids] of expressions) {
        if (ids.length > 1) ids.forEach(id => duplicateIds.add(id));
      }

      gates.push({
        gate: 'uniqueness',
        passed: duplicateIds.size === 0,
        detail: duplicateIds.size > 0
          ? `${duplicateIds.size} candidate(s) have duplicate expressions`
          : 'All proposals are unique',
        failedCandidates: duplicateIds.size > 0 ? Array.from(duplicateIds) : undefined,
      });
    }

    // Gate 4: Replay consistency
    if (this.config.requireReplayConsistency && runtimeResult) {
      const hasDivergence = runtimeResult.replayDivergence.length > 0;
      gates.push({
        gate: 'replay-consistency',
        passed: !hasDivergence,
        detail: hasDivergence
          ? `Runtime replay has ${runtimeResult.replayDivergence.length} divergence(s)`
          : 'Runtime replay is consistent with expected behavior',
      });

      if (hasDivergence) {
        for (const c of candidates) {
          rejected.push({
            candidate: c,
            reason: `Runtime replay diverged: ${runtimeResult.replayDivergence.map(d => `${d.type}: ${d.actual}`).join('; ')}`,
            gate: 'replay-consistency',
          });
        }
      }
    }

    // Determine which candidates are approved (not rejected)
    const rejectedIds = new Set(rejected.map(r => r.candidate.id));
    for (const c of candidates) {
      if (!rejectedIds.has(c.id)) {
        approved.push(c);
      }
    }

    const allPassed = gates.every(g => g.passed);

    return {
      passed: allPassed,
      gates,
      approvedCandidates: approved,
      rejectedCandidates: rejected,
    };
  }
}
