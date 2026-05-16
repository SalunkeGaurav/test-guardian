/**
 * review — Generate developer-facing review reports.
 *
 * Makes healing behavior understandable, reviewable, explainable, and trustworthy.
 *
 * Usage:
 *   testguardian review --report <path>
 *   testguardian review --report <path> --json
 *   testguardian review --report <path> --html
 *   testguardian review --report <path> --compact
 *   testguardian review --report <path> --full
 */

import { resolve, existsSync, readFileSync } from 'node:path';
import { readFileSync as readFile } from 'node:fs';
import type { ReviewBundle } from '../../src/core/developer-review/types.js';

export interface ReviewOptions {
  report: string;
  format?: 'html' | 'json' | 'compact' | 'full';
  verbose?: boolean;
}

export async function review(options: ReviewOptions): Promise<void> {
  const reportPath = resolve(options.report);
  const format = options.format ?? 'full';

  if (!existsSync(reportPath)) {
    console.error(`Report file not found: ${reportPath}`);
    process.exit(1);
  }

  try {
    const content = readFile(reportPath, 'utf-8');
    const bundle: ReviewBundle = JSON.parse(content);

    switch (format) {
      case 'json':
        console.log(JSON.stringify(bundle, null, 2));
        break;
      case 'compact':
        console.log(`Review: ${bundle.reviewReport.reviewId}`);
        console.log(`Original: ${bundle.reviewReport.locatorSummary.originalLocator}`);
        console.log(`Healed:   ${bundle.reviewReport.locatorSummary.healedLocator}`);
        console.log(`Decision: ${bundle.governanceExplanation.overallDecision}`);
        console.log(`Risk:     ${bundle.mutationRiskVisualization.overallRiskLevel}`);
        break;
      case 'full':
        console.log('=== Developer Review Bundle ===\n');
        console.log(`Bundle ID: ${bundle.bundleId}`);
        console.log('');
        console.log('Locator Summary:');
        console.log(`  Original: ${bundle.reviewReport.locatorSummary.originalLocator}`);
        console.log(`  Healed:   ${bundle.reviewReport.locatorSummary.healedLocator}`);
        console.log(`  Strategy: ${bundle.reviewReport.locatorSummary.strategy}`);
        console.log('');
        console.log('Validation:');
        console.log(`  Status:      ${bundle.reviewReport.validationOutcome.status}`);
        console.log(`  Confidence:  ${(bundle.reviewReport.validationOutcome.replayConfidence * 100).toFixed(1)}%`);
        console.log(`  Matches:     ${bundle.reviewReport.validationOutcome.matchedElementCount}`);
        console.log('');
        console.log('Replay:');
        console.log(`  Status:      ${bundle.reviewReport.replayOutcome.status}`);
        console.log(`  Steps:       ${bundle.reviewReport.replayOutcome.executedStepCount}`);
        console.log(`  Divergences: ${bundle.reviewReport.replayOutcome.divergenceCount}`);
        console.log('');
        console.log('Runtime Stability:');
        console.log(`  Overall:     ${bundle.reviewReport.runtimeStabilityOutcome.overallStable ? 'stable' : 'unstable'}`);
        console.log(`  DOM:         ${bundle.reviewReport.runtimeStabilityOutcome.domStabilized ? 'stabilized' : 'unstable'}`);
        console.log(`  Deterministic: ${bundle.reviewReport.runtimeStabilityOutcome.replayDeterministic ? 'yes' : 'no'}`);
        console.log('');
        console.log('Governance:');
        console.log(`  Decision: ${bundle.governanceExplanation.overallDecision}`);
        for (const reason of bundle.governanceExplanation.approvalReasons) {
          console.log(`  [PASS] ${reason}`);
        }
        for (const reason of bundle.governanceExplanation.rejectionReasons) {
          console.log(`  [FAIL] ${reason}`);
        }
        console.log('');
        console.log('Patch:');
        console.log(`  File: ${bundle.patchVisualization.targetFile}`);
        console.log(`  Lines changed: ${bundle.patchVisualization.patchScope.linesChanged}`);
        console.log(`  Impact: ${bundle.patchVisualization.structuralImpact.impactLevel}`);
        console.log('');
        console.log('Confidence:');
        console.log(`  Overall: ${(bundle.confidenceBreakdown.confidenceComposition.overall * 100).toFixed(1)}%`);
        console.log(`  Structural: ${(bundle.confidenceBreakdown.structuralWeighting.survivabilityScore * 100).toFixed(1)}%`);
        console.log(`  Runtime: ${(bundle.confidenceBreakdown.runtimeWeighting.runtimeConfidence * 100).toFixed(1)}%`);
        console.log(`  Replay: ${(bundle.confidenceBreakdown.replayWeighting.replayConfidence * 100).toFixed(1)}%`);
        console.log('');
        console.log('Rollback:');
        console.log(`  Available: ${bundle.rollbackReview.rollbackAvailability ? 'yes' : 'no'}`);
        console.log(`  Risk:      ${bundle.rollbackReview.patchReversibility.riskLevel}`);
        console.log(`  Complexity: ${bundle.rollbackReview.patchReversibility.reversalComplexity}`);
        console.log('');
        console.log('Mutation Risk:');
        console.log(`  Overall: ${bundle.mutationRiskVisualization.overallRiskLevel.toUpperCase()}`);
        console.log(`  Selector: ${bundle.mutationRiskVisualization.selectorInstability.riskLevel}`);
        console.log(`  Replay:   ${bundle.mutationRiskVisualization.replayFragility.riskLevel}`);
        console.log(`  Structural: ${bundle.mutationRiskVisualization.structuralMutationRisk.riskLevel}`);
        console.log(`  Async:    ${bundle.mutationRiskVisualization.asyncInstability.riskLevel}`);
        console.log(`  iframe/Modal: ${bundle.mutationRiskVisualization.iframeModalInstability.riskLevel}`);
        console.log('');
        console.log('Runtime Metrics:');
        console.log(`  DOM stabilization: ${(bundle.runtimeMetrics.domStabilizationSuccessRate * 100).toFixed(1)}%`);
        console.log(`  Replay recovery:   ${(bundle.runtimeMetrics.replayRecoverySuccess * 100).toFixed(1)}%`);
        console.log(`  Stale recovery:    ${(bundle.runtimeMetrics.staleRecoverySuccess * 100).toFixed(1)}%`);
        console.log(`  iframe recovery:   ${(bundle.runtimeMetrics.iframeRecoveryRate * 100).toFixed(1)}%`);
        break;
      case 'html':
        console.log(generateHtml(bundle));
        break;
    }
  } catch (error) {
    console.error(`Failed to parse report: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

function generateHtml(bundle: ReviewBundle): string {
  const riskColor: Record<string, string> = {
    low: '#22c55e',
    medium: '#eab308',
    high: '#ef4444',
    critical: '#dc2626',
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TestGuardian Review - ${bundle.bundleId}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    .card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h1 { color: #1f2937; }
    h2 { color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
    .risk { display: inline-block; padding: 4px 12px; border-radius: 4px; color: white; font-weight: bold; }
    .pass { color: #22c55e; }
    .fail { color: #ef4444; }
    .meta { color: #6b7280; font-size: 0.9em; }
    table { width: 100%; border-collapse: collapse; }
    td, th { padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <h1>TestGuardian Developer Review</h1>
  <p class="meta">Bundle: ${bundle.bundleId}</p>

  <div class="card">
    <h2>Locator Summary</h2>
    <table>
      <tr><td>Original</td><td><code>${bundle.reviewReport.locatorSummary.originalLocator}</code></td></tr>
      <tr><td>Healed</td><td><code>${bundle.reviewReport.locatorSummary.healedLocator}</code></td></tr>
      <tr><td>Strategy</td><td>${bundle.reviewReport.locatorSummary.strategy}</td></tr>
    </table>
  </div>

  <div class="card">
    <h2>Governance Decision</h2>
    <p class="${bundle.governanceExplanation.overallDecision === 'approved' ? 'pass' : 'fail'}">
      <strong>${bundle.governanceExplanation.overallDecision.toUpperCase()}</strong>
    </p>
    ${bundle.governanceExplanation.approvalReasons.map((r) => `<p class="pass">[PASS] ${r}</p>`).join('')}
    ${bundle.governanceExplanation.rejectionReasons.map((r) => `<p class="fail">[FAIL] ${r}</p>`).join('')}
  </div>

  <div class="card">
    <h2>Mutation Risk</h2>
    <p>Overall: <span class="risk" style="background: ${riskColor[bundle.mutationRiskVisualization.overallRiskLevel] ?? '#6b7280'}">${bundle.mutationRiskVisualization.overallRiskLevel.toUpperCase()}</span></p>
    <table>
      <tr><td>Selector</td><td>${bundle.mutationRiskVisualization.selectorInstability.riskLevel}</td></tr>
      <tr><td>Replay</td><td>${bundle.mutationRiskVisualization.replayFragility.riskLevel}</td></tr>
      <tr><td>Structural</td><td>${bundle.mutationRiskVisualization.structuralMutationRisk.riskLevel}</td></tr>
      <tr><td>Async</td><td>${bundle.mutationRiskVisualization.asyncInstability.riskLevel}</td></tr>
      <tr><td>iframe/Modal</td><td>${bundle.mutationRiskVisualization.iframeModalInstability.riskLevel}</td></tr>
    </table>
  </div>

  <div class="card">
    <h2>Confidence</h2>
    <table>
      <tr><td>Overall</td><td>${(bundle.confidenceBreakdown.confidenceComposition.overall * 100).toFixed(1)}%</td></tr>
      <tr><td>Survivability</td><td>${(bundle.confidenceBreakdown.structuralWeighting.survivabilityScore * 100).toFixed(1)}%</td></tr>
      <tr><td>Runtime</td><td>${(bundle.confidenceBreakdown.runtimeWeighting.runtimeConfidence * 100).toFixed(1)}%</td></tr>
      <tr><td>Replay</td><td>${(bundle.confidenceBreakdown.replayWeighting.replayConfidence * 100).toFixed(1)}%</td></tr>
    </table>
  </div>

  <div class="card">
    <h2>Rollback</h2>
    <p>Available: ${bundle.rollbackReview.rollbackAvailability ? 'Yes' : 'No'}</p>
    <p>Risk: ${bundle.rollbackReview.patchReversibility.riskLevel}</p>
    <p>Complexity: ${bundle.rollbackReview.patchReversibility.reversalComplexity}</p>
  </div>
</body>
</html>`;
}
