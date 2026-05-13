/**
 * Navigation replay domain models.
 *
 * NavigationStep is a single recorded action that can be replayed.
 * NavigationSession groups steps into a deterministic replay sequence.
 * StepCommand is the discriminated action type.
 */

export type StepCommand =
  | { type: 'navigate'; url: string }
  | { type: 'click'; locator: string; waitFor?: string }
  | { type: 'type'; locator: string; value: string }
  | { type: 'select'; locator: string; value: string }
  | { type: 'hover'; locator: string }
  | { type: 'scroll'; x: number; y: number }
  | { type: 'wait'; ms: number }
  | { type: 'wait-for'; selector: string; timeout?: number }
  | { type: 'assert'; locator: string; assertion: string; expected?: string }
  | { type: 'evaluate'; code: string }
  | { type: 'screenshot'; label?: string };

export interface NavigationStep {
  index: number;
  command: StepCommand;
  /** Description for human readability. */
  description: string;
  /** Optional locator reference. */
  locatorId?: string;
  /** Whether this step is critical (failure = abort). */
  critical: boolean;
  /** Max time to wait for this step (ms). */
  timeout: number;
}

export interface NavigationSession {
  id: string;
  /** Source trace this session was derived from. */
  traceId: string;
  testName: string;
  /** Ordered replay steps. */
  steps: NavigationStep[];
  /** Base URL for relative navigations. */
  baseUrl: string;
  /** Browser/viewport configuration for replay. */
  viewport?: { width: number; height: number };
  created: number;
}
