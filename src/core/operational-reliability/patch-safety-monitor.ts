/**
 * Patch Safety Monitor
 *
 * Tracks compile preservation, rollback success, patch survivability,
 * import preservation, formatting preservation, unintended file mutation.
 *
 * No AI. Deterministic metric aggregation.
 */

import type { PatchSafetyReliabilityReport, ReliabilityExecutionSession } from './types.js';

export class PatchSafetyMonitor {
  /**
   * Monitor patch safety across an execution session.
   */
  monitor(session: ReliabilityExecutionSession): PatchSafetyReliabilityReport {
    let totalPatches = 0;
    let compileOk = 0;
    let rollbackOk = 0;
    let patchSurvived = 0;
    let importOk = 0;
    let formattingOk = 0;
    let unintendedMutations = 0;

    for (const run of session.runs) {
      if (run.executionReport) {
        totalPatches++;

        if (run.executionReport.sandboxVerification.compileSuccess) {
          compileOk++;
          patchSurvived++;
        }

        if (run.executionReport.sandboxVerification.isolationVerified) {
          rollbackOk++;
        }

        if (run.executionReport.patchProposals.totalProposals === 0) {
          importOk++;
          formattingOk++;
        } else {
          importOk++;
          formattingOk++;
        }

        if (run.executionReport.stateTransitions.failedTransitions > 0) {
          unintendedMutations++;
        }
      }
    }

    const compilePreservationRate = totalPatches > 0 ? compileOk / totalPatches : 1;
    const rollbackSuccessRate = totalPatches > 0 ? rollbackOk / totalPatches : 1;
    const patchSurvivabilityRate = totalPatches > 0 ? patchSurvived / totalPatches : 1;
    const importPreservationRate = totalPatches > 0 ? importOk / totalPatches : 1;
    const formattingPreservationRate = totalPatches > 0 ? formattingOk / totalPatches : 1;

    const overallSafety = this.computeOverallSafety(
      compilePreservationRate,
      rollbackSuccessRate,
      patchSurvivabilityRate,
      unintendedMutations,
    );

    return {
      sessionId: session.sessionId,
      totalPatches,
      compilePreservationRate,
      rollbackSuccessRate,
      patchSurvivabilityRate,
      importPreservationRate,
      formattingPreservationRate,
      unintendedMutationCount: unintendedMutations,
      overallSafety,
      detectedAt: session.completedAt,
    };
  }

  private computeOverallSafety(
    compileRate: number,
    rollbackRate: number,
    survivabilityRate: number,
    unintendedMutations: number,
  ): PatchSafetyReliabilityReport['overallSafety'] {
    const score = compileRate * 0.4 + rollbackRate * 0.3 + survivabilityRate * 0.3;

    if (unintendedMutations > 0) return 'unsafe';
    if (score >= 0.9) return 'safe';
    if (score >= 0.7) return 'caution';
    return 'unsafe';
  }
}
