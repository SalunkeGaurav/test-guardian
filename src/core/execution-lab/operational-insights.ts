/**
 * Operational Insights
 *
 * Generates deterministic operational recommendations:
 * - unstable architecture patterns
 * - weak governance thresholds
 * - replay instability hotspots
 * - risky mutation structures
 * - runtime fragility zones
 *
 * Reuses: EvidenceCollection, FailureClusterReport, ReliabilityTrendReport, UnsupportedPatternInventory
 */

import type {
  EvidenceCollection,
  FailureClusterReport,
  ReliabilityTrendReport,
  UnsupportedPatternInventory,
  OperationalInsightsReport,
  OperationalInsight,
  InsightType,
  OperationalEvidenceRecord,
} from './types.js';

let insightCounter = 0;
function nextInsightId(): string {
  insightCounter++;
  return `insight-${insightCounter}`;
}

export class OperationalInsights {
  generate(
    evidenceCollection: EvidenceCollection,
    clusterReport: FailureClusterReport,
    trendReport: ReliabilityTrendReport,
    patternInventory: UnsupportedPatternInventory,
    batchId: string,
  ): OperationalInsightsReport {
    const insights: OperationalInsight[] = [];

    const architectureInsights = this.detectUnstableArchitecturePatterns(evidenceCollection, patternInventory);
    insights.push(...architectureInsights);

    const governanceInsights = this.detectWeakGovernanceThresholds(evidenceCollection, clusterReport);
    insights.push(...governanceInsights);

    const replayInsights = this.detectReplayInstabilityHotspots(evidenceCollection, trendReport);
    insights.push(...replayInsights);

    const mutationInsights = this.detectRiskyMutationStructures(evidenceCollection, patternInventory);
    insights.push(...mutationInsights);

    const fragilityInsights = this.detectRuntimeFragilityZones(evidenceCollection, trendReport);
    insights.push(...fragilityInsights);

    const criticalInsights = insights.filter((i) => i.severity === 'critical').length;
    const highInsights = insights.filter((i) => i.severity === 'high').length;

    return {
      batchId,
      insights,
      totalInsights: insights.length,
      criticalInsights,
      highInsights,
      generatedAt: 0,
    };
  }

  private detectUnstableArchitecturePatterns(
    evidence: EvidenceCollection,
    patterns: UnsupportedPatternInventory,
  ): OperationalInsight[] {
    const insights: OperationalInsight[] = [];

    const wrapperEvidence = patterns.patterns.filter((p) => p.type === 'wrapper-heavy-abstraction');
    if (wrapperEvidence.length > 0) {
      const affectedRepos = [...new Set(wrapperEvidence.map((p) => p.repoPath))].sort();
      insights.push({
        insightId: nextInsightId(),
        type: 'unstable-architecture-pattern',
        title: 'Wrapper-heavy abstractions detected',
        description: `${wrapperEvidence.length} repositories use heavy wrapper abstractions that reduce test reliability`,
        severity: wrapperEvidence.length > 2 ? 'high' : 'medium',
        affectedRepositories: affectedRepos,
        recommendation: 'Reduce wrapper abstraction layers and use direct selector patterns',
        evidence: evidence.records.filter((r) => r.type === 'unsupported-structure').slice(0, 3),
      });
    }

    return insights;
  }

  private detectWeakGovernanceThresholds(
    evidence: EvidenceCollection,
    clusters: FailureClusterReport,
  ): OperationalInsight[] {
    const insights: OperationalInsight[] = [];

    const governanceClusters = clusters.clusters.filter((c) => c.type === 'governance-blind-spot');
    if (governanceClusters.length > 0) {
      const affectedRepos = [...new Set(governanceClusters.flatMap((c) => c.affectedRepositories))].sort();
      insights.push({
        insightId: nextInsightId(),
        type: 'weak-governance-threshold',
        title: 'Governance blind spots detected',
        description: `${governanceClusters.length} governance blind spots causing rejections`,
        severity: governanceClusters.some((c) => c.severity === 'high' || c.severity === 'critical') ? 'high' : 'medium',
        affectedRepositories: affectedRepos,
        recommendation: 'Review governance thresholds and adjust confidence gates',
        evidence: evidence.records.filter((r) => r.type === 'governance-rejection').slice(0, 3),
      });
    }

    return insights;
  }

  private detectReplayInstabilityHotspots(
    evidence: EvidenceCollection,
    trends: ReliabilityTrendReport,
  ): OperationalInsight[] {
    const insights: OperationalInsight[] = [];

    if (trends.replayStabilityTrend.direction === 'degrading') {
      const affectedRepos = [...new Set(evidence.records.filter((r) => r.type === 'replay-divergence').map((r) => r.repoPath))].sort();
      insights.push({
        insightId: nextInsightId(),
        type: 'replay-instability-hotspot',
        title: 'Replay stability degrading',
        description: 'Replay stability is trending downward across iterations',
        severity: 'high',
        affectedRepositories: affectedRepos,
        recommendation: 'Investigate replay divergence causes and stabilize DOM settling',
        evidence: evidence.records.filter((r) => r.type === 'replay-divergence').slice(0, 3),
      });
    }

    return insights;
  }

  private detectRiskyMutationStructures(
    evidence: EvidenceCollection,
    patterns: UnsupportedPatternInventory,
  ): OperationalInsight[] {
    const insights: OperationalInsight[] = [];

    const dynamicSelectorPatterns = patterns.patterns.filter((p) => p.type === 'dynamic-selector-factory');
    if (dynamicSelectorPatterns.length > 0) {
      const affectedRepos = [...new Set(dynamicSelectorPatterns.map((p) => p.repoPath))].sort();
      insights.push({
        insightId: nextInsightId(),
        type: 'risky-mutation-structure',
        title: 'Dynamic selector factories detected',
        description: `${dynamicSelectorPatterns.length} repositories use dynamic selector factories that prevent reliable healing`,
        severity: dynamicSelectorPatterns.length > 2 ? 'high' : 'medium',
        affectedRepositories: affectedRepos,
        recommendation: 'Replace dynamic selector factories with static, stable selectors',
        evidence: evidence.records.filter((r) => r.type === 'healing-artifact').slice(0, 3),
      });
    }

    return insights;
  }

  private detectRuntimeFragilityZones(
    evidence: EvidenceCollection,
    trends: ReliabilityTrendReport,
  ): OperationalInsight[] {
    const insights: OperationalInsight[] = [];

    if (trends.runtimeReliabilityTrend.direction === 'degrading') {
      const affectedRepos = [...new Set(evidence.records.filter((r) => r.type === 'runtime-instability').map((r) => r.repoPath))].sort();
      insights.push({
        insightId: nextInsightId(),
        type: 'runtime-fragility-zone',
        title: 'Runtime reliability degrading',
        description: 'Runtime reliability is trending downward across iterations',
        severity: 'high',
        affectedRepositories: affectedRepos,
        recommendation: 'Apply runtime hardening techniques to stabilize execution',
        evidence: evidence.records.filter((r) => r.type === 'runtime-instability').slice(0, 3),
      });
    }

    return insights;
  }
}
