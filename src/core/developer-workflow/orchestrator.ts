/**
 * Developer Workflow Orchestrator
 *
 * Coordinates all workflow simulation components.
 */

import type {
  HealingReviewSession,
  ReviewErgonomicsReport,
  GovernanceVisibilityReport,
  ApprovalWorkflowBenchmark,
  DeveloperWorkflowConfig,
  LocatorFailure,
  HealingProposal,
  GovernanceEvaluation,
  ReplayValidationEvidence,
  MutationDiff,
  RollbackMetadata,
} from './types.js';

import { HealingReviewSessionModeler } from './review-session.js';
import { ReviewErgonomicsAnalyzer } from './review-ergonomics.js';
import { GovernanceVisibilitySimulator } from './governance-visibility.js';
import { ApprovalWorkflowBenchmarker } from './approval-benchmark.js';
import { MutationReviewPackager } from './review-packaging.js';

export class DeveloperWorkflowOrchestrator {
  private sessionModeler: HealingReviewSessionModeler;
  private ergonomicsAnalyzer: ReviewErgonomicsAnalyzer;
  private visibilitySimulator: GovernanceVisibilitySimulator;
  private benchmarker: ApprovalWorkflowBenchmarker;
  private packager: MutationReviewPackager;

  constructor() {
    this.sessionModeler = new HealingReviewSessionModeler();
    this.ergonomicsAnalyzer = new ReviewErgonomicsAnalyzer();
    this.visibilitySimulator = new GovernanceVisibilitySimulator();
    this.benchmarker = new ApprovalWorkflowBenchmarker();
    this.packager = new MutationReviewPackager();
  }

  createSession(
    failure: LocatorFailure,
    proposal: HealingProposal,
    governance: GovernanceEvaluation,
    replayEvidence: ReplayValidationEvidence[],
    diff: MutationDiff,
    rollback: RollbackMetadata
  ): HealingReviewSession {
    return this.sessionModeler.createSession(
      failure,
      proposal,
      governance,
      replayEvidence,
      diff,
      rollback
    );
  }

  simulateDeveloperAction(
    session: HealingReviewSession,
    action: 'approve' | 'reject' | 'initiate-rollback' | 'view-governance' | 'view-replay' | 'view-diff'
  ): HealingReviewSession {
    return this.sessionModeler.advanceStage(session, action);
  }

  runErgonomicsAnalysis(sessions: HealingReviewSession[]): ReviewErgonomicsReport {
    return this.ergonomicsAnalyzer.analyze(sessions);
  }

  runGovernanceVisibility(sessions: HealingReviewSession[]): GovernanceVisibilityReport {
    return this.visibilitySimulator.simulate(sessions);
  }

  runApprovalBenchmark(sessions: HealingReviewSession[]): ApprovalWorkflowBenchmark {
    return this.benchmarker.benchmark(sessions);
  }

  packageReview(session: HealingReviewSession) {
    return this.packager.package(session);
  }

  simulateWorkflow(config: DeveloperWorkflowConfig): {
    sessions: HealingReviewSession[];
    ergonomics: ReviewErgonomicsReport;
    visibility: GovernanceVisibilityReport;
    benchmark: ApprovalWorkflowBenchmark;
  } {
    const sessions: HealingReviewSession[] = [];

    for (let i = 0; i < config.sessionCount; i++) {
      const session = this.generateSimulatedSession(i, config);
      sessions.push(session);
    }

    const ergonomics = this.runErgonomicsAnalysis(sessions);
    const visibility = this.runGovernanceVisibility(sessions);
    const benchmark = this.runApprovalBenchmark(sessions);

    return { sessions, ergonomics, visibility, benchmark };
  }

  private generateSimulatedSession(index: number, config: DeveloperWorkflowConfig): HealingReviewSession {
    const failure: LocatorFailure = {
      locatorId: `locator-${index}`,
      expression: `#element-${index}`,
      testName: `test-case-${index}`,
      testFile: `tests/spec-${index % 3}.spec.ts`,
      errorMessage: `Element not found: #element-${index}`,
      timestamp: Date.now() - (index * 1000),
    };

    const proposal: HealingProposal = {
      id: `proposal-${index}`,
      locatorId: failure.locatorId,
      originalExpression: failure.expression,
      proposedExpression: `[data-testid="element-${index}"]`,
      strategy: 'attribute-similarity',
      confidence: 0.5 + Math.random() * 0.4,
      evidence: ['Similar attribute found', 'Stable selector pattern'],
    };

    const riskLevelOptions: ('low' | 'medium' | 'high' | 'critical')[] = ['low', 'medium', 'high', 'critical'];
    const riskLevel = riskLevelOptions[Math.floor(Math.random() * riskLevelOptions.length)];
    const confidenceScore = 0.4 + Math.random() * 0.5;

    const governance: GovernanceEvaluation = {
      riskLevel,
      riskFactors: riskLevel !== 'low' ? [`Risk factor for ${riskLevel}`] : [],
      confidenceScore,
      approvalRecommended: confidenceScore >= config.approvalThreshold,
      warnings: riskLevel === 'high' ? ['High risk detected'] : [],
    };

    const replayEvidence: ReplayValidationEvidence[] = [
      {
        sessionId: `replay-${index}-1`,
        matched: Math.random() > 0.2,
        matchedElementCount: Math.random() > 0.7 ? 2 : 1,
        falsePositiveIndicators: Math.random() > 0.8 ? ['Multiple matches'] : [],
        timingInfo: {
          duration: 100 + Math.random() * 200,
          timingVariance: Math.random() * 0.3,
        },
      },
    ];

    const diff: MutationDiff = {
      originalCode: failure.expression,
      proposedCode: proposal.proposedExpression,
      targetFile: failure.testFile,
      targetLine: 10 + index,
      hunks: [
        {
          originalStart: 10 + index,
          originalLines: [failure.expression],
          patchedStart: 10 + index,
          patchedLines: [proposal.proposedExpression],
        },
      ],
    };

    const rollback: RollbackMetadata = {
      patchId: `patch-${index}`,
      originalExpression: failure.expression,
      rollbackCode: failure.expression,
      canRollback: true,
      riskAssessment: 'Low risk rollback - simple selector change',
    };

    let session = this.createSession(failure, proposal, governance, replayEvidence, diff, rollback);

    const shouldApprove = governance.approvalRecommended && Math.random() > (1 - config.approvalThreshold);
    
    if (shouldApprove) {
      session = this.simulateDeveloperAction(session, 'view-governance');
      session = this.simulateDeveloperAction(session, 'view-replay');
      session = this.simulateDeveloperAction(session, 'view-diff');
      session = this.simulateDeveloperAction(session, 'approve');
    } else {
      session = this.simulateDeveloperAction(session, 'view-governance');
      session = this.simulateDeveloperAction(session, 'reject');
    }

    return session;
  }
}