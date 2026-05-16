/**
 * Developer Workflow CLI Command
 *
 * Implements Developer Workflow Simulation v1.
 * Simulates end-to-end developer healing workflows, generates review sessions,
 * surfaces governance decisions, and tracks approval/rejection flows.
 */

import { info, error } from '../../src/logger/index.js';
import { DeveloperWorkflowOrchestrator } from '../../src/core/developer-workflow/orchestrator.js';
import { DeveloperWorkflowStorage } from '../../src/core/developer-workflow/storage.js';
import type { DeveloperWorkflowConfig } from '../../src/core/developer-workflow/types.js';
import { MutationReviewPackager } from '../../src/core/developer-workflow/review-packaging.js';

export interface DeveloperWorkflowOptions {
  sessions?: number;
  approvalThreshold?: number;
  rejectionThreshold?: number;
  enableRollback?: boolean;
  sessionId?: string;
  verbose?: boolean;
}

export async function runWorkflowSimulation(options: DeveloperWorkflowOptions): Promise<void> {
  info('CLI', 'Developer Workflow Simulation v1');

  try {
    const config: DeveloperWorkflowConfig = {
      sessionCount: options.sessions || 20,
      approvalThreshold: options.approvalThreshold || 0.7,
      rejectionThreshold: options.rejectionThreshold || 0.3,
      enableRollbackSimulation: options.enableRollback || false,
    };

    const orchestrator = new DeveloperWorkflowOrchestrator();
    const storage = new DeveloperWorkflowStorage(process.cwd());
    const packager = new MutationReviewPackager();

    if (options.sessionId) {
      const sessions = storage.listSessions();
      const session = sessions.find(s => s.id === options.sessionId);

      if (!session) {
        error('CLI', `Session ${options.sessionId} not found`);
        return;
      }

      const pkg = packager.package(session);
      console.log(packager.formatForDisplay(pkg));
      storage.saveReviewPackage(pkg);

      info('CLI', 'Review package generated and saved');
      return;
    }

    info('CLI', `Simulating ${config.sessionCount} developer review sessions...`);

    const result = orchestrator.simulateWorkflow(config);

    for (const session of result.sessions) {
      storage.saveSession(session);
    }

    storage.saveErgonomicsReport(result.ergonomics);
    storage.saveVisibilityReport(result.visibility);
    storage.saveBenchmark(result.benchmark);

    console.log('');
    console.log('═'.repeat(60));
    console.log('DEVELOPER WORKFLOW SIMULATION RESULTS');
    console.log('═'.repeat(60));
    console.log('');

    console.log('REVIEW ERGONOMICS:');
    console.log(`  Sessions Analyzed: ${result.ergonomics.sessionCount}`);
    console.log(`  Explanation Clarity: ${(result.ergonomics.metrics.explanationClarity * 100).toFixed(0)}%`);
    console.log(`  Governance Understandability: ${(result.ergonomics.metrics.governanceUnderstandability * 100).toFixed(0)}%`);
    console.log(`  Mutation Readability: ${(result.ergonomics.metrics.mutationReadability * 100).toFixed(0)}%`);
    console.log(`  Replay Evidence Usefulness: ${(result.ergonomics.metrics.replayEvidenceUsefulness * 100).toFixed(0)}%`);
    console.log(`  Rollback Confidence: ${(result.ergonomics.metrics.rollbackConfidence * 100).toFixed(0)}%`);
    console.log(`  Ambiguity Visibility: ${(result.ergonomics.metrics.ambiguityVisibility * 100).toFixed(0)}%`);
    console.log('');

    console.log('GOVERNANCE VISIBILITY:');
    console.log(`  Risky Recovery Warnings: ${result.visibility.warnings.riskyRecovery}`);
    console.log(`  Replay Divergence Warnings: ${result.visibility.warnings.replayDivergence}`);
    console.log(`  Structural Instability Warnings: ${result.visibility.warnings.structuralInstability}`);
    console.log(`  Unsupported Pattern Warnings: ${result.visibility.warnings.unsupportedPattern}`);
    console.log(`  Confidence Uncertainty: ${result.visibility.warnings.confidenceUncertainty}`);
    console.log(`  Developer Comprehension Score: ${(result.visibility.developerComprehensionScore * 100).toFixed(0)}%`);
    console.log('');

    console.log('APPROVAL WORKFLOW BENCHMARK:');
    console.log(`  Safe Approval Rate: ${(result.benchmark.safeApprovalRate * 100).toFixed(1)}%`);
    console.log(`  Risky Approval Rate: ${(result.benchmark.riskyApprovalRate * 100).toFixed(1)}%`);
    console.log(`  Rejection Precision: ${(result.benchmark.rejectionPrecision * 100).toFixed(0)}%`);
    console.log(`  Rollback Usage Rate: ${(result.benchmark.rollbackUsageRate * 100).toFixed(1)}%`);
    console.log(`  Confidence Comprehension: ${(result.benchmark.confidenceComprehensionRate * 100).toFixed(0)}%`);
    console.log('');

    console.log('RECOMMENDATION:');
    console.log(`  ${result.benchmark.recommendation}`);
    console.log('');

    console.log('═'.repeat(60));

    info('CLI', `Simulation complete. ${config.sessionCount} sessions analyzed.`);
    info('CLI', `Reports saved to .testguardian/developer-workflows/`);
  } catch (err) {
    error('CLI', `Workflow simulation failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}