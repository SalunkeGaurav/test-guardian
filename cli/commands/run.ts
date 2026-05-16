/**
 * run — Execute unified TestGuardian workflow.
 *
 * Single entrypoint for the full operational platform:
 *   repository analysis → runtime hardening → healing → validation
 *   → sandbox verification → governance → review package → report
 *
 * Usage:
 *   testguardian run --repo <path>
 *   testguardian run --repo <path> --sandbox
 *   testguardian run --repo <path> --validate-only
 *   testguardian run --repo <path> --runtime-healing
 *   testguardian run --repo <path> --strict-governance
 *   testguardian run --repo <path> --report-only
 */

import { resolve } from 'node:path';
import { UnifiedRuntime } from '../../src/core/unified-runtime/index.js';

export interface RunOptions {
  repo: string;
  sandbox?: boolean;
  validateOnly?: boolean;
  runtimeHealing?: boolean;
  strictGovernance?: boolean;
  reportOnly?: boolean;
  verbose?: boolean;
}

export async function run(options: RunOptions): Promise<void> {
  const repoPath = resolve(options.repo);

  if (options.verbose) {
    console.log(`[unified-runtime] Repository: ${repoPath}`);
    console.log(`[unified-runtime] Options: sandbox=${options.sandbox}, validateOnly=${options.validateOnly}, runtimeHealing=${options.runtimeHealing}, strictGovernance=${options.strictGovernance}, reportOnly=${options.reportOnly}`);
  }

  const runtime = new UnifiedRuntime();
  const result = await runtime.execute({
    repoPath,
    sandbox: options.sandbox,
    validateOnly: options.validateOnly,
    runtimeHealing: options.runtimeHealing,
    strictGovernance: options.strictGovernance,
    reportOnly: options.reportOnly,
  });

  if (!result.ok) {
    console.error(`Unified runtime failed: ${result.error}`);
    process.exit(1);
  }

  const { report } = result.value;

  console.log('\n=== Unified Execution Report ===\n');
  console.log(`Execution ID:     ${report.executionId}`);
  console.log(`Repository:       ${report.repoPath}`);
  console.log(`Framework:        ${report.frameworkType}`);
  console.log(`Compatibility:    ${report.compatibilityStatus}`);
  console.log(`Overall Risk:     ${report.riskAnalysis.overallRisk}`);
  console.log('');
  console.log('Repository Analysis:');
  console.log(`  Files:            ${report.repositorySummary.totalFiles}`);
  console.log(`  Locators:         ${report.repositorySummary.totalLocators}`);
  console.log(`  Compat. Score:    ${report.repositorySummary.compatibilityScore.toFixed(2)}`);
  console.log(`  Risks:            ${report.repositorySummary.risks}`);
  console.log('');
  console.log('Healing Summary:');
  console.log(`  Attempts:         ${report.healingSummary.totalAttempts}`);
  console.log(`  Successful:       ${report.healingSummary.successfulHealings}`);
  console.log(`  Review Packages:  ${report.healingSummary.reviewPackages}`);
  console.log('');
  console.log('Validation Outcomes:');
  console.log(`  Total:            ${report.validationOutcomes.totalValidations}`);
  console.log(`  Passed:           ${report.validationOutcomes.passed}`);
  console.log(`  Failed:           ${report.validationOutcomes.failed}`);
  console.log('');
  console.log('Replay Stability:');
  console.log(`  DOM Stabilized:   ${report.replayStability.domStabilized ? 'YES' : 'NO'}`);
  console.log(`  Deterministic:    ${report.replayStability.replayDeterministic ? 'YES' : 'NO'}`);
  console.log(`  Drift Severity:   ${report.replayStability.driftSeverity}`);
  console.log('');
  console.log('Governance:');
  console.log(`  Passed:           ${report.governanceDecisions.governancePassed ? 'YES' : 'NO'}`);
  console.log(`  Gates Passed:     ${report.governanceDecisions.gatesPassed}`);
  console.log(`  Gates Failed:     ${report.governanceDecisions.gatesFailed}`);
  console.log('');
  console.log('Sandbox Verification:');
  console.log(`  Executed:         ${report.sandboxVerification.sandboxExecuted ? 'YES' : 'NO'}`);
  console.log(`  Compile:          ${report.sandboxVerification.compileSuccess ? 'PASS' : 'N/A'}`);
  console.log(`  Isolation:        ${report.sandboxVerification.isolationVerified ? 'VERIFIED' : 'N/A'}`);
  console.log('');
  console.log('Patch Proposals:');
  console.log(`  Total:            ${report.patchProposals.totalProposals}`);
  console.log(`  Status:           ${report.patchProposals.status}`);
  console.log('');
  console.log('Runtime Metrics:');
  console.log(`  DOM Stabilization:${(report.runtimeMetrics.domStabilizationSuccessRate * 100).toFixed(1)}%`);
  console.log(`  Replay Recovery:  ${(report.runtimeMetrics.replayRecoverySuccess * 100).toFixed(1)}%`);
  console.log(`  Stale Recovery:   ${(report.runtimeMetrics.staleRecoverySuccess * 100).toFixed(1)}%`);
  console.log(`  iframe Recovery:  ${(report.runtimeMetrics.iframeRecoveryRate * 100).toFixed(1)}%`);
  console.log(`  Async Instability:${report.runtimeMetrics.asyncRenderInstabilityFrequency}`);
  console.log(`  Replay Drift:     ${report.runtimeMetrics.replayDriftFrequency}`);
  console.log('');

  if (report.riskAnalysis.riskFactors.length > 0) {
    console.log('Risk Factors:');
    for (const factor of report.riskAnalysis.riskFactors) {
      console.log(`  - ${factor}`);
    }
    console.log('');
  }

  console.log('State Transitions:');
  console.log(`  Total:            ${report.stateTransitions.totalTransitions}`);
  console.log(`  Failed:           ${report.stateTransitions.failedTransitions}`);
  console.log(`  Final State:      ${report.stateTransitions.finalState}`);
  console.log('');

  console.log('Persisted to:');
  for (const p of report.persistedPaths) {
    console.log(`  ${p}`);
  }
}
