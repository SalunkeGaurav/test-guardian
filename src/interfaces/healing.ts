/**
 * HealingStrategyProvider — contract for healing strategies.
 *
 * Each strategy is a pure function that takes a failing locator + context
 * and returns zero or more proposals.
 *
 * Strategies are deterministic — same input always produces the same output.
 */

import type { Result } from '../models/result.js';
import type { HealingProposal, HealingStrategy } from '../models/healing.js';
import type { Locator } from '../models/locator.js';
import type { ExecutionTrace } from '../models/trace.js';
import type { DomSnapshot } from '../models/snapshot.js';

export interface HealingStrategyProvider {
  /** Metadata about this strategy. */
  readonly strategy: HealingStrategy;

  /**
   * Generate proposals for a broken locator.
   *
   * @param locator - The locator that failed.
   * @param failingTrace - The trace where the failure occurred.
   * @param snapshot - DOM snapshot captured at failure time.
   * @returns Ordered list of proposals (best first).
   */
  propose(
    locator: Locator,
    failingTrace: ExecutionTrace,
    snapshot: DomSnapshot,
  ): Promise<Result<HealingProposal[]>>;
}
