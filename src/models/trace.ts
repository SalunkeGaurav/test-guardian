/**
 * Execution trace domain models.
 *
 * ExecutionTrace represents a single test execution with all its events.
 * TraceEvent is an individual action or assertion within a test.
 * TraceSummary is a lightweight view for analysis without full event detail.
 */

export type TraceEventType =
  | 'navigation'
  | 'click'
  | 'type'
  | 'select'
  | 'assertion'
  | 'locator_resolve'
  | 'hover'
  | 'scroll'
  | 'wait'
  | 'screenshot'
  | 'error'
  | 'timeout'
  | 'evaluate'
  | 'custom';

export interface TraceEvent {
  type: TraceEventType;
  /** Monotonic timestamp relative to test start (ms). */
  timestamp: number;
  /** How long this event took (ms). */
  duration: number;
  /** Locator string used (if applicable). */
  locator?: string;
  /** Resolved selector after framework transformation. */
  resolvedSelector?: string;
  success: boolean;
  /** Error message if event failed. */
  error?: string;
  /** Path to screenshot file in .testguardian/snapshots/. */
  screenshot?: string;
  /** ID linking to a stored DOM snapshot. */
  domSnapshotId?: string;
  /** User-defined label for custom events. */
  label?: string;
  /** Arbitrary metadata (framework-specific). */
  metadata?: Record<string, unknown>;
}

export interface ExecutionTrace {
  /** Unique trace ID (UUID). */
  id: string;
  /** Test metadata. */
  testFile: string;
  testName: string;
  framework: string;
  /** Execution timing. */
  startedAt: number;
  finishedAt: number;
  /** Duration in ms (derived, stored for convenience). */
  duration: number;
  /** Overall result. */
  passed: boolean;
  /** Ordered list of all events. */
  events: TraceEvent[];
  /** Error message if the test failed overall. */
  error?: string;
  /** Framework-specific metadata (browser, viewport, etc.). */
  metadata?: Record<string, unknown>;
  /** Git commit hash at time of execution (if available). */
  commitHash?: string;
}

export interface TraceSummary {
  id: string;
  testName: string;
  testFile: string;
  framework: string;
  passed: boolean;
  duration: number;
  eventCount: number;
  failureCount: number;
  executedAt: number;
}
