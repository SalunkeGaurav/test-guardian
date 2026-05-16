/**
 * Evidence Collector
 *
 * Persists operational evidence from execution batches:
 * - healing artifacts
 * - replay divergence
 * - governance rejection
 * - patch outcomes
 * - runtime instability
 * - unsupported structures
 *
 * Reuses: ExecutionBatchReport, RepositoryExecutionResult
 */

import type {
  ExecutionBatchReport,
  EvidenceCollection,
  OperationalEvidenceRecord,
  EvidenceType,
} from './types.js';

let evidenceCounter = 0;
function nextEvidenceId(): string {
  evidenceCounter++;
  return `evidence-${evidenceCounter}`;
}

export class EvidenceCollector {
  collect(batchReport: ExecutionBatchReport): EvidenceCollection {
    const records: OperationalEvidenceRecord[] = [];

    for (const result of batchReport.results) {
      if (!result.report) {
        records.push({
          evidenceId: nextEvidenceId(),
          type: 'unsupported-structure',
          repoPath: result.repoPath,
          executionId: result.executionId,
          iteration: result.iteration,
          description: `Execution failed: ${result.error ?? 'unknown error'}`,
          severity: 'high',
          metadata: { error: result.error },
          collectedAt: 0,
        });
        continue;
      }

      const report = result.report;

      if (report.healingSummary.totalAttempts > 0) {
        records.push({
          evidenceId: nextEvidenceId(),
          type: 'healing-artifact',
          repoPath: result.repoPath,
          executionId: result.executionId,
          iteration: result.iteration,
          description: `Healing: ${report.healingSummary.successfulHealings}/${report.healingSummary.totalAttempts} successful`,
          severity: report.healingSummary.successfulHealings === report.healingSummary.totalAttempts ? 'low' : 'medium',
          metadata: {
            totalAttempts: report.healingSummary.totalAttempts,
            successfulHealings: report.healingSummary.successfulHealings,
            reviewPackages: report.healingSummary.reviewPackages,
          },
          collectedAt: 0,
        });
      }

      if (!report.replayStability.domStabilized || !report.replayStability.replayDeterministic) {
        records.push({
          evidenceId: nextEvidenceId(),
          type: 'replay-divergence',
          repoPath: result.repoPath,
          executionId: result.executionId,
          iteration: result.iteration,
          description: `Replay divergence detected: domStabilized=${report.replayStability.domStabilized}, deterministic=${report.replayStability.replayDeterministic}`,
          severity: report.replayStability.driftSeverity === 'high' ? 'high' : 'medium',
          metadata: {
            domStabilized: report.replayStability.domStabilized,
            replayDeterministic: report.replayStability.replayDeterministic,
            driftSeverity: report.replayStability.driftSeverity,
          },
          collectedAt: 0,
        });
      }

      if (!report.governanceDecisions.governancePassed) {
        records.push({
          evidenceId: nextEvidenceId(),
          type: 'governance-rejection',
          repoPath: result.repoPath,
          executionId: result.executionId,
          iteration: result.iteration,
          description: `Governance rejection: ${report.governanceDecisions.gatesFailed} gates failed`,
          severity: 'high',
          metadata: {
            gatesPassed: report.governanceDecisions.gatesPassed,
            gatesFailed: report.governanceDecisions.gatesFailed,
          },
          collectedAt: 0,
        });
      }

      if (report.patchProposals.totalProposals > 0) {
        records.push({
          evidenceId: nextEvidenceId(),
          type: 'patch-outcome',
          repoPath: result.repoPath,
          executionId: result.executionId,
          iteration: result.iteration,
          description: `Patch proposals: ${report.patchProposals.totalProposals} (${report.patchProposals.status})`,
          severity: report.patchProposals.status === 'applied' ? 'low' : 'medium',
          metadata: {
            totalProposals: report.patchProposals.totalProposals,
            status: report.patchProposals.status,
          },
          collectedAt: 0,
        });
      }

      if (result.runtimeInstability) {
        records.push({
          evidenceId: nextEvidenceId(),
          type: 'runtime-instability',
          repoPath: result.repoPath,
          executionId: result.executionId,
          iteration: result.iteration,
          description: `Runtime instability detected`,
          severity: 'medium',
          metadata: {
            domStabilizationSuccessRate: report.runtimeMetrics.domStabilizationSuccessRate,
            replayRecoverySuccess: report.runtimeMetrics.replayRecoverySuccess,
            staleRecoverySuccess: report.runtimeMetrics.staleRecoverySuccess,
          },
          collectedAt: 0,
        });
      }

      if (report.riskAnalysis.overallRisk === 'high' || report.riskAnalysis.overallRisk === 'critical') {
        records.push({
          evidenceId: nextEvidenceId(),
          type: 'unsupported-structure',
          repoPath: result.repoPath,
          executionId: result.executionId,
          iteration: result.iteration,
          description: `High risk: ${report.riskAnalysis.riskFactors.join(', ')}`,
          severity: report.riskAnalysis.overallRisk === 'critical' ? 'critical' : 'high',
          metadata: {
            risk: report.riskAnalysis.overallRisk,
            riskFactors: report.riskAnalysis.riskFactors,
          },
          collectedAt: 0,
        });
      }
    }

    return {
      batchId: batchReport.batchId,
      records,
      totalCount: records.length,
      collectedAt: 0,
    };
  }

  filterByType(collection: EvidenceCollection, type: EvidenceType): OperationalEvidenceRecord[] {
    return collection.records.filter((r) => r.type === type);
  }

  filterBySeverity(collection: EvidenceCollection, severity: OperationalEvidenceRecord['severity']): OperationalEvidenceRecord[] {
    return collection.records.filter((r) => r.severity === severity);
  }

  filterByRepo(collection: EvidenceCollection, repoPath: string): OperationalEvidenceRecord[] {
    return collection.records.filter((r) => r.repoPath === repoPath);
  }
}
