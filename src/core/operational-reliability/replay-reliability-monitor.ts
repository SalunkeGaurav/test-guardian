/**
 * Replay Reliability Monitor
 *
 * Tracks replay reproducibility, nondeterministic frequency,
 * navigation drift, async timing instability, failure clustering.
 *
 * No AI. Deterministic metric aggregation.
 */

import type { ReplayReliabilityReport, ReliabilityExecutionSession } from './types.js';

export class ReplayReliabilityMonitor {
  /**
   * Monitor replay reliability across an execution session.
   */
  monitor(session: ReliabilityExecutionSession): ReplayReliabilityReport {
    let totalReplays = 0;
    let reproducibleReplays = 0;
    let nondeterministicCount = 0;
    let navigationDriftCount = 0;
    let asyncInstabilityCount = 0;
    let failureClusters = 0;
    let consecutiveFailures = 0;
    let maxConsecutiveFailures = 0;

    for (const run of session.runs) {
      totalReplays++;

      if (run.executionReport) {
        if (run.executionReport.replayStability.replayDeterministic) {
          reproducibleReplays++;
          consecutiveFailures = 0;
        } else {
          nondeterministicCount++;
          consecutiveFailures++;
          if (consecutiveFailures > maxConsecutiveFailures) {
            maxConsecutiveFailures = consecutiveFailures;
          }
        }

        if (run.executionReport.replayStability.driftSeverity !== 'none') {
          navigationDriftCount++;
        }

        if (run.executionReport.runtimeMetrics.asyncRenderInstabilityFrequency > 0) {
          asyncInstabilityCount++;
        }
      }
    }

    if (maxConsecutiveFailures >= 3) {
      failureClusters = 1;
    }

    const reproducibilityRate = totalReplays > 0 ? reproducibleReplays / totalReplays : 1;
    const nondeterministicFrequency = totalReplays > 0 ? nondeterministicCount / totalReplays : 0;
    const navigationDriftFrequency = totalReplays > 0 ? navigationDriftCount / totalReplays : 0;
    const asyncTimingInstability = totalReplays > 0 ? asyncInstabilityCount / totalReplays : 0;

    const overallReliability = this.computeOverallReliability(
      reproducibilityRate,
      nondeterministicFrequency,
      navigationDriftFrequency,
    );

    return {
      sessionId: session.sessionId,
      totalReplays,
      reproducibleReplays,
      nondeterministicFrequency,
      navigationDriftFrequency,
      asyncTimingInstability,
      failureClustering: failureClusters,
      reproducibilityRate,
      overallReliability,
      detectedAt: session.completedAt,
    };
  }

  private computeOverallReliability(
    reproducibilityRate: number,
    nondeterministicFrequency: number,
    navigationDriftFrequency: number,
  ): ReplayReliabilityReport['overallReliability'] {
    const score = reproducibilityRate * 0.5 + (1 - nondeterministicFrequency) * 0.3 + (1 - navigationDriftFrequency) * 0.2;

    if (score >= 0.9) return 'high';
    if (score >= 0.7) return 'medium';
    if (score >= 0.4) return 'low';
    return 'critical';
  }
}
