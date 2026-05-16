/**
 * Healing Review Session Modeler
 *
 * Models developer workflow stages for healing proposal review:
 * - locator failure detected
 * - healing proposal generated
 * - governance evaluation surfaced
 * - replay validation evidence shown
 * - mutation diff reviewed
 * - developer approval/rejection simulated
 * - rollback workflow simulated
 */

import type {
  HealingReviewSession,
  WorkflowStage,
  DeveloperAction,
  WorkflowAction,
  LocatorFailure,
  HealingProposal,
  GovernanceEvaluation,
  ReplayValidationEvidence,
  MutationDiff,
  RollbackMetadata,
} from './types.js';

let sessionCounter = 0;

function generateSessionId(): string {
  sessionCounter++;
  return `review-session-${Date.now()}-${sessionCounter}`;
}

export class HealingReviewSessionModeler {
  createSession(
    failure: LocatorFailure,
    proposal: HealingProposal,
    governance: GovernanceEvaluation,
    replayEvidence: ReplayValidationEvidence[],
    diff: MutationDiff,
    rollback: RollbackMetadata
  ): HealingReviewSession {
    const initialAction: WorkflowAction = {
      stage: 'failure-detected',
      action: 'view-failure',
      timestamp: failure.timestamp,
      details: `Locator ${failure.locatorId} failed in ${failure.testName}`,
    };

    const actions: WorkflowAction[] = [initialAction];

    return {
      id: generateSessionId(),
      failure,
      proposal,
      governance,
      replayEvidence,
      diff,
      rollback,
      actions,
      currentStage: 'failure-detected',
      createdAt: failure.timestamp,
    };
  }

  advanceStage(
    session: HealingReviewSession,
    action: DeveloperAction,
    details?: string
  ): HealingReviewSession {
    const stageMap: Record<DeveloperAction, WorkflowStage> = {
      'view-failure': 'failure-detected',
      'view-proposal': 'proposal-generated',
      'view-governance': 'governance-evaluated',
      'view-replay': 'replay-validated',
      'view-diff': 'diff-reviewed',
      'approve': 'approved',
      'reject': 'rejected',
      'request-more-info': session.currentStage,
      'initiate-rollback': 'rollback-initiated',
    };

    const newStage = stageMap[action];
    const workflowAction: WorkflowAction = {
      stage: newStage,
      action,
      timestamp: Date.now(),
      details: details || this.getActionDescription(action),
    };

    const updatedSession: HealingReviewSession = {
      ...session,
      actions: [...session.actions, workflowAction],
      currentStage: newStage,
    };

    if (action === 'approve') {
      updatedSession.finalDecision = 'approved';
      updatedSession.decisionRationale = this.generateApprovalRationale(session);
      updatedSession.completedAt = Date.now();
    } else if (action === 'reject') {
      updatedSession.finalDecision = 'rejected';
      updatedSession.decisionRationale = this.generateRejectionRationale(session);
      updatedSession.completedAt = Date.now();
    }

    return updatedSession;
  }

  private getActionDescription(action: DeveloperAction): string {
    const descriptions: Record<DeveloperAction, string> = {
      'view-failure': 'Viewed locator failure details',
      'view-proposal': 'Viewed healing proposal',
      'view-governance': 'Viewed governance evaluation',
      'view-replay': 'Viewed replay validation evidence',
      'view-diff': 'Viewed mutation diff',
      'approve': 'Approved the healing proposal',
      'reject': 'Rejected the healing proposal',
      'request-more-info': 'Requested more information',
      'initiate-rollback': 'Initiated rollback workflow',
    };
    return descriptions[action];
  }

  private generateApprovalRationale(session: HealingReviewSession): string {
    const parts: string[] = [];

    if (session.governance.approvalRecommended) {
      parts.push('Governance recommended approval');
    }

    if (session.governance.confidenceScore > 0.7) {
      parts.push(`High confidence (${(session.governance.confidenceScore * 100).toFixed(0)}%)`);
    }

    const allReplaysPassed = session.replayEvidence.every(e => e.matched);
    if (allReplaysPassed) {
      parts.push('All replay validations passed');
    }

    if (session.governance.riskLevel === 'low') {
      parts.push('Low risk assessment');
    }

    return parts.join('; ') || 'Approved after review';
  }

  private generateRejectionRationale(session: HealingReviewSession): string {
    const parts: string[] = [];

    if (!session.governance.approvalRecommended) {
      parts.push('Governance did not recommend approval');
    }

    if (session.governance.riskLevel === 'high' || session.governance.riskLevel === 'critical') {
      parts.push(`High risk level (${session.governance.riskLevel})`);
    }

    if (session.governance.warnings.length > 0) {
      parts.push(`Governance warnings: ${session.governance.warnings.join(', ')}`);
    }

    const hasFalsePositives = session.replayEvidence.some(e => e.falsePositiveIndicators.length > 0);
    if (hasFalsePositives) {
      parts.push('Replay validation showed false positive indicators');
    }

    return parts.join('; ') || 'Rejected after review';
  }

  canApprove(session: HealingReviewSession): boolean {
    return session.currentStage !== 'approved' && 
           session.currentStage !== 'rejected' &&
           session.currentStage !== 'rollback-initiated';
  }

  canReject(session: HealingReviewSession): boolean {
    return session.currentStage !== 'approved' && 
           session.currentStage !== 'rejected' &&
           session.currentStage !== 'rollback-initiated';
  }

  canRollback(session: HealingReviewSession): boolean {
    return session.currentStage === 'approved' && session.rollback.canRollback;
  }
}