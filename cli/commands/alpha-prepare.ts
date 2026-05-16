/**
 * alpha-prepare — Prepare alpha release with consolidated reports.
 *
 * Generates:
 * - API manifest
 * - Deprecated API report
 * - Unstable export report
 * - Packaging readiness report
 * - Documentation
 * - Alpha release reports
 * - Installation verification
 * - Developer experience review
 * - Alpha stability gate
 *
 * Usage:
 *   testguardian alpha-prepare
 *   testguardian alpha-prepare --corpus <path>
 *   testguardian alpha-prepare --verbose
 */

import { resolve } from 'node:path';
import { executeAlphaConsolidation, persistInstallationReport, persistDeveloperExperienceReport, persistAlphaGateReport } from '../../src/core/alpha-consolidation/index.js';

export interface AlphaPrepareOptions {
  corpus?: string;
  output?: string;
  verbose?: boolean;
}

export async function alphaPrepare(options: AlphaPrepareOptions): Promise<void> {
  const projectRoot = process.cwd();
  const corpusPath = options.corpus ? resolve(options.corpus) : undefined;
  const outputDir = options.output ? resolve(options.output) : projectRoot;

  if (options.verbose) {
    console.log(`[alpha-prepare] Project root: ${projectRoot}`);
    if (corpusPath) console.log(`[alpha-prepare] Corpus: ${corpusPath}`);
    console.log(`[alpha-prepare] Output directory: ${outputDir}`);
  }

  const result = await executeAlphaConsolidation({
    projectRoot,
    corpusPath,
    outputDir,
    verbose: options.verbose,
  });

  // Installation verification
  if (options.verbose) console.log('[alpha-prepare] Running installation verification...');
  const installReportPath = persistInstallationReport(projectRoot, outputDir);

  // Developer experience review
  if (options.verbose) console.log('[alpha-prepare] Evaluating developer experience...');
  const dxReportPath = persistDeveloperExperienceReport(outputDir);

  // Alpha stability gate
  if (options.verbose) console.log('[alpha-prepare] Evaluating alpha stability gate...');
  const gateReportPath = persistAlphaGateReport(projectRoot, outputDir);

  console.log('\n=== Alpha Consolidation Report ===\n');
  console.log(`Report ID:        ${result.reportId}`);
  console.log(`Overall Status:   ${result.overallStatus.toUpperCase()}`);
  console.log('');
  console.log('Generated Reports:');
  console.log(`  API Manifest:           ${result.apiManifest}`);
  console.log(`  Deprecated API:         ${result.deprecatedApiReport}`);
  console.log(`  Unstable Exports:       ${result.unstableExportReport}`);
  console.log(`  Packaging Readiness:    ${result.packagingReport}`);
  console.log(`  Installation Verify:    ${installReportPath}`);
  console.log(`  Developer Experience:   ${dxReportPath}`);
  console.log(`  Alpha Stability Gate:   ${gateReportPath}`);
  console.log('');
  console.log('Documentation:');
  for (const file of result.docs) {
    console.log(`  ${file}`);
  }
  console.log('');
  console.log('Alpha Release Reports:');
  for (const file of result.alphaReleaseReports) {
    console.log(`  ${file}`);
  }
  console.log('');

  if (result.overallStatus === 'ready') {
    console.log('Alpha release is READY for packaging.');
  } else if (result.overallStatus === 'needs-work') {
    console.log('Alpha release NEEDS WORK before packaging.');
    console.log('Review the packaging readiness report for details.');
  } else {
    console.log('Alpha release is NOT READY for packaging.');
    console.log('Address the issues in the packaging readiness report.');
  }
}
