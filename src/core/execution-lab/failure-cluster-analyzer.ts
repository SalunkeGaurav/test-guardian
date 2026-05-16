/**
 * Failure Cluster Analyzer
 *
 * Identifies repeated failure categories across execution batches:
 * - replay instability clusters
 * - selector instability clusters
 * - governance blind spots
 * - unsupported framework patterns
 * - patch instability clusters
 *
 * Reuses: EvidenceCollection, OperationalEvidenceRecord
 */

import type {
  EvidenceCollection,
  FailureClusterReport,
  FailureCluster,
  FailureClusterType,
  OperationalEvidenceRecord,
} from './types.js';

let clusterCounter = 0;
function nextClusterId(): string {
  clusterCounter++;
  return `cluster-${clusterCounter}`;
}

export class FailureClusterAnalyzer {
  analyze(collection: EvidenceCollection, batchId: string): FailureClusterReport {
    const clusters: FailureCluster[] = [];

    const replayEvidence = collection.records.filter((r) => r.type === 'replay-divergence');
    if (replayEvidence.length > 0) {
      clusters.push(this.createCluster('replay-instability', 'Replay instability across executions', replayEvidence));
    }

    const selectorEvidence = collection.records.filter(
      (r) =>
        r.type === 'healing-artifact' &&
        typeof r.metadata.totalAttempts === 'number' &&
        typeof r.metadata.successfulHealings === 'number' &&
        r.metadata.totalAttempts > r.metadata.successfulHealings,
    );
    if (selectorEvidence.length > 0) {
      clusters.push(this.createCluster('selector-instability', 'Selector instability causing healing failures', selectorEvidence));
    }

    const governanceEvidence = collection.records.filter((r) => r.type === 'governance-rejection');
    if (governanceEvidence.length > 0) {
      clusters.push(this.createCluster('governance-blind-spot', 'Governance blind spots rejecting valid operations', governanceEvidence));
    }

    const unsupportedEvidence = collection.records.filter((r) => r.type === 'unsupported-structure');
    if (unsupportedEvidence.length > 0) {
      clusters.push(this.createCluster('unsupported-framework-pattern', 'Unsupported framework patterns detected', unsupportedEvidence));
    }

    const patchEvidence = collection.records.filter(
      (r) => r.type === 'patch-outcome' && r.metadata.status !== 'applied',
    );
    if (patchEvidence.length > 0) {
      clusters.push(this.createCluster('patch-instability', 'Patch instability across executions', patchEvidence));
    }

    const totalFailures = collection.records.length;
    const mostSevereCluster = this.findMostSevere(clusters);

    return {
      batchId,
      clusters,
      totalClusters: clusters.length,
      totalFailures,
      mostSevereCluster,
      generatedAt: 0,
    };
  }

  private createCluster(
    type: FailureClusterType,
    description: string,
    evidence: OperationalEvidenceRecord[],
  ): FailureCluster {
    const affectedRepositories = [...new Set(evidence.map((e) => e.repoPath))].sort();
    const affectedExecutions = [...new Set(evidence.map((e) => e.executionId))].sort();

    const severity = this.computeSeverity(evidence);

    return {
      clusterId: nextClusterId(),
      type,
      description,
      affectedRepositories,
      affectedExecutions,
      frequency: evidence.length,
      severity,
      exampleEvidence: evidence.slice(0, 3),
    };
  }

  private computeSeverity(evidence: OperationalEvidenceRecord[]): 'low' | 'medium' | 'high' | 'critical' {
    const hasCritical = evidence.some((e) => e.severity === 'critical');
    const hasHigh = evidence.some((e) => e.severity === 'high');
    const hasMedium = evidence.some((e) => e.severity === 'medium');

    if (hasCritical) return 'critical';
    if (hasHigh) return 'high';
    if (hasMedium) return 'medium';
    return 'low';
  }

  private findMostSevere(clusters: FailureCluster[]): FailureCluster | null {
    if (clusters.length === 0) return null;

    const severityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

    let most: FailureCluster = clusters[0]!;
    for (const current of clusters) {
      const currentSeverity = severityOrder[current.severity] ?? 0;
      const mostSeverity = severityOrder[most.severity] ?? 0;
      if (currentSeverity > mostSeverity) {
        most = current;
      }
    }
    return most;
  }
}
