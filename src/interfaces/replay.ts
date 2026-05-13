/**
 * ReplayEngine — contract for navigation replay.
 *
 * Converts traces to replay sessions and executes them.
 * Used by the validator to confirm healing proposals against live DOM.
 */

import type { Result } from '../models/result.js';
import type { NavigationSession, NavigationStep } from '../models/navigation.js';
import type { ExecutionTrace } from '../models/trace.js';
import type { DomSnapshot } from '../models/snapshot.js';

export interface ReplayEngine {
  /** Convert an execution trace into a deterministic replay session. */
  record(trace: ExecutionTrace): Result<NavigationSession>;

  /** Execute a single navigation step and return a DOM snapshot. */
  executeStep(step: NavigationStep): Promise<Result<DomSnapshot>>;

  /** Execute a full navigation session, capturing a new trace. */
  executeSession(session: NavigationSession): Promise<Result<ExecutionTrace>>;

  /** Compare two traces and return a diff summary. */
  compareTraces(original: ExecutionTrace, replay: ExecutionTrace): Result<TraceDiffSummary>;
}

export interface TraceDiffSummary {
  /** Do the two traces follow the same structure? */
  structurallyIdentical: boolean;
  /** Events that differ between the two traces. */
  diffs: Array<{
    eventIndex: number;
    originalType: string;
    replayType: string;
    originalSuccess: boolean;
    replaySuccess: boolean;
  }>;
}
