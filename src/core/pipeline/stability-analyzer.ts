/**
 * StabilityAnalyzer
 *
 * Runs repeated heuristic validations on the same candidate to measure
 * reproducibility, confidence variance, and detect flakiness.
 *
 * All analysis is deterministic. No AI. No adaptive behavior.
 *
 * Metrics:
 *   - reproducibilityScore: proportion of runs with identical validation status
 *   - confidenceVariance: standard deviation of confidence across runs
 *   - runtimeReproducible: runtime status consistent across runs
 *   - replayConsistent: no divergences across runs
 *   - flakinessIndicators: list of detected inconsistencies
 */

import type { HealingCandidate } from '../../models/healing-candidate.js';
import type { ReplaySession } from '../../models/replay.js';
import type { BrowserEngine } from '../runtime/browser.js';
import type { StabilityReport, StabilityRunResult } from '../../models/stability.js';
import type { ValidationResult } from '../../models/validation.js';
import type { RuntimeValidationResult } from '../../models/runtime.js';
import type { ElementNode } from '../../models/snapshot.js';
import { ValidationEngine } from '../validation/engine.js';
import { ReplayRuntime } from '../runtime/engine.js';
import { DEFAULT_STABILITY_RUNS } from '../../models/stability.js';

export class StabilityAnalyzer {
  private readonly validationEngine: ValidationEngine;

  constructor() {
    this.validationEngine = new ValidationEngine();
  }

  /**
   * Run repeated static validations and optionally runtime validations
   * to measure candidate stability.
   */
  async analyze(
    candidate: HealingCandidate,
    targetDom: ElementNode[],
    runCount: number = DEFAULT_STABILITY_RUNS,
    session?: ReplaySession,
    stepIndex?: number,
    browser?: BrowserEngine,
  ): Promise<StabilityReport> {
    const runs: StabilityRunResult[] = [];

    for (let i = 0; i < runCount; i++) {
      const run = await this.runSingle(candidate, targetDom, i, session, stepIndex, browser);
      runs.push(run);
    }

    return {
      candidateId: candidate.id,
      locatorId: candidate.locatorId,
      proposedExpression: candidate.proposedExpression,
      runCount,
      reproducibilityScore: this.computeReproducibilityScore(runs),
      confidenceVariance: this.computeConfidenceVariance(runs),
      runtimeReproducible: this.isRuntimeReproducible(runs),
      replayConsistent: this.isReplayConsistent(runs),
      flakinessIndicators: this.detectFlakiness(runs),
      runs,
      createdAt: Date.now(),
    };
  }

  /**
   * Execute a single validation run (static + optional runtime).
   */
  private async runSingle(
    candidate: HealingCandidate,
    targetDom: ElementNode[],
    runIndex: number,
    session?: ReplaySession,
    stepIndex?: number,
    browser?: BrowserEngine,
  ): Promise<StabilityRunResult> {
    const startedAt = Date.now();

    // Static validation
    const vr = this.validationEngine.validate({
      candidate,
      targetDom,
      replaySession: session,
      stepIndex: stepIndex ?? 0,
    });

    let runtimeResult: RuntimeValidationResult | undefined;

    // Optional runtime validation
    if (browser && session && stepIndex !== undefined) {
      const runtime = new ReplayRuntime(browser);
      try {
        const rr = await runtime.validate(session, candidate, stepIndex);
        if (rr.ok) {
          runtimeResult = rr.value;
        }
      } finally {
        await runtime.shutdown().catch(() => {});
      }
    }

    const duration = Date.now() - startedAt;

    return {
      runIndex,
      validationStatus: vr.ok ? vr.value.status : 'error',
      runtimeStatus: runtimeResult?.status,
      validationConfidence: vr.ok ? vr.value.replayConfidence : 0,
      runtimeConfidence: runtimeResult?.runtimeConfidence,
      matchedElementCount: vr.ok ? vr.value.matchedElementCount : 0,
      falsePositiveCount: runtimeResult?.falsePositiveIndicators.length ?? 0,
      divergenceCount: runtimeResult?.replayDivergence.length ?? 0,
      duration,
    };
  }

  /**
   * Compute reproducibility score: proportion of runs with identical validation status.
   */
  private computeReproducibilityScore(runs: StabilityRunResult[]): number {
    if (runs.length <= 1) return 1;
    const statusCounts = new Map<string, number>();
    for (const r of runs) {
      const key = `${r.validationStatus}|${r.runtimeStatus ?? 'none'}`;
      statusCounts.set(key, (statusCounts.get(key) ?? 0) + 1);
    }
    const maxCount = Math.max(...statusCounts.values(), 1);
    return Math.round((maxCount / runs.length) * 10000) / 10000;
  }

  /**
   * Compute confidence variance: standard deviation across runs.
   */
  private computeConfidenceVariance(runs: StabilityRunResult[]): number {
    if (runs.length <= 1) return 0;
    const confidences = runs.map(r => r.validationConfidence);
    const mean = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    const variance = confidences.reduce((sum, c) => sum + (c - mean) ** 2, 0) / confidences.length;
    return Math.round(Math.sqrt(variance) * 10000) / 10000;
  }

  /**
   * Check if runtime status is reproducible across all runs.
   */
  private isRuntimeReproducible(runs: StabilityRunResult[]): boolean {
    const runtimeRuns = runs.filter(r => r.runtimeStatus !== undefined);
    if (runtimeRuns.length <= 1) return true;
    const firstStatus = runtimeRuns[0]!.runtimeStatus;
    return runtimeRuns.every(r => r.runtimeStatus === firstStatus);
  }

  /**
   * Check if replay is consistent (no divergences) across all runs.
   */
  private isReplayConsistent(runs: StabilityRunResult[]): boolean {
    return runs.every(r => r.divergenceCount === 0);
  }

  /**
   * Detect flakiness indicators.
   */
  private detectFlakiness(runs: StabilityRunResult[]): string[] {
    const indicators: string[] = [];

    if (runs.length <= 1) return indicators;

    const statuses = runs.map(r => r.validationStatus);
    const uniqueStatuses = new Set(statuses);
    if (uniqueStatuses.size > 1) {
      indicators.push(`Validation status varies across runs: ${Array.from(uniqueStatuses).join(', ')}`);
    }

    const confidences = runs.map(r => r.validationConfidence);
    const min = Math.min(...confidences);
    const max = Math.max(...confidences);
    if (max - min > 0.1) {
      indicators.push(`Confidence score varies by ${Math.round((max - min) * 100)}% across runs`);
    }

    const divergences = runs.map(r => r.divergenceCount);
    if (divergences.some(d => d > 0) && divergences.some(d => d === 0)) {
      indicators.push('Divergence detection is inconsistent across runs');
    }

    const runtimeStatuses = runs.filter(r => r.runtimeStatus).map(r => r.runtimeStatus!);
    if (runtimeStatuses.length >= 2) {
      const uniqueRuntime = new Set(runtimeStatuses);
      if (uniqueRuntime.size > 1) {
        indicators.push(`Runtime status varies: ${Array.from(uniqueRuntime).join(', ')}`);
      }
    }

    return indicators;
  }
}
