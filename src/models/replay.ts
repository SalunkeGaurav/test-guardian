/**
 * Replay domain models — canonical replay step schema.
 *
 * These models are the deterministic replay representation.
 * They are NOT the same as NavigationStep/NavigationSession (which are
 * the execution engine's view). These are the persistent canonical form.
 *
 * ReplayStep is a single normalized, deterministic step.
 * ReplaySession groups steps into a replayable session.
 */

export type CanonicalActionType =
  | 'goto'
  | 'click'
  | 'fill'
  | 'press'
  | 'select'
  | 'assertion'
  | 'wait';

export interface LocatorReference {
  strategy: string;
  value: string;
  expression: string;
  sourceFile?: string;
  sourceLine?: number;
}

export interface StepResult {
  success: boolean;
  error?: string;
  duration: number;
  screenshotRef?: string;
}

export interface SnapshotReference {
  snapshotId: string;
  capturedAt: number;
}

export interface NavigationContext {
  url: string;
  frame?: string;
  dialog?: boolean;
  modal?: boolean;
}

export type InputPayload =
  | string
  | { key: string }
  | { option: string }
  | { text: string }
  | Record<string, unknown>;

export interface ReplayStep {
  stepId: string;
  timestamp: number;
  actionType: CanonicalActionType;
  locatorRef?: LocatorReference;
  pageUrl: string;
  inputPayload?: InputPayload;
  result: StepResult;
  snapshotRef?: SnapshotReference;
  navigationContext: NavigationContext;
}

export interface ReplaySession {
  id: string;
  traceId: string;
  testName: string;
  testFile: string;
  framework: string;
  schemaVersion: number;
  entryUrl: string;
  urlTransitions: string[];
  redirectChain: string[];
  frameContext: string[];
  modalDialogContext: string[];
  steps: ReplayStep[];
  createdAt: number;
}

export interface ReplaySessionIndexEntry {
  id: string;
  traceId: string;
  testName: string;
  testFile: string;
  framework: string;
  stepCount: number;
  schemaVersion: number;
  createdAt: number;
  [key: string]: unknown;
}
