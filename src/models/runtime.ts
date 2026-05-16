/**
 * Deterministic Browser Replay Runtime models.
 *
 * RuntimeValidationResult captures the outcome of executing a healing
 * proposal against a real (or simulated) browser session, including
 * step-by-step evidence, divergence detection, and false-positive analysis.
 *
 * No patches. No autonomous healing. No AI.
 */

export type RuntimeStatus = 'passed' | 'failed' | 'ambiguous' | 'diverged' | 'error';

export interface MatchedElement {
  tagName: string;
  attributes: Record<string, string>;
  textContent?: string;
  visible: boolean;
  interactable: boolean;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export interface RuntimeEvidence {
  stepIndex: number;
  actionType: string;
  matchedElement?: MatchedElement;
  interactable: boolean;
  visible: boolean;
  navigationChanged: boolean;
  url: string;
  timing: number;
  consoleErrors: string[];
  screenshotRef?: string;
}

export interface TimingMetadata {
  startedAt: number;
  finishedAt: number;
  totalDuration: number;
  stepDurations: number[];
}

export interface BrowserMetadata {
  browserName: string;
  browserVersion?: string;
  viewport?: { width: number; height: number };
  userAgent?: string;
}

export interface ReplayDivergence {
  type: 'url-mismatch' | 'element-missing' | 'interaction-failed' | 'dialog-mismatch' | 'frame-mismatch' | 'dom-inconsistency';
  stepIndex: number;
  expected: string;
  actual: string;
}

export interface RuntimeFalsePositiveIndicator {
  type: 'wrong-element' | 'navigation-divergence' | 'multiple-matches' | 'hidden-element' | 'detached-element' | 'unstable-dynamic' | 'hierarchy-mismatch';
  stepIndex: number;
  detail: string;
}

export interface RuntimeValidationResult {
  id: string;
  replaySessionId: string;
  proposalId: string;
  status: RuntimeStatus;
  executedStepCount: number;
  totalStepCount: number;
  failedStepId?: string;
  runtimeConfidence: number;
  runtimeEvidence: RuntimeEvidence[];
  timingMetadata: TimingMetadata;
  browserMetadata: BrowserMetadata;
  replayDivergence: ReplayDivergence[];
  falsePositiveIndicators: RuntimeFalsePositiveIndicator[];
  createdAt: number;
}

export interface RuntimeValidationInput {
  session: import('./replay.js').ReplaySession;
  proposals: import('./healing-candidate.js').HealingCandidate[];
  locatorId: string;
  stepIndex: number;
  browserConfig?: BrowserConfig;
}

export interface BrowserConfig {
  headless?: boolean;
  viewport?: { width: number; height: number };
  args?: string[];
}

export interface BrowserContextState {
  id: string;
  currentUrl: string;
  currentFrame: string;
}

export interface NavigationResult {
  url: string;
  title: string;
  timing: number;
}

export interface InteractionResult {
  success: boolean;
  matchedElement?: MatchedElement;
  timing: number;
  error?: string;
}
