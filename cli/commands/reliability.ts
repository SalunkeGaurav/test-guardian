/**
 * reliability — Execute operational reliability harness.
 *
 * Long-run reliability measurement across repository corpus:
 *   healing stability, replay consistency, sandbox reproducibility,
 *   governance consistency, rollback reliability, compile preservation.
 *
 * Usage:
 *   testguardian reliability --corpus <path>
 *   testguardian reliability --corpus <path> --iterations <n>
 *   testguardian reliability --corpus <path> --strict-baseline
 *   testguardian reliability --corpus <path> --detect-regressions
 *   testguardian reliability --corpus <path> --report-only
 */

import { resolve } from 'node:path';
import { ReliabilityHarness } from '../../src/core/operational-reliability/index.js';

export interface ReliabilityOptions {
  corpus: string;
  iterations?: number;
  strictBaseline?: boolean;
  detectRegressions?: boolean;
  reportOnly?: boolean;
  verbose?: boolean;
}

export async function reliability(options: ReliabilityOptions): Promise<void> {
  const corpusPath = resolve(options.corpus);
  const projectRoot = process.cwd();

  if (options.verbose) {
    console.log(`[reliability] Corpus: ${corpusPath}`);
    console.log(`[reliability] Iterations: ${options.iterations ?? 3}`);
    console.log(`[reliability] Strict baseline: ${options.strictBaseline ?? false}`);
    console.log(`[reliability] Detect regressions: ${options.detectRegressions !== false}`);
  }

  const harness = new ReliabilityHarness(projectRoot);
  const result = await harness.execute({
    corpusPath,
    iterations: options.iterations ?? 3,
    strictBaseline: options.strictBaseline,
    detectRegressions: options.detectRegressions !== false,
    reportOnly: options.reportOnly,
  });

  if (!result.ok) {
    console.error(`Reliability harness failed: ${result.error}`);
    process.exit(1);
  }

  const { session, runtimeRegression, healingRegression, governanceRegression, replayReliability, patchSafety, reliabilityScore, baseline } = result.value;

  console.log('\n=== Operational Reliability Report ===\n');
  console.log(`Session ID:       ${session.sessionId}`);
  console.log(`Corpus:           ${session.corpusPath}`);
  console.log(`Iterations:       ${session.iterations}`);
  console.log(`Total Runs:       ${session.runs.length}`);
  console.log('');
  console.log('Reliability Score:');
  console.log(`  Composite:        ${reliabilityScore.compositeScore.toFixed(3)}`);
  console.log(`  Grade:            ${reliabilityScore.grade}`);
  console.log(`  Trend:            ${reliabilityScore.trend}`);
  console.log(`  Runtime:          ${reliabilityScore.runtimeReliability.toFixed(3)}`);
  console.log(`  Healing:          ${reliabilityScore.healingReliability.toFixed(3)}`);
  console.log(`  Governance:       ${reliabilityScore.governanceTrustworthiness.toFixed(3)}`);
  console.log(`  Replay:           ${reliabilityScore.replayStability.toFixed(3)}`);
  console.log(`  Patch Safety:     ${reliabilityScore.patchSafety.toFixed(3)}`);
  console.log('');
  console.log('Runtime Regression:');
  console.log(`  Severity:         ${runtimeRegression.overallSeverity}`);
  console.log(`  Indicators:       ${runtimeRegression.indicators.length}`);
  console.log('');
  console.log('Healing Regression:');
  console.log(`  Severity:         ${healingRegression.overallSeverity}`);
  console.log(`  Indicators:       ${healingRegression.indicators.length}`);
  console.log('');
  console.log('Governance Regression:');
  console.log(`  Severity:         ${governanceRegression.overallSeverity}`);
  console.log(`  Indicators:       ${governanceRegression.indicators.length}`);
  console.log('');
  console.log('Replay Reliability:');
  console.log(`  Overall:          ${replayReliability.overallReliability}`);
  console.log(`  Reproducibility:  ${(replayReliability.reproducibilityRate * 100).toFixed(1)}%`);
  console.log(`  Nondeterministic: ${(replayReliability.nondeterministicFrequency * 100).toFixed(1)}%`);
  console.log(`  Drift Frequency:  ${(replayReliability.navigationDriftFrequency * 100).toFixed(1)}%`);
  console.log('');
  console.log('Patch Safety:');
  console.log(`  Overall:          ${patchSafety.overallSafety}`);
  console.log(`  Compile:          ${(patchSafety.compilePreservationRate * 100).toFixed(1)}%`);
  console.log(`  Rollback:         ${(patchSafety.rollbackSuccessRate * 100).toFixed(1)}%`);
  console.log(`  Survivability:    ${(patchSafety.patchSurvivabilityRate * 100).toFixed(1)}%`);
  console.log('');
  console.log('Historical Baseline:');
  console.log(`  Baseline ID:      ${baseline.baselineId}`);
  console.log(`  Total Runs:       ${baseline.totalRuns}`);
  console.log('');
  console.log('Persisted to:');
  for (const p of result.value.persistedPaths) {
    console.log(`  ${p}`);
  }
}
