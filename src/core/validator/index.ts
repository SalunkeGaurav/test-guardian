/**
 * Validator Module
 *
 * Purpose: Verify that a healing proposal actually works before
 * any patch is applied. Runs the proposed locator against the DOM
 * to confirm it resolves correctly.
 *
 * The validator is the gatekeeper — no proposal becomes a patch
 * without passing validation.
 *
 * Inputs:
 *   - HealingProposal[]
 *   - DomSnapshot (the failure snapshot)
 *   - FrameworkAdapter (to re-execute if live verification needed)
 *
 * Outputs:
 *   - StrategyVerdict[] (one per proposal)
 *
 * Used by: CLI `validate` command, healing engine (post-generation)
 *
 * Boundary:
 *   - Read-only — never modifies source files
 *   - Can trigger live replay via ReplayEngine for active verification
 *   - Pure validation — no healing logic, no patch generation
 */

import type { HealingProposal } from '../../models/healing.js';
import type { StrategyVerdict } from '../../models/healing.js';
import type { Result } from '../../models/result.js';

export class Validator {
  async validate(proposals: HealingProposal[]): Promise<Result<StrategyVerdict[]>> {
    // 1. For each proposal, check if locator resolves in the snapshot DOM
    // 2. Score each (match count, element similarity)
    // 3. Return verdicts
    throw new Error('Not implemented');
  }
}
