/**
 * Replay Validation Engine models.
 *
 * ValidationResult captures the outcome of deterministically validating
 * a healing proposal against a recorded DOM snapshot.
 *
 * No AI. No patches. No filesystem modification.
 */

export type ValidationStatus = 'passed' | 'failed' | 'ambiguous' | 'error';

export interface FalsePositiveIndicator {
  type:
    | 'multiple-matches'
    | 'hidden-element'
    | 'detached-element'
    | 'wrong-role'
    | 'hierarchy-mismatch'
    | 'unstable-dynamic'
    | 'not-interactable'
    | 'no-match';
  detail: string;
}

export interface ExecutionMetadata {
  stepIndex: number;
  actionType: string;
  pageUrl: string;
  frame: string;
  resolvedAt: number;
}

export interface ValidationResult {
  id: string;
  proposalId: string;
  locatorId: string;
  replaySessionId: string;
  status: ValidationStatus;
  matchedElementCount: number;
  interactionSuccess: boolean;
  replayConfidence: number;
  falsePositiveIndicators: FalsePositiveIndicator[];
  executionMetadata: ExecutionMetadata;
  failureReason?: string;
  validatedAt: number;
}
