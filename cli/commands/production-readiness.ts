/**
 * production-readiness — Execute production readiness assessment.
 *
 * Transitions TestGuardian from architecture-expansion mode into
 * production-readiness mode.
 *
 * Usage:
 *   testguardian production-readiness --repo <path>
 *   testguardian production-readiness --repo <path> --profile
 *   testguardian production-readiness --repo <path> --ci
 *   testguardian production-readiness --repo <path> --package-audit
 */

import { resolve } from 'node:path';
import { ProductionReadiness } from '../../src/core/production-readiness/index.js';

export interface ProductionReadinessOptions {
  repo: string;
  profile?: boolean;
  ci?: boolean;
  packageAudit?: boolean;
  verbose?: boolean;
}

export async function productionReadiness(options: ProductionReadinessOptions): Promise<void> {
  const repoPath = resolve(options.repo);
  const projectRoot = process.cwd();

  if (options.verbose) {
    console.log(`[production-readiness] Repo: ${repoPath}`);
    console.log(`[production-readiness] Profile: ${options.profile !== false}`);
    console.log(`[production-readiness] CI: ${options.ci !== false}`);
    console.log(`[production-readiness] Package audit: ${options.packageAudit !== false}`);
  }

  const readiness = new ProductionReadiness(projectRoot);
  const report = await readiness.execute({
    repoPath,
    profile: options.profile !== false,
    ci: options.ci !== false,
    packageAudit: options.packageAudit !== false,
  });

  console.log('\n=== Production Readiness Report ===\n');
  console.log(`Report ID:        ${report.reportId}`);
  console.log(`Repository:       ${report.repoPath}`);
  console.log(`Overall Readiness: ${report.overallReadiness.toUpperCase()}`);
  console.log('');
  console.log('Performance:');
  console.log(`  Total Duration:   ${report.performance.totalDurationMs}ms`);
  console.log(`  Bottleneck:       ${report.performance.bottleneckStage}`);
  console.log('');
  console.log('Stability:');
  console.log(`  Snapshots:        ${report.stability.snapshotAccumulation}`);
  console.log(`  Replay Payloads:  ${report.stability.replayPayloads}`);
  console.log(`  Scaling:          ${report.stability.scalingEfficiency}`);
  console.log('');
  console.log('API Readiness:');
  console.log(`  Total Exports:    ${report.apiReadiness.totalExports}`);
  console.log(`  Leaked Internals: ${report.apiReadiness.leakedInternals}`);
  console.log(`  Duplicates:       ${report.apiReadiness.duplicateExposures}`);
  console.log(`  API Stable:       ${report.apiReadiness.apiStable ? 'yes' : 'no'}`);
  console.log('');
  console.log('Packaging Readiness:');
  console.log(`  Ready:            ${report.packagingReadiness.packagingReady ? 'yes' : 'no'}`);
  if (report.packagingReadiness.issues.length > 0) {
    console.log('  Issues:');
    for (const issue of report.packagingReadiness.issues) {
      console.log(`    - ${issue}`);
    }
  }
  console.log('');
  console.log('CI Readiness:');
  console.log(`  Ready:            ${report.ciReadiness.ciReady ? 'yes' : 'no'}`);
  console.log(`  Supported Modes:  ${report.ciReadiness.supportedModes.join(', ')}`);
  console.log('');
  console.log('Developer Onboarding:');
  console.log(`  Setup Steps:      ${report.onboarding.minimalSetupSteps}`);
  console.log(`  CLI Commands:     ${report.onboarding.cliDiscoverability.totalCommands}`);
  console.log(`  CLI Documented:   ${report.onboarding.cliDiscoverability.documentedCommands}`);
  console.log(`  Complexity Score: ${report.onboarding.operationalComplexityScore}`);
  console.log('');
  console.log('Persisted to:');
  for (const p of report.persistedPaths) {
    console.log(`  ${p}`);
  }
}
