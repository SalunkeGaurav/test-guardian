/**
 * SandboxRevalidator
 *
 * Applies a patch proposal inside a sandbox and re-runs the affected
 * tests to verify: compile success, replay success, no navigation
 * divergence, and no new failures.
 *
 * Reuses: MutationSandbox, PatchGenerator
 * No new sandboxing logic. No new replay logic.
 */

import type { Result } from '../../models/result.js';
import type { PatchProposal } from '../../models/patch.js';
import type { SandboxPatchResult } from './types.js';
import type { FailureContext } from './types.js';
import { success, failure } from '../../models/result.js';
import { MutationSandbox } from '../sandbox/mutation-sandbox.js';
import type { SandboxExecutionResult } from '../sandbox/mutation-sandbox.js';

export interface SandboxRevalidatorInput {
  patchProposal: PatchProposal;
  failureContext: FailureContext;
  projectRoot: string;
}

export class SandboxRevalidator {
  private readonly sandbox: MutationSandbox;

  constructor(projectRoot: string) {
    this.sandbox = new MutationSandbox(projectRoot);
  }

  /**
   * Apply patch in sandbox and verify all acceptance criteria.
   */
  async revalidate(input: SandboxRevalidatorInput): Promise<Result<SandboxPatchResult>> {
    try {
      const { patchProposal, projectRoot } = input;

      const execResult = await this.sandbox.execute([patchProposal]);
      if (!execResult.ok) {
        return failure(`Sandbox execution failed: ${execResult.error}`);
      }

      const sandboxExec = execResult.value;
      const isolationResult = this.sandbox.verifyIsolation(sandboxExec.sandboxId);
      const isolationVerified = isolationResult.ok && isolationResult.value.isolated;

      const noNavigationDivergence = sandboxExec.report.replayResult.divergedSteps === 0;
      const noNewFailures = sandboxExec.report.replayResult.failedSteps === 0;

      const result: SandboxPatchResult = {
        sandboxId: sandboxExec.sandboxId,
        patchProposal,
        compileResult: sandboxExec.report.compileResult,
        replayResult: sandboxExec.report.replayResult,
        runtimeResult: sandboxExec.report.runtimeResult,
        mutationReport: sandboxExec.report,
        isolationVerified,
      };

      return success(result);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Verify sandbox acceptance criteria.
   */
  static verifyAcceptance(result: SandboxPatchResult): {
    compileSuccess: boolean;
    replaySuccess: boolean;
    noNavigationDivergence: boolean;
    noNewFailures: boolean;
    allPassed: boolean;
  } {
    const compileSuccess = result.compileResult.success;
    const replaySuccess = result.replayResult.success;
    const noNavigationDivergence = result.replayResult.divergedSteps === 0;
    const noNewFailures = result.replayResult.failedSteps === 0;

    return {
      compileSuccess,
      replaySuccess,
      noNavigationDivergence,
      noNewFailures,
      allPassed: compileSuccess && replaySuccess && noNavigationDivergence && noNewFailures,
    };
  }

  /**
   * Clean up all sandboxes.
   */
  cleanup(): Result<{ sandboxesDeleted: number; reportsDeleted: number }> {
    return this.sandbox.cleanAll();
  }
}
