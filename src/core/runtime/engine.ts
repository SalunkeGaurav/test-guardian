/**
 * ReplayRuntime
 *
 * Deterministic browser replay runtime for healing proposal validation.
 *
 * Flow:
 * 1. Accept a ReplaySession and one or more HealingCandidates
 * 2. For each proposal, replay the session in an isolated browser context
 * 3. Inject the proposed locator at the failing step
 * 4. Collect step-by-step runtime evidence
 * 5. Detect false positives and replay divergence
 * 6. Compute deterministic validation confidence
 * 7. Return RuntimeValidationResult
 *
 * Runtime does NOT:
 * - Apply patches
 * - Modify framework files
 * - Use AI or LLMs
 * - Perform autonomous healing
 * - Implement adaptive retries
 */

import type { Result } from '../../models/result.js';
import type { ReplaySession } from '../../models/replay.js';
import type { HealingCandidate } from '../../models/healing-candidate.js';
import type { RuntimeValidationResult, BrowserConfig, BrowserMetadata } from '../../models/runtime.js';
import { success, failure } from '../../models/result.js';
import { ReplayCoordinator } from './replay-coordinator.js';
import { RuntimePersister } from './persister.js';
import type { BrowserEngine } from './browser.js';

export { RuntimePersister } from './persister.js';

export class ReplayRuntime {
  private readonly coordinator: ReplayCoordinator;
  private readonly persister: RuntimePersister;

  constructor(
    private readonly browser: BrowserEngine,
    root?: string,
  ) {
    this.coordinator = new ReplayCoordinator(browser);
    this.persister = root ? new RuntimePersister(root) : new RuntimePersister(process.cwd());
  }

  /**
   * Validate a single healing proposal against a replay session.
   *
   * Replays the session in an isolated browser context, injects the
   * proposed locator at the specified step, and returns a validation result.
   */
  async validate(
    session: ReplaySession,
    proposal: HealingCandidate,
    proposalStepIndex: number,
    config?: BrowserConfig,
  ): Promise<Result<RuntimeValidationResult>> {
    const replayResult = await this.coordinator.replay(session, config, proposal, proposalStepIndex);

    if (!replayResult.ok) {
      return failure(replayResult.error);
    }

    const browserMetadata: BrowserMetadata = {
      browserName: 'chromium',
      viewport: config?.viewport ?? { width: 1280, height: 720 },
    };

    const result = this.coordinator.buildValidationResult(
      replayResult.value,
      session,
      proposal,
      browserMetadata,
    );

    return success(result);
  }

  /**
   * Validate multiple healing proposals for the same replay session.
   * Each proposal is validated in a separate isolated browser session.
   */
  async validateBatch(
    session: ReplaySession,
    proposals: HealingCandidate[],
    proposalStepIndex: number,
    config?: BrowserConfig,
  ): Promise<Result<RuntimeValidationResult[]>> {
    const results: RuntimeValidationResult[] = [];

    for (const proposal of proposals) {
      const result = await this.validate(session, proposal, proposalStepIndex, config);
      if (result.ok) {
        results.push(result.value);
      }
    }

    return success(results);
  }

  /**
   * Shut down the browser instance.
   */
  async shutdown(): Promise<Result<void>> {
    return this.coordinator.shutdown();
  }

  /**
   * Persist a runtime validation result.
   */
  async persist(result: RuntimeValidationResult): Promise<Result<void>> {
    return this.persister.save(result);
  }

  /**
   * Load a persisted runtime validation result.
   */
  async load(id: string): Promise<Result<RuntimeValidationResult>> {
    return this.persister.load(id);
  }

  /**
   * List all persisted runtime results.
   */
  async listResults(): Promise<Result<RuntimeValidationResult[]>> {
    return this.persister.list();
  }
}
