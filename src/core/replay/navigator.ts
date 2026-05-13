/**
 * Navigator
 *
 * Executes a NavigationSession against a live browser via an adapter.
 * Captures a new ExecutionTrace during replay.
 *
 * Flow:
 * 1. Accept NavigationSession + FrameworkAdapter
 * 2. For each step, call adapter.executeStep(command)
 * 3. Record each step as a TraceEvent
 * 4. Return a new ExecutionTrace (the "replay trace")
 * 5. Compare replay trace with original trace
 *
 * TODO: implement executeSession(session, adapter): Promise<ExecutionTrace>
 */

export {};
