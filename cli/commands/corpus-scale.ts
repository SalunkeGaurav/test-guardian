/**
 * corpus-scale — Execute large-scale corpus validation.
 *
 * Runs full-scale real-world repository validation against the benchmark corpus
 * and generates operational evidence reports.
 *
 * Usage:
 *   testguardian corpus-scale --corpus <path>
 *   testguardian corpus-scale --corpus <path> --batch-size <n>
 *   testguardian corpus-scale --corpus <path> --resume
 *   testguardian corpus-scale --corpus <path> --failed-only
 *   testguardian corpus-scale --corpus <path> --report-only
 */

import { resolve } from 'node:path';
import { LargeScaleCorpusExecution } from '../../src/core/large-scale-corpus/index.js';

export interface CorpusScaleOptions {
  corpus: string;
  batchSize?: number;
  resume?: boolean;
  failedOnly?: boolean;
  reportOnly?: boolean;
  verbose?: boolean;
}

export async function corpusScale(options: CorpusScaleOptions): Promise<void> {
  const corpusPath = resolve(options.corpus);
  const projectRoot = process.cwd();

  if (options.verbose) {
    console.log(`[corpus-scale] Corpus: ${corpusPath}`);
    console.log(`[corpus-scale] Batch size: ${options.batchSize ?? 10}`);
    console.log(`[corpus-scale] Resume: ${options.resume ?? false}`);
    console.log(`[corpus-scale] Failed only: ${options.failedOnly ?? false}`);
    console.log(`[corpus-scale] Report only: ${options.reportOnly ?? false}`);
  }

  const execution = new LargeScaleCorpusExecution(projectRoot);
  const report = await execution.execute({
    corpusPath,
    batchSize: options.batchSize ?? 10,
    resume: options.resume,
    failedOnly: options.failedOnly,
    reportOnly: options.reportOnly,
  });

  console.log('\n=== Large Scale Corpus Execution Report ===\n');
  console.log(`Report ID:        ${report.reportId}`);
  console.log(`Corpus:           ${report.corpusPath}`);
  console.log('');
  console.log('Repository Inventory:');
  console.log(`  Total Repos:      ${report.inventory.totalRepositories}`);
  console.log(`  Categories:       ${report.inventory.categories.join(', ')}`);
  console.log('');
  console.log('Execution Summary:');
  console.log(`  Completed:        ${report.results.filter((r) => r.status === 'completed').length}`);
  console.log(`  Failed:           ${report.results.filter((r) => r.status === 'failed').length}`);
  console.log('');
  console.log('Compatibility Distribution:');
  console.log(`  Supported:        ${report.aggregation.compatibilityDistribution.supported}`);
  console.log(`  Partial:          ${report.aggregation.compatibilityDistribution.partiallySupported}`);
  console.log(`  Unsupported:      ${report.aggregation.compatibilityDistribution.unsupported}`);
  console.log(`  Unknown:          ${report.aggregation.compatibilityDistribution.unknown}`);
  console.log('');
  console.log('Unsupported Patterns:');
  for (const pattern of report.aggregation.unsupportedPatternFrequency.slice(0, 10)) {
    console.log(`  ${pattern.pattern}: ${pattern.frequency} repos`);
  }
  console.log('');
  console.log('Runtime Instability Clusters:');
  for (const cluster of report.aggregation.runtimeInstabilityClusters) {
    console.log(`  ${cluster.type}: ${cluster.count} repos`);
  }
  console.log('');
  console.log('Governance Failure Clusters:');
  for (const cluster of report.aggregation.governanceFailureClusters.slice(0, 10)) {
    console.log(`  ${cluster.reason}: ${cluster.count} repos`);
  }
  console.log('');
  console.log('Performance Bottlenecks:');
  for (const bottleneck of report.aggregation.performanceBottlenecks) {
    console.log(`  ${bottleneck.stage}: avg ${bottleneck.avgDurationMs}ms, max ${bottleneck.maxDurationMs}ms`);
  }
  console.log('');
  console.log('Repository Type Correlation:');
  for (const correlation of report.aggregation.repositoryTypeCorrelation.slice(0, 10)) {
    console.log(`  ${correlation.category}: compat=${correlation.avgCompatibilityScore.toFixed(2)}, failure=${(correlation.failureRate * 100).toFixed(1)}%`);
  }
  console.log('');
  console.log('Recovery Metrics:');
  for (const metric of report.aggregation.recoveryMetrics) {
    console.log(`  ${metric.metric}: avg=${metric.avgValue.toFixed(3)}, min=${metric.minValue.toFixed(3)}, max=${metric.maxValue.toFixed(3)}`);
  }
  console.log('');
  console.log('Failure Hotspots:');
  for (const hotspot of report.aggregation.failureHotspots.slice(0, 10)) {
    console.log(`  [${hotspot.severity.toUpperCase()}] ${hotspot.repository} (${hotspot.category}): ${hotspot.failureReasons.join(', ')}`);
  }
  console.log('');
  console.log('Persisted to:');
  for (const p of report.persistedPaths) {
    console.log(`  ${p}`);
  }
}
