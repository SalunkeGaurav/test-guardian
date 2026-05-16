/**
 * stabilization — Execute stabilization analysis.
 *
 * Runs full operational validation across the real repository corpus
 * and generates evidence-driven stabilization priorities.
 *
 * Usage:
 *   testguardian stabilization --corpus <path>
 *   testguardian stabilization --corpus <path> --batch-size <n>
 *   testguardian stabilization --corpus <path> --resume
 *   testguardian stabilization --corpus <path> --report-only
 */

import { resolve } from 'node:path';
import { StabilizationAnalyzer } from '../../src/core/stabilization/index.js';

export interface StabilizationOptions {
  corpus: string;
  batchSize?: number;
  resume?: boolean;
  reportOnly?: boolean;
  verbose?: boolean;
}

export async function stabilization(options: StabilizationOptions): Promise<void> {
  const corpusPath = resolve(options.corpus);
  const projectRoot = process.cwd();

  if (options.verbose) {
    console.log(`[stabilization] Corpus: ${corpusPath}`);
    console.log(`[stabilization] Batch size: ${options.batchSize ?? 10}`);
    console.log(`[stabilization] Resume: ${options.resume ?? false}`);
    console.log(`[stabilization] Report only: ${options.reportOnly ?? false}`);
  }

  const analyzer = new StabilizationAnalyzer(projectRoot);
  const report = await analyzer.execute({
    corpusPath,
    batchSize: options.batchSize ?? 10,
    resume: options.resume,
    reportOnly: options.reportOnly,
  });

  console.log('\n=== Stabilization Report ===\n');
  console.log(`Report ID:        ${report.reportId}`);
  console.log(`Corpus:           ${report.corpusPath}`);
  console.log('');
  console.log('Summary:');
  console.log(`  Total Repos:      ${report.summary.totalRepositories}`);
  console.log(`  Completed:        ${report.summary.completedRepositories}`);
  console.log(`  Failed:           ${report.summary.failedRepositories}`);
  console.log(`  Stability Score:  ${report.summary.overallStabilityScore}`);
  console.log(`  Critical Issues:  ${report.summary.criticalIssues}`);
  console.log(`  High Issues:      ${report.summary.highIssues}`);
  console.log('');
  console.log('Highest Risk Patterns:');
  for (const pattern of report.highestRiskPatterns.patterns.slice(0, 10)) {
    console.log(`  [${pattern.severity.toUpperCase()}] ${pattern.pattern}: ${pattern.frequency} repos`);
  }
  console.log('');
  console.log('Replay Instability Hotspots:');
  console.log(`  Total Hotspots:   ${report.replayInstability.totalHotspots}`);
  console.log(`  Most Unstable:    ${report.replayInstability.mostUnstableCategory}`);
  console.log('');
  console.log('Governance Weaknesses:');
  console.log(`  Total Weaknesses: ${report.governanceWeaknesses.totalWeaknesses}`);
  console.log(`  Overall Health:   ${report.governanceWeaknesses.overallGovernanceHealth}`);
  console.log('');
  console.log('Unsupported Structures:');
  console.log(`  Total Structures: ${report.unsupportedStructures.totalStructures}`);
  console.log(`  Most Common:      ${report.unsupportedStructures.mostCommonStructure}`);
  console.log('');
  console.log('Architectural Hotspots:');
  console.log(`  Total Hotspots:   ${report.architecturalHotspots.totalHotspots}`);
  console.log(`  Critical:         ${report.architecturalHotspots.criticalHotspots}`);
  for (const hotspot of report.architecturalHotspots.hotspots.slice(0, 5)) {
    console.log(`  [${hotspot.severity.toUpperCase()}] ${hotspot.hotspot}: ${hotspot.description}`);
  }
  console.log('');
  console.log('Performance Bottlenecks:');
  console.log(`  Slowest Stage:    ${report.performanceBottlenecks.slowestStage}`);
  for (const bottleneck of report.performanceBottlenecks.bottlenecks.slice(0, 5)) {
    console.log(`  ${bottleneck.stage}: avg ${bottleneck.avgDurationMs}ms, max ${bottleneck.maxDurationMs}ms`);
  }
  console.log('');
  console.log('Recovery Quality:');
  console.log(`  Overall Health:   ${report.recoveryQuality.overallRecoveryHealth}`);
  for (const metric of report.recoveryQuality.metrics) {
    console.log(`  ${metric.metric}: avg=${metric.avgValue.toFixed(3)}, quality=${metric.quality}`);
  }
  console.log('');
  console.log('False Confidence:');
  console.log(`  Total Indicators: ${report.falseConfidence.totalIndicators}`);
  console.log(`  False Rate:       ${(report.falseConfidence.falseConfidenceRate * 100).toFixed(1)}%`);
  console.log('');
  console.log('Simplification Opportunities:');
  console.log(`  Total:            ${report.simplificationOpportunities.totalOpportunities}`);
  console.log(`  High Impact:      ${report.simplificationOpportunities.highImpactOpportunities}`);
  for (const opp of report.simplificationOpportunities.opportunities.slice(0, 5)) {
    console.log(`  [${opp.impact.toUpperCase()}] ${opp.opportunity}: ${opp.description}`);
  }
  console.log('');
  console.log('Alpha Readiness:');
  console.log(`  Overall Score:    ${report.alphaReadiness.overallScore}`);
  console.log(`  Overall Status:   ${report.alphaReadiness.overallStatus.toUpperCase()}`);
  console.log('');
  console.log('  Assessments:');
  for (const assessment of report.alphaReadiness.assessments) {
    console.log(`    ${assessment.category}: ${assessment.score} (${assessment.status})`);
  }
  console.log('');
  console.log('  Critical Blockers:');
  for (const blocker of report.alphaReadiness.criticalBlockers.slice(0, 5)) {
    console.log(`    - ${blocker}`);
  }
  console.log('');
  console.log('  Recommended Before Alpha:');
  for (const rec of report.alphaReadiness.recommendedBeforeAlpha.slice(0, 5)) {
    console.log(`    - ${rec}`);
  }
  console.log('');
  console.log('  Safe to Ship:');
  for (const feature of report.alphaReadiness.safeToShipFeatures) {
    console.log(`    - ${feature}`);
  }
  console.log('');
  console.log('  Experimental:');
  for (const feature of report.alphaReadiness.experimentalFeatures) {
    console.log(`    - ${feature}`);
  }
  console.log('');
  console.log('Persisted to:');
  for (const p of report.persistedPaths) {
    console.log(`  ${p}`);
  }
}
