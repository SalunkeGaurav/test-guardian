/**
 * Navigation Recorder
 *
 * Converts an ExecutionTrace into a NavigationSession.
 * The reverse of the Navigator — takes events and generates replayable steps.
 *
 * Mapping:
 * - TraceEvent 'navigation' → StepCommand 'navigate'
 * - TraceEvent 'click' → StepCommand 'click'
 * - TraceEvent 'type' → StepCommand 'type'
 * - etc.
 *
 * Only deterministic, repeatable events are recorded.
 * Non-deterministic events (timing, screenshots) are excluded.
 *
 * TODO: implement recordFromTrace(trace: ExecutionTrace): NavigationSession
 */

export {};
