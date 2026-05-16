/**
 * Failure Boundary
 *
 * Strict failure isolation for the unified runtime.
 * Degrades gracefully on runtime failures, replay divergence,
 * sandbox corruption, governance rejection, compile failures.
 *
 * No AI. No autonomous recovery. Deterministic failure handling.
 */

import type { FailureType, ExecutionStage, FailureBoundaryEvent, FailureBoundaryReport } from './types.js';

const RECOVERABLE_FAILURES: FailureType[] = [
  'replay-divergence',
  'governance-rejection',
];

const UNRECOVERABLE_FAILURES: FailureType[] = [
  'sandbox-corruption',
  'repository-incompatible',
];

const DEGRADATION_MAP: Record<FailureType, ExecutionStage | undefined> = {
  'runtime-failure': 'validation',
  'replay-divergence': 'governance-review',
  'sandbox-corruption': undefined,
  'governance-rejection': 'review-package-generation',
  'compile-failure': 'governance-review',
  'repository-incompatible': undefined,
};

export class FailureBoundary {
  private events: FailureBoundaryEvent[] = [];

  /**
   * Record a failure event and determine recovery strategy.
   */
  record(
    type: FailureType,
    stage: ExecutionStage,
    error: string,
  ): { recoverable: boolean; degradedTo?: ExecutionStage } {
    const recoverable = RECOVERABLE_FAILURES.includes(type) || !UNRECOVERABLE_FAILURES.includes(type);
    const degradedTo = DEGRADATION_MAP[type];

    const event: FailureBoundaryEvent = {
      type,
      stage,
      error,
      recoverable,
      degradedTo,
      timestamp: 0,
    };

    this.events.push(event);

    return { recoverable, degradedTo };
  }

  /**
   * Generate the failure boundary report.
   */
  generateReport(): FailureBoundaryReport {
    const recoverableFailures = this.events.filter(e => e.recoverable).length;
    const unrecoverableFailures = this.events.length - recoverableFailures;
    const gracefulDegradation = unrecoverableFailures === 0;

    return {
      events: [...this.events],
      totalFailures: this.events.length,
      recoverableFailures,
      unrecoverableFailures,
      gracefulDegradation,
    };
  }

  /**
   * Check if any unrecoverable failures occurred.
   */
  hasUnrecoverableFailures(): boolean {
    return this.events.some(e => !e.recoverable);
  }

  /**
   * Get the latest degradation target.
   */
  getDegradationTarget(): ExecutionStage | undefined {
    for (let i = this.events.length - 1; i >= 0; i--) {
      const event = this.events[i]!;
      if (event.degradedTo) return event.degradedTo;
    }
    return undefined;
  }
}
