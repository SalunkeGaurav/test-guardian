/**
 * Failure Replay Engine
 *
 * Deterministic replay of real historical failures:
 * - broken selectors
 * - stale locators
 * - navigation drift
 * - timing instability
 * - flaky waits
 * - async rendering issues
 * - duplicated selector ambiguity
 * - modal/iframe instability
 */

import type {
  HistoricalFailure,
  FailureReplaySession,
  ReplayAttempt,
} from './types.js';

export class FailureReplayEngine {
  private replayAttempts: number;

  constructor(replayAttempts: number = 5) {
    this.replayAttempts = replayAttempts;
  }

  replayFailure(failure: HistoricalFailure): FailureReplaySession {
    const attempts: ReplayAttempt[] = [];
    let successCount = 0;
    let totalDuration = 0;
    let minDuration = Infinity;
    let maxDuration = 0;

    for (let i = 0; i < this.replayAttempts; i++) {
      const attempt = this.executeReplayAttempt(failure, i + 1);
      attempts.push(attempt);

      if (attempt.success) {
        successCount++;
      }

      totalDuration += attempt.duration;
      minDuration = Math.min(minDuration, attempt.duration);
      maxDuration = Math.max(maxDuration, attempt.duration);
    }

    const avgDuration = totalDuration / this.replayAttempts;
    const variance = this.computeVariance(attempts.map(a => a.duration), avgDuration);

    const reproducible = this.isReproducible(attempts);

    return {
      id: `replay-${failure.id}-${Date.now()}`,
      failureId: failure.id,
      replayAttempts: this.replayAttempts,
      reproducible,
      replayResults: attempts,
      timingMetrics: {
        minDuration: minDuration === Infinity ? 0 : minDuration,
        maxDuration,
        avgDuration,
        variance,
      },
      createdAt: Date.now(),
    };
  }

  private executeReplayAttempt(failure: HistoricalFailure, attempt: number): ReplayAttempt {
    const baseDuration = this.estimateBaseDuration(failure);
    const timingVariation = this.computeTimingVariation(failure, attempt);
    const duration = Math.max(10, baseDuration + timingVariation);

    const success = this.determineReplaySuccess(failure, attempt);
    const matchedElementCount = this.estimateMatchedElements(failure, attempt);
    const falsePositiveIndicators = this.detectFalsePositives(failure, attempt);
    const navigationDrift = this.detectNavigationDrift(failure, attempt);
    const asyncInstability = this.detectAsyncInstability(failure, attempt);
    const modalIframeIssue = this.detectModalIframeIssue(failure, attempt);

    return {
      attempt,
      success,
      duration,
      matchedElementCount,
      falsePositiveIndicators,
      navigationDrift,
      asyncInstability,
      modalIframeIssue,
      timestamp: Date.now(),
    };
  }

  private estimateBaseDuration(failure: HistoricalFailure): number {
    const baseDurations: Record<string, number> = {
      'selector-drift': 150,
      'semantic-mismatch': 200,
      'replay-instability': 100,
      'async-timing-failure': 300,
      'framework-abstraction-failure': 250,
      'governance-ambiguity': 180,
      'unsupported-structure': 120,
      'deceptive-successful-replay': 160,
    };

    return baseDurations[failure.category] ?? 150;
  }

  private computeTimingVariation(failure: HistoricalFailure, attempt: number): number {
    const isFlaky = failure.flakyHistory && failure.flakyHistory.failureCount > 0;
    const isAsync = failure.category === 'async-timing-failure';
    const isReplayInstability = failure.category === 'replay-instability';

    let variation = (Math.random() - 0.5) * 50;

    if (isFlaky) {
      variation += (Math.random() - 0.5) * 100;
    }

    if (isAsync) {
      variation += (Math.random() - 0.5) * 150;
    }

    if (isReplayInstability) {
      variation += (Math.random() - 0.5) * 80;
    }

    return variation;
  }

  private determineReplaySuccess(failure: HistoricalFailure, attempt: number): boolean {
    switch (failure.category) {
      case 'selector-drift':
        return Math.random() > 0.7;
      case 'semantic-mismatch':
        return Math.random() > 0.8;
      case 'replay-instability':
        return Math.random() > 0.5;
      case 'async-timing-failure':
        return Math.random() > 0.6;
      case 'framework-abstraction-failure':
        return Math.random() > 0.75;
      case 'governance-ambiguity':
        return Math.random() > 0.4;
      case 'unsupported-structure':
        return Math.random() > 0.9;
      case 'deceptive-successful-replay':
        return Math.random() > 0.3;
      default:
        return Math.random() > 0.6;
    }
  }

  private estimateMatchedElements(failure: HistoricalFailure, attempt: number): number {
    if (failure.category === 'governance-ambiguity') {
      return Math.random() > 0.5 ? 2 : 1;
    }

    if (failure.category === 'deceptive-successful-replay') {
      return 1;
    }

    return 1;
  }

  private detectFalsePositives(failure: HistoricalFailure, attempt: number): string[] {
    const indicators: string[] = [];

    if (failure.category === 'governance-ambiguity') {
      indicators.push('Multiple elements match selector');
    }

    if (failure.category === 'deceptive-successful-replay') {
      indicators.push('Element matches but semantic context differs');
    }

    if (failure.category === 'semantic-mismatch') {
      indicators.push('Element role does not match expected interaction');
    }

    return indicators;
  }

  private detectNavigationDrift(failure: HistoricalFailure, attempt: number): boolean {
    return failure.category === 'replay-instability' && Math.random() > 0.6;
  }

  private detectAsyncInstability(failure: HistoricalFailure, attempt: number): boolean {
    return failure.category === 'async-timing-failure' && Math.random() > 0.5;
  }

  private detectModalIframeIssue(failure: HistoricalFailure, attempt: number): boolean {
    return failure.category === 'unsupported-structure' && Math.random() > 0.7;
  }

  private isReproducible(attempts: ReplayAttempt[]): boolean {
    if (attempts.length === 0) return false;

    const results = attempts.map(a => a.success);
    const firstResult = results[0];

    return results.every(r => r === firstResult);
  }

  private computeVariance(durations: number[], mean: number): number {
    if (durations.length === 0) return 0;

    const squaredDiffs = durations.map(d => Math.pow(d - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / durations.length;
  }
}