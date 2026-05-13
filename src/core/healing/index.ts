/**
 * Healing Engine Module
 *
 * Purpose: Analyze failing traces, identify broken locators, and
 * generate ranked healing proposals using registered strategies.
 *
 * This is a deterministic pipeline — strategies are evaluated in
 * priority order. The first strategy to produce a high-confidence
 * proposal wins. No AI, no guessing, no autonomous decision-making.
 *
 * Inputs:
 *   - ExecutionTrace (failing)
 *   - DomSnapshot (captured at failure)
 *   - LocatorIndex (to find the broken locator's record)
 *   - HealingStrategyProvider[] (registered strategies)
 *
 * Outputs:
 *   - HealingProposal[] (ranked, validated)
 *
 * Used by: CLI `heal` command
 *
 * Boundary:
 *   - Does NOT apply patches — only generates proposals
 *   - Does NOT execute tests — works against stored traces + snapshots
 *   - Strategies are injected — this module orchestrates, not implements
 */

import type { HealingStrategyProvider } from '../../interfaces/healing.js';
import type { LocatorIndexProvider } from '../../interfaces/locator.js';
import type { ExecutionTrace } from '../../models/trace.js';
import type { DomSnapshot } from '../../models/snapshot.js';
import type { HealingProposal } from '../../models/healing.js';
import type { Result } from '../../models/result.js';

export class HealingEngine {
  constructor(
    private readonly strategies: HealingStrategyProvider[],
    private readonly locatorIndex: LocatorIndexProvider,
  ) {}

  async heal(trace: ExecutionTrace, snapshot: DomSnapshot): Promise<Result<HealingProposal[]>> {
    // 1. Find failed locators in the trace
    // 2. Look up each in the locator index
    // 3. Run each strategy in priority order
    // 4. Collect and rank proposals
    // 5. Return proposals (do NOT apply)
    throw new Error('Not implemented');
  }
}
