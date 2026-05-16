/**
 * Execution Lab
 *
 * Main orchestrator for the execution laboratory.
 * Continuously runs TestGuardian against real repositories and collects
 * operational evidence to measure real-world reliability.
 *
 * Reuses:
 * - ExecutionScheduler
 * - EvidenceCollector
 * - FailureClusterAnalyzer
 * - ReliabilityTrendAnalyzer
 * - UnsupportedPatternDetector
 * - OperationalInsights
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ExecutionScheduler } from './execution-scheduler.js';
import { EvidenceCollector } from './evidence-collector.js';
import { FailureClusterAnalyzer } from './failure-cluster-analyzer.js';
import { ReliabilityTrendAnalyzer } from './reliability-trend-analyzer.js';
import { UnsupportedPatternDetector } from './unsupported-pattern-detector.js';
import { OperationalInsights } from './operational-insights.js';
import type { ExecutionLabInput, ExecutionLabResult } from './types.js';

export class ExecutionLab {
  private readonly scheduler: ExecutionScheduler;
  private readonly evidenceCollector: EvidenceCollector;
  private readonly clusterAnalyzer: FailureClusterAnalyzer;
  private readonly trendAnalyzer: ReliabilityTrendAnalyzer;
  private readonly patternDetector: UnsupportedPatternDetector;
  private readonly insightsGenerator: OperationalInsights;

  constructor(private readonly projectRoot: string) {
    this.scheduler = new ExecutionScheduler();
    this.evidenceCollector = new EvidenceCollector();
    this.clusterAnalyzer = new FailureClusterAnalyzer();
    this.trendAnalyzer = new ReliabilityTrendAnalyzer();
    this.patternDetector = new UnsupportedPatternDetector();
    this.insightsGenerator = new OperationalInsights();
  }

  async execute(input: ExecutionLabInput): Promise<ExecutionLabResult> {
    const {
      corpusPath,
      iterations = 3,
      batchSize = 10,
      subsetPattern,
      reportOnly = false,
    } = input;

    const batchReport = await this.scheduler.executeBatch({
      corpusPath,
      iterations,
      batchSize,
      subsetPattern,
      reportOnly,
    });

    const evidenceCollection = this.evidenceCollector.collect(batchReport);
    const failureClusterReport = this.clusterAnalyzer.analyze(evidenceCollection, batchReport.batchId);
    const reliabilityTrendReport = this.trendAnalyzer.analyze(batchReport);
    const unsupportedPatternInventory = this.patternDetector.detect(batchReport);
    const operationalInsightsReport = this.insightsGenerator.generate(
      evidenceCollection,
      failureClusterReport,
      reliabilityTrendReport,
      unsupportedPatternInventory,
      batchReport.batchId,
    );

    const persistedPaths = this.persistResults({
      batchReport,
      evidenceCollection,
      failureClusterReport,
      reliabilityTrendReport,
      unsupportedPatternInventory,
      operationalInsightsReport,
      persistedPaths: [],
    });

    return {
      batchReport,
      evidenceCollection,
      failureClusterReport,
      reliabilityTrendReport,
      unsupportedPatternInventory,
      operationalInsightsReport,
      persistedPaths,
    };
  }

  private persistResults(result: ExecutionLabResult): string[] {
    const paths: string[] = [];

    try {
      const outputDir = join(this.projectRoot, '.testguardian', 'execution-lab');
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      const batchPath = join(outputDir, `${result.batchReport.batchId}.json`);
      writeFileSync(
        batchPath,
        JSON.stringify(
          {
            batchId: result.batchReport.batchId,
            totalRepositories: result.batchReport.totalRepositories,
            completedRepositories: result.batchReport.completedRepositories,
            failedRepositories: result.batchReport.failedRepositories,
            totalResults: result.batchReport.results.length,
          },
          null,
          2,
        ),
        'utf-8',
      );
      paths.push(batchPath);

      const evidencePath = join(outputDir, `${result.batchReport.batchId}-evidence.json`);
      writeFileSync(
        evidencePath,
        JSON.stringify(
          {
            batchId: result.evidenceCollection.batchId,
            totalRecords: result.evidenceCollection.totalCount,
            recordsByType: this.countRecordsByType(result.evidenceCollection),
          },
          null,
          2,
        ),
        'utf-8',
      );
      paths.push(evidencePath);

      const clusterPath = join(outputDir, `${result.batchReport.batchId}-clusters.json`);
      writeFileSync(
        clusterPath,
        JSON.stringify(
          {
            batchId: result.failureClusterReport.batchId,
            totalClusters: result.failureClusterReport.totalClusters,
            totalFailures: result.failureClusterReport.totalFailures,
            clusters: result.failureClusterReport.clusters.map((c) => ({
              clusterId: c.clusterId,
              type: c.type,
              frequency: c.frequency,
              severity: c.severity,
            })),
          },
          null,
          2,
        ),
        'utf-8',
      );
      paths.push(clusterPath);

      const trendPath = join(outputDir, `${result.batchReport.batchId}-trends.json`);
      writeFileSync(
        trendPath,
        JSON.stringify(
          {
            batchId: result.reliabilityTrendReport.batchId,
            overallTrend: result.reliabilityTrendReport.overallTrend,
            trends: result.reliabilityTrendReport.trends.map((t) => ({
              metric: t.metric,
              direction: t.direction,
              changePercent: t.changePercent,
            })),
          },
          null,
          2,
        ),
        'utf-8',
      );
      paths.push(trendPath);

      const patternsPath = join(outputDir, `${result.batchReport.batchId}-patterns.json`);
      writeFileSync(
        patternsPath,
        JSON.stringify(
          {
            batchId: result.unsupportedPatternInventory.batchId,
            totalPatterns: result.unsupportedPatternInventory.totalPatterns,
            byType: result.unsupportedPatternInventory.byType,
          },
          null,
          2,
        ),
        'utf-8',
      );
      paths.push(patternsPath);

      const insightsPath = join(outputDir, `${result.batchReport.batchId}-insights.json`);
      writeFileSync(
        insightsPath,
        JSON.stringify(
          {
            batchId: result.operationalInsightsReport.batchId,
            totalInsights: result.operationalInsightsReport.totalInsights,
            criticalInsights: result.operationalInsightsReport.criticalInsights,
            highInsights: result.operationalInsightsReport.highInsights,
            insights: result.operationalInsightsReport.insights.map((i) => ({
              insightId: i.insightId,
              type: i.type,
              title: i.title,
              severity: i.severity,
            })),
          },
          null,
          2,
        ),
        'utf-8',
      );
      paths.push(insightsPath);
    } catch {
    }

    return paths;
  }

  private countRecordsByType(collection: ExecutionLabResult['evidenceCollection']): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const record of collection.records) {
      counts[record.type] = (counts[record.type] ?? 0) + 1;
    }
    return counts;
  }
}
