/**
 * Execution State Machine
 *
 * Deterministic state transitions for the unified runtime.
 * Handles partial failures, rollback-safe execution, failure boundaries.
 *
 * No AI. No autonomous transitions. Deterministic state flow.
 */

import type { ExecutionState, ExecutionStage, ExecutionStateTransition, ExecutionStateTransitionReport } from './types.js';

const VALID_TRANSITIONS: Record<ExecutionState, ExecutionState[]> = {
  idle: ['analyzing', 'failed'],
  analyzing: ['hardening', 'healing', 'failed'],
  hardening: ['healing', 'failed'],
  healing: ['validating', 'failed'],
  validating: ['sandboxing', 'governing', 'completed', 'failed'],
  sandboxing: ['governing', 'completed', 'failed'],
  governing: ['reporting', 'failed'],
  reporting: ['completed', 'failed'],
  completed: [],
  failed: [],
};

export class ExecutionStateMachine {
  private currentState: ExecutionState = 'idle';
  private transitions: ExecutionStateTransition[] = [];

  constructor() {}

  /**
   * Attempt a deterministic state transition.
   * Returns true if transition is valid, false otherwise.
   */
  transition(to: ExecutionState, stage: ExecutionStage, success: boolean, error?: string): boolean {
    const allowed = VALID_TRANSITIONS[this.currentState] ?? [];
    if (!allowed.includes(to)) {
      return false;
    }

    const transition: ExecutionStateTransition = {
      from: this.currentState,
      to,
      stage,
      success,
      error,
      timestamp: 0,
    };

    this.transitions.push(transition);
    this.currentState = to;
    return true;
  }

  /**
   * Transition to failed state with error context.
   */
  fail(stage: ExecutionStage, error: string): boolean {
    return this.transition('failed', stage, false, error);
  }

  /**
   * Get current state.
   */
  getState(): ExecutionState {
    return this.currentState;
  }

  /**
   * Generate the full transition report.
   */
  generateReport(): ExecutionStateTransitionReport {
    const failedTransitions = this.transitions.filter(t => !t.success).length;
    const finalState = this.transitions.length > 0
      ? this.transitions[this.transitions.length - 1]!.to
      : this.currentState;

    return {
      transitions: [...this.transitions],
      currentState: this.currentState,
      finalState,
      totalTransitions: this.transitions.length,
      failedTransitions,
    };
  }

  /**
   * Check if execution is complete.
   */
  isComplete(): boolean {
    return this.currentState === 'completed' || this.currentState === 'failed';
  }

  /**
   * Check if execution succeeded.
   */
  succeeded(): boolean {
    return this.currentState === 'completed';
  }
}
