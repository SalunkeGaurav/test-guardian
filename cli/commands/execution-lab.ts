/**
 * execution-lab — Execute operational execution laboratory.
 *
 * Continuously runs TestGuardian against real repositories and collects
 * operational evidence to measure real-world reliability.
 *
 * Usage:
 *   testguardian execution-lab --corpus <path>
 *   testguardian execution-lab --corpus <path> --iterations <n>
 *   testguardian execution-lab --corpus <path> --batch-size <n>
 *   testguardian execution-lab --corpus <path> --subset <pattern>
 *   testguardian execution-lab --corpus <path> --report-only
 */

import { resolve } from 'node:path';
import { ExecutionLab } from '../../src/core/execution-lab/index.js';

export interface ExecutionLabOptions {
  corpus: string;
  iterations?: number;
  batchSize?: number;
  subset?: string;
  reportOnly?: boolean;
  verbose?: boolean;
}

export async function executionLab(options: ExecutionLabOptions): Promise<void> {
  const corpusPath = resolve(options.corpus);
  const projectRoot = process.cwd();

  if (options.verbose) {
    console.log(`[execution-lab] Corpus: ${corpusPath}`);
    console.log(`[execution-lab] Iterations: ${options.iterations ?? 3}`);
    console.log(`[execution-lab] Batch size: ${options.batchSize ?? 10}`);
    console.log(`[execution-lab] Subset pattern: ${options.subset ?? 'none'}`);
    console.log(`[execution-lab] Report only: ${options.reportOnly ?? false}`);
  }

  const lab = new ExecutionLab(projectRoot);
  const result = await lab.execute({
    corpusPath,
    iterations: options.iterations ?? 3,
    batchSize: options.batchSize ?? 10,
    subsetPattern: options.subset,
    reportOnly: options.reportOnly,
  });

  const { batchReport, evidenceCollection, failureClusterReport, reliabilityTrendReport, unsupportedPatternInventory, operationalInsightsReport } = result;

  console.log('\n=== Execution Lab Report ===\n');
  console.log(`Batch ID:         ${batchReport.batchId}`);
  console.log(`Corpus:           ${batchReport.config.corpusPath}`);
  console.log(`Iterations:       ${batchReport.config.iterations}`);
  console.log(`Batch Size:       ${batchReport.config.batchSize}`);
  console.log(`Total Repos:      ${batchReport.totalRepositories}`);
  console.log(`Completed:        ${batchReport.completedRepositories}`);
  console.log(`Failed:           ${batchReport.failedRepositories}`);
  console.log('');
  console.log('Evidence Collection:');
  console.log(`  Total Records:    ${evidenceCollection.totalCount}`);
  console.log('');
  console.log('Failure Clusters:');
  console.log(`  Total Clusters:   ${failureClusterReport.totalClusters}`);
  console.log(`  Total Failures:   ${failureClusterReport.totalFailures}`);
  if (failureClusterReport.mostSevereCluster) {
    console.log(`  Most Severe:      ${failureClusterReport.mostSevereCluster.type} (${failureClusterReport.mostSevereCluster.severity})`);
  }
  console.log('');
  console.log('Reliability Trends:');
  console.log(`  Overall Trend:    ${reliabilityTrendReport.overallTrend}`);
  for (const trend of reliabilityTrendReport.trends) {
    console.log(`  ${trend.metric}: ${trend.direction} (${trend.changePercent > 0 ? '+' : ''}${trend.changePercent.toFixed(1)}%)`);
  }
  console.log('');
  console.log('Unsupported Patterns:');
  console.log(`  Total Patterns:   ${unsupportedPatternInventory.totalPatterns}`);
  for (const [type, count] of Object.entries(unsupportedPatternInventory.byType)) {
    if (count > 0) {
      console.log(`  ${type}: ${count}`);
    }
  }
  console.log('');
  console.log('Operational Insights:');
  console.log(`  Total Insights:   ${operationalInsightsReport.totalInsights}`);
  console.log(`  Critical:         ${operationalInsightsReport.criticalInsights}`);
  console.log(`  High:             ${operationalInsightsReport.highInsights}`);
  for (const insight of operationalInsightsReport.insights) {
    console.log(`  [${insight.severity.toUpperCase()}] ${insight.title}`);
    console.log(`    ${insight.recommendation}`);
  }
  console.log('');
  console.log('Persisted to:');
  for (const p of result.persistedPaths) {
    console.log(`  ${p}`);
  }
}
