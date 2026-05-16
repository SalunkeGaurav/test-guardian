import { describe, it, expect } from 'vitest';
import { ReviewRenderer } from '../../src/core/developer-review/review-renderer.js';
import { PatchVisualizer } from '../../src/core/developer-review/patch-visualizer.js';
import { GovernanceExplainer } from '../../src/core/developer-review/governance-explainer.js';
import { ReplayEvidenceRenderer } from '../../src/core/developer-review/replay-evidence-renderer.js';
import { ConfidenceBreakdownRenderer } from '../../src/core/developer-review/confidence-breakdown-renderer.js';
import { RollbackReview } from '../../src/core/developer-review/rollback-review.js';
import { MutationRiskVisualizer } from '../../src/core/developer-review/mutation-risk-visualizer.js';
import type { RuntimeHardeningResult } from '../../src/core/runtime-hardening/types.js';
import type { GovernanceResult } from '../../src/core/pipeline/confidence-governance.js';
import type { ValidationResult } from '../../src/models/validation.js';
import type { RuntimeValidationResult } from '../../src/models/runtime.js';
import type { HealingExplanation } from '../../src/models/healing-explanation.js';
import type { RollbackMetadata, PatchProposal, PatchDiff } from '../../src/models/patch.js';

function createMockValidationResult(overrides: Partial<ValidationResult> = {}): ValidationResult {
  return {
    id: 'validation-1',
    proposalId: 'proposal-1',
    locatorId: 'locator-1',
    replaySessionId: 'session-1',
    status: 'passed',
    matchedElementCount: 1,
    interactionSuccess: true,
    replayConfidence: 0.85,
    falsePositiveIndicators: [],
    executionMetadata: {
      stepIndex: 0,
      actionType: 'click',
      pageUrl: 'https://example.com',
      frame: 'main',
      resolvedAt: 0,
    },
    validatedAt: 0,
    ...overrides,
  };
}

function createMockRuntimeResult(overrides: Partial<RuntimeValidationResult> = {}): RuntimeValidationResult {
  return {
    id: 'runtime-1',
    replaySessionId: 'session-1',
    proposalId: 'proposal-1',
    status: 'passed',
    executedStepCount: 3,
    totalStepCount: 3,
    runtimeConfidence: 0.8,
    runtimeEvidence: [
      {
        stepIndex: 0,
        actionType: 'click',
        interactable: true,
        visible: true,
        navigationChanged: false,
        url: 'https://example.com',
        timing: 100,
        consoleErrors: [],
      },
    ],
    timingMetadata: {
      startedAt: 0,
      finishedAt: 300,
      totalDuration: 300,
      stepDurations: [100, 100, 100],
    },
    browserMetadata: {
      browserName: 'chromium',
    },
    replayDivergence: [],
    falsePositiveIndicators: [],
    createdAt: 0,
    ...overrides,
  };
}

function createMockHardeningResult(overrides: Partial<RuntimeHardeningResult> = {}): RuntimeHardeningResult {
  return {
    sessionId: 'session-1',
    domSettling: {
      sessionId: 'session-1',
      status: 'stable',
      snapshotSequence: [],
      stabilizationCheckCount: 3,
      mutationCountStabilized: true,
      layoutStabilized: true,
      renderLoopDetected: false,
      continuouslyMutatingContainers: [],
      hydrationInstabilityDetected: false,
      settledAt: 0,
    },
    navigationSync: {
      sessionId: 'session-1',
      transitions: [],
      readiness: 'ready',
      pendingRedirects: 0,
      staleHistoryStates: 0,
      softNavigations: 0,
      blockedByUnreadiness: false,
      syncedAt: 0,
    },
    asyncRender: {
      sessionId: 'session-1',
      observations: [],
      totalAsyncRenders: 0,
      completedRenders: 0,
      incompleteRenders: 0,
      reRenderChurnDetected: false,
      skeletonReplacements: 0,
      virtualizedListInstability: 0,
      detectedAt: 0,
    },
    staleContext: {
      sessionId: 'session-1',
      events: [],
      totalStaleEvents: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      recoveryRate: 1,
      recoveredAt: 0,
    },
    frameModal: {
      sessionId: 'session-1',
      frames: [],
      modals: [],
      nestedFrameCount: 0,
      modalTransitionCount: 0,
      focusTrapViolations: 0,
      overlayInterceptions: 0,
      stabilityPassed: true,
      detectedAt: 0,
    },
    replayDrift: {
      sessionId: 'session-1',
      events: [],
      totalDriftEvents: 0,
      navigationDivergences: 0,
      selectorDriftCount: 0,
      timingInstabilityCount: 0,
      actionSequenceDivergences: 0,
      nondeterministicReplays: 0,
      driftSeverity: 'none',
      replayDeterministic: true,
      detectedAt: 0,
    },
    metrics: {
      domStabilizationSuccessRate: 1,
      replayRecoverySuccess: 1,
      staleRecoverySuccess: 1,
      iframeRecoveryRate: 1,
      asyncRenderInstabilityFrequency: 0,
      replayDriftFrequency: 0,
      totalSessionsAnalyzed: 1,
      stableSessions: 1,
      unstableSessions: 0,
    },
    overallStable: true,
    persistedPaths: [],
    ...overrides,
  };
}

function createMockGovernanceResult(overrides: Partial<GovernanceResult> = {}): GovernanceResult {
  return {
    passed: true,
    gates: [
      { gate: 'min-static-confidence', passed: true, detail: 'All candidates meet minimum static confidence' },
      { gate: 'min-runtime-confidence', passed: true, detail: 'Runtime confidence meets minimum' },
      { gate: 'uniqueness', passed: true, detail: 'All proposals are unique' },
      { gate: 'replay-consistency', passed: true, detail: 'Runtime replay is consistent' },
    ],
    approvedCandidates: [],
    rejectedCandidates: [],
    ...overrides,
  };
}

function createMockExplanation(overrides: Partial<HealingExplanation> = {}): HealingExplanation {
  return {
    proposalId: 'proposal-1',
    locatorId: 'locator-1',
    strategy: 'attribute-similarity',
    proposedExpression: "page.getByRole('button', { name: 'Submit' })",
    confidenceBreakdown: {
      overall: 0.85,
      survivabilityScore: 0.8,
      structuralSimilarity: 0.9,
      attributeMatchScore: 0.85,
      hierarchyStability: 0.75,
      replayContextConfidence: 0.8,
    },
    rankingExplanation: 'High-confidence; Overall rank: 0.85; Survivability: 0.80; Structural similarity: 0.90',
    domEvidenceSummary: 'Original path: div > button; Matched path: div > button',
    structuralChangeExplanation: 'Strategy applied: attribute-similarity; Why matched: stable attribute found',
    evidence: {},
    rejectionReasons: [],
    createdAt: 0,
    ...overrides,
  };
}

function createMockRollbackMeta(overrides: Partial<RollbackMetadata> = {}): RollbackMetadata {
  return {
    originalLocatorExpression: "page.locator('#submit-btn')",
    originalStrategy: 'css',
    originalValue: '#submit-btn',
    originalSourceFile: '/test/example.spec.ts',
    originalLine: 10,
    originalColumn: 5,
    patchReversalCode: "page.locator('#submit-btn')",
    validationIds: ['validation-1'],
    replaySessionIds: ['session-1'],
    createdAt: 0,
    ...overrides,
  };
}

function createMockPatchProposal(overrides: Partial<PatchProposal> = {}): PatchProposal {
  return {
    patchId: 'patch-1',
    proposalId: 'proposal-1',
    targetFile: '/test/example.spec.ts',
    targetLocator: {
      expression: "page.locator('#submit-btn')",
      strategy: 'css',
      value: '#submit-btn',
      sourceLine: 10,
      sourceColumn: 5,
    },
    originalCodeSnippet: "page.locator('#submit-btn')",
    replacementCodeSnippet: "page.getByRole('button', { name: 'Submit' })",
    astNodeMetadata: {
      nodeType: 'CallExpression',
      startLine: 9,
      endLine: 9,
      startColumn: 5,
      endColumn: 35,
      parentType: 'ExpressionStatement',
      expressionType: 'PropertyAccessExpression',
    },
    confidenceMetadata: {
      staticValidationConfidence: 0.85,
      runtimeConfidence: 0.8,
      governanceConfidence: 0.85,
    },
    rollbackMetadata: createMockRollbackMeta(),
    patchSummary: 'Replace locator in page.locator',
    validationRefs: [],
    auditRefs: [],
    patchDiff: {
      unifiedDiff: '@@ -1,1 +1,1 @@\n-page.locator(\'#submit-btn\')\n+page.getByRole(\'button\', { name: \'Submit\' })',
      beforeSnippet: "  test('submit', async ({ page }) => {\n    await page.locator('#submit-btn').click();\n  });",
      afterSnippet: "  test('submit', async ({ page }) => {\n    await page.getByRole('button', { name: 'Submit' }).click();\n  });",
      beforeStartLine: 8,
      beforeEndLine: 11,
      afterStartLine: 8,
      afterEndLine: 11,
      addedLines: 1,
      removedLines: 1,
    },
    status: 'proposed',
    schemaVersion: 1,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('ReviewRenderer', () => {
  it('renders a deterministic review report', () => {
    const renderer = new ReviewRenderer();
    const report = renderer.render(
      "page.locator('#submit-btn')",
      "page.getByRole('button', { name: 'Submit' })",
      'attribute-similarity',
      createMockValidationResult(),
      createMockRuntimeResult(),
      createMockHardeningResult(),
      createMockGovernanceResult(),
      createMockRollbackMeta(),
      createMockExplanation(),
    );

    expect(report.reviewId).toBeDefined();
    expect(report.locatorSummary.originalLocator).toBe("page.locator('#submit-btn')");
    expect(report.locatorSummary.healedLocator).toBe("page.getByRole('button', { name: 'Submit' })");
    expect(report.validationOutcome.status).toBe('passed');
    expect(report.replayOutcome.status).toBe('passed');
    expect(report.runtimeStabilityOutcome.overallStable).toBe(true);
    expect(report.governanceReasoning.passed).toBe(true);
    expect(report.rollbackInstructions.available).toBe(true);
  });

  it('renders text output deterministically', () => {
    const renderer = new ReviewRenderer();
    const report = renderer.render(
      "page.locator('#submit-btn')",
      "page.getByRole('button', { name: 'Submit' })",
      'attribute-similarity',
      createMockValidationResult(),
      createMockRuntimeResult(),
      createMockHardeningResult(),
      createMockGovernanceResult(),
      createMockRollbackMeta(),
      createMockExplanation(),
    );

    const text = renderer.renderText(report);
    expect(text).toContain('Developer Review Report');
    expect(text).toContain("page.locator('#submit-btn')");
    expect(text).toContain("page.getByRole('button', { name: 'Submit' })");
    expect(text).toContain('passed');
    expect(text).toContain('stable');
  });

  it('handles rejected governance in report', () => {
    const renderer = new ReviewRenderer();
    const governanceResult = createMockGovernanceResult({
      passed: false,
      gates: [
        { gate: 'min-static-confidence', passed: false, detail: 'Below threshold', failedCandidates: ['candidate-1'] },
      ],
      rejectedCandidates: [
        {
          candidate: {
            id: 'candidate-1',
            locatorId: 'locator-1',
            originalExpression: "page.locator('#submit-btn')",
            proposedExpression: "page.getByRole('button', { name: 'Submit' })",
            proposedStrategy: 'attribute-similarity',
            proposedValue: 'Submit',
            strategy: 'attribute-similarity',
            confidence: 0.3,
            ranking: {
              overall: 0.3,
              survivabilityScore: 0.3,
              structuralSimilarity: 0.3,
              attributeMatchScore: 0.3,
              hierarchyStability: 0.3,
              replayContextConfidence: 0.3,
            },
            explanation: {
              whyMatched: 'stable attribute',
              structuralChanges: [],
              confidenceBreakdown: {
                overall: 0.3,
                survivabilityScore: 0.3,
                structuralSimilarity: 0.3,
                attributeMatchScore: 0.3,
                hierarchyStability: 0.3,
                replayContextConfidence: 0.3,
              },
              survivabilityReasoning: 'low confidence',
              attributeChanges: [],
              strategyApplied: 'attribute-similarity',
            },
            domEvidence: { stableAttributeMatches: [] },
            validated: false,
            createdAt: 0,
          },
          reason: 'Below threshold',
          gate: 'min-static-confidence',
        },
      ],
    });

    const report = renderer.render(
      "page.locator('#submit-btn')",
      "page.getByRole('button', { name: 'Submit' })",
      'attribute-similarity',
      createMockValidationResult(),
      createMockRuntimeResult(),
      createMockHardeningResult(),
      governanceResult,
      createMockRollbackMeta(),
      createMockExplanation(),
    );

    expect(report.governanceReasoning.passed).toBe(false);
    expect(report.governanceReasoning.rejectionReasons.length).toBeGreaterThan(0);
  });
});

describe('PatchVisualizer', () => {
  it('visualizes patch diff deterministically', () => {
    const visualizer = new PatchVisualizer();
    const proposal = createMockPatchProposal();
    const visualization = visualizer.visualize(proposal);

    expect(visualization.patchId).toBe('patch-1');
    expect(visualization.targetFile).toBe('/test/example.spec.ts');
    expect(visualization.patchScope.linesChanged).toBe(2);
    expect(visualization.patchScope.filesAffected).toBe(1);
    expect(visualization.structuralImpact.astNodeType).toBe('CallExpression');
    expect(visualization.renderedDiff).toContain('--- a/');
    expect(visualization.renderedSummary).toContain('Before:');
    expect(visualization.renderedSummary).toContain('After:');
  });

  it('computes minimal impact for single line change', () => {
    const visualizer = new PatchVisualizer();
    const proposal = createMockPatchProposal({
      patchDiff: {
        unifiedDiff: '@@ -1,1 +1,1 @@',
        beforeSnippet: 'old',
        afterSnippet: 'new',
        beforeStartLine: 0,
        beforeEndLine: 0,
        afterStartLine: 0,
        afterEndLine: 0,
        addedLines: 1,
        removedLines: 0,
      },
    });
    const visualization = visualizer.visualize(proposal);
    expect(visualization.structuralImpact.impactLevel).toBe('minimal');
  });

  it('computes significant impact for large diff', () => {
    const visualizer = new PatchVisualizer();
    const proposal = createMockPatchProposal({
      patchDiff: {
        unifiedDiff: '@@ -1,5 +1,5 @@',
        beforeSnippet: 'old',
        afterSnippet: 'new',
        beforeStartLine: 0,
        beforeEndLine: 4,
        afterStartLine: 0,
        afterEndLine: 4,
        addedLines: 5,
        removedLines: 5,
      },
    });
    const visualization = visualizer.visualize(proposal);
    expect(visualization.structuralImpact.impactLevel).toBe('significant');
  });
});

describe('GovernanceExplainer', () => {
  it('explains approved governance deterministically', () => {
    const explainer = new GovernanceExplainer();
    const report = explainer.explain(
      createMockGovernanceResult(),
      createMockRuntimeResult(),
      createMockHardeningResult(),
      {
        minStaticValidationConfidence: 0.5,
        minRuntimeConfidence: 0.6,
        requireUniqueness: true,
        requireReplayConsistency: true,
      },
    );

    expect(report.overallDecision).toBe('approved');
    expect(report.approvalReasons.length).toBeGreaterThan(0);
    expect(report.rejectionReasons.length).toBe(0);
    expect(report.renderedExplanation).toContain('APPROVED');
  });

  it('explains rejected governance with reasons', () => {
    const explainer = new GovernanceExplainer();
    const governanceResult = createMockGovernanceResult({
      passed: false,
      gates: [
        { gate: 'min-static-confidence', passed: false, detail: 'Below threshold' },
      ],
      rejectedCandidates: [],
    });

    const report = explainer.explain(
      governanceResult,
      createMockRuntimeResult(),
      createMockHardeningResult(),
      {
        minStaticValidationConfidence: 0.5,
        minRuntimeConfidence: 0.6,
        requireUniqueness: true,
        requireReplayConsistency: true,
      },
    );

    expect(report.overallDecision).toBe('rejected');
    expect(report.rejectionReasons.length).toBeGreaterThan(0);
    expect(report.renderedExplanation).toContain('REJECTED');
  });

  it('includes replay concerns when divergences exist', () => {
    const explainer = new GovernanceExplainer();
    const runtimeResult = createMockRuntimeResult({
      replayDivergence: [
        { type: 'url-mismatch', stepIndex: 0, expected: 'https://a.com', actual: 'https://b.com' },
      ],
    });

    const report = explainer.explain(
      createMockGovernanceResult(),
      runtimeResult,
      createMockHardeningResult(),
      {
        minStaticValidationConfidence: 0.5,
        minRuntimeConfidence: 0.6,
        requireUniqueness: true,
        requireReplayConsistency: true,
      },
    );

    expect(report.replayConcerns.length).toBeGreaterThan(0);
    expect(report.replayConcerns[0]).toContain('url-mismatch');
  });

  it('includes runtime instability concerns when DOM is unstable', () => {
    const explainer = new GovernanceExplainer();
    const hardeningResult = createMockHardeningResult({
      domSettling: {
        sessionId: 'session-1',
        status: 'unstable',
        snapshotSequence: [],
        stabilizationCheckCount: 3,
        mutationCountStabilized: false,
        layoutStabilized: false,
        renderLoopDetected: false,
        continuouslyMutatingContainers: [],
        hydrationInstabilityDetected: false,
        settledAt: 0,
      },
      overallStable: false,
    });

    const report = explainer.explain(
      createMockGovernanceResult(),
      createMockRuntimeResult(),
      hardeningResult,
      {
        minStaticValidationConfidence: 0.5,
        minRuntimeConfidence: 0.6,
        requireUniqueness: true,
        requireReplayConsistency: true,
      },
    );

    expect(report.runtimeInstabilityConcerns.length).toBeGreaterThan(0);
    expect(report.runtimeInstabilityConcerns[0]).toContain('unstable');
  });
});

describe('ReplayEvidenceRenderer', () => {
  it('renders replay evidence deterministically', () => {
    const renderer = new ReplayEvidenceRenderer();
    const report = renderer.render(createMockRuntimeResult());

    expect(report.reviewId).toBeDefined();
    expect(report.replayPathSummary.totalSteps).toBe(3);
    expect(report.replayPathSummary.successfulSteps).toBe(3);
    expect(report.replayPathSummary.failedSteps).toBe(0);
    expect(report.replayPathSummary.divergedSteps).toBe(0);
    expect(report.navigationFlow).toContain('https://example.com');
    expect(report.divergenceEvidence.length).toBe(0);
    expect(report.renderedEvidence).toContain('Replay Evidence Report');
  });

  it('includes divergence evidence when present', () => {
    const renderer = new ReplayEvidenceRenderer();
    const runtimeResult = createMockRuntimeResult({
      replayDivergence: [
        { type: 'url-mismatch', stepIndex: 1, expected: 'https://a.com', actual: 'https://b.com' },
      ],
    });

    const report = renderer.render(runtimeResult);
    expect(report.replayPathSummary.divergedSteps).toBe(1);
    expect(report.divergenceEvidence.length).toBe(1);
    expect(report.divergenceEvidence[0].type).toBe('url-mismatch');
    expect(report.renderedEvidence).toContain('Divergence Evidence');
  });

  it('detects unstable execution warnings', () => {
    const renderer = new ReplayEvidenceRenderer();
    const runtimeResult = createMockRuntimeResult({
      falsePositiveIndicators: [
        { type: 'hidden-element', stepIndex: 0, detail: 'Element is hidden' },
        { type: 'detached-element', stepIndex: 1, detail: 'Element is detached' },
      ],
    });

    const report = renderer.render(runtimeResult);
    expect(report.unstableExecutionWarnings.length).toBe(2);
    expect(report.renderedEvidence).toContain('Unstable Execution Warnings');
  });
});

describe('ConfidenceBreakdownRenderer', () => {
  it('renders confidence breakdown deterministically', () => {
    const renderer = new ConfidenceBreakdownRenderer();
    const report = renderer.render(
      {
        overall: 0.85,
        survivabilityScore: 0.8,
        structuralSimilarity: 0.9,
        attributeMatchScore: 0.85,
        hierarchyStability: 0.75,
        replayContextConfidence: 0.8,
      },
      createMockValidationResult(),
      createMockRuntimeResult(),
      createMockGovernanceResult(),
    );

    expect(report.reviewId).toBeDefined();
    expect(report.confidenceComposition.overall).toBe(0.85);
    expect(report.structuralWeighting.survivabilityScore).toBe(0.8);
    expect(report.runtimeWeighting.runtimeConfidence).toBe(0.8);
    expect(report.replayWeighting.replayConfidence).toBe(0.85);
    expect(report.governanceAdjustments.gatesPassed).toBe(4);
    expect(report.governanceAdjustments.gatesFailed).toBe(0);
    expect(report.renderedBreakdown).toContain('Confidence Breakdown');
  });

  it('includes governance adjustments when gates fail', () => {
    const renderer = new ConfidenceBreakdownRenderer();
    const governanceResult = createMockGovernanceResult({
      passed: false,
      gates: [
        { gate: 'min-static-confidence', passed: false, detail: 'Below threshold' },
        { gate: 'uniqueness', passed: true, detail: 'All proposals are unique' },
      ],
    });

    const report = renderer.render(
      {
        overall: 0.85,
        survivabilityScore: 0.8,
        structuralSimilarity: 0.9,
        attributeMatchScore: 0.85,
        hierarchyStability: 0.75,
        replayContextConfidence: 0.8,
      },
      createMockValidationResult(),
      createMockRuntimeResult(),
      governanceResult,
    );

    expect(report.governanceAdjustments.gatesPassed).toBe(1);
    expect(report.governanceAdjustments.gatesFailed).toBe(1);
    expect(report.governanceAdjustments.adjustments.length).toBe(1);
  });
});

describe('RollbackReview', () => {
  it('renders rollback review deterministically', () => {
    const rollbackReview = new RollbackReview();
    const report = rollbackReview.review(
      createMockRollbackMeta(),
      createMockPatchProposal(),
      createMockValidationResult(),
    );

    expect(report.reviewId).toBeDefined();
    expect(report.rollbackAvailability).toBe(true);
    expect(report.rollbackVerification.reversalCodeValid).toBe(true);
    expect(report.rollbackVerification.originalLocatorPreserved).toBe(true);
    expect(report.patchReversibility.reversible).toBe(true);
    expect(report.renderedRollback).toContain('Rollback Review');
  });

  it('computes simple reversal complexity for single line change', () => {
    const rollbackReview = new RollbackReview();
    const proposal = createMockPatchProposal({
      patchDiff: {
        unifiedDiff: '@@ -1,1 +1,1 @@',
        beforeSnippet: 'old',
        afterSnippet: 'new',
        beforeStartLine: 0,
        beforeEndLine: 0,
        afterStartLine: 0,
        afterEndLine: 0,
        addedLines: 1,
        removedLines: 0,
      },
    });

    const report = rollbackReview.review(createMockRollbackMeta(), proposal, createMockValidationResult());
    expect(report.patchReversibility.reversalComplexity).toBe('simple');
  });

  it('computes high risk when validation fails', () => {
    const rollbackReview = new RollbackReview();
    const validation = createMockValidationResult({ status: 'failed' });

    const report = rollbackReview.review(createMockRollbackMeta(), createMockPatchProposal(), validation);
    expect(report.patchReversibility.riskLevel).toBe('high');
  });
});

describe('MutationRiskVisualizer', () => {
  it('renders mutation risk deterministically', () => {
    const visualizer = new MutationRiskVisualizer();
    const report = visualizer.visualize(
      createMockHardeningResult(),
      createMockRuntimeResult(),
      createMockPatchProposal(),
    );

    expect(report.reviewId).toBeDefined();
    expect(report.selectorInstability.riskLevel).toBe('low');
    expect(report.replayFragility.riskLevel).toBe('low');
    expect(report.structuralMutationRisk.riskLevel).toBe('low');
    expect(report.asyncInstability.riskLevel).toBe('low');
    expect(report.iframeModalInstability.riskLevel).toBe('low');
    expect(report.overallRiskLevel).toBe('low');
    expect(report.renderedVisualization).toContain('Mutation Risk Visualization');
  });

  it('detects high selector instability with multiple matches', () => {
    const visualizer = new MutationRiskVisualizer();
    const runtimeResult = createMockRuntimeResult({
      falsePositiveIndicators: [
        { type: 'multiple-matches', stepIndex: 0, detail: 'Multiple matches' },
        { type: 'hidden-element', stepIndex: 0, detail: 'Hidden element' },
        { type: 'detached-element', stepIndex: 0, detail: 'Detached element' },
      ],
    });

    const report = visualizer.visualize(createMockHardeningResult(), runtimeResult, createMockPatchProposal());
    expect(report.selectorInstability.riskLevel).toBe('high');
  });

  it('detects high replay fragility with multiple divergences', () => {
    const visualizer = new MutationRiskVisualizer();
    const runtimeResult = createMockRuntimeResult({
      replayDivergence: [
        { type: 'url-mismatch', stepIndex: 0, expected: 'a', actual: 'b' },
        { type: 'element-missing', stepIndex: 1, expected: 'c', actual: 'd' },
        { type: 'interaction-failed', stepIndex: 2, expected: 'e', actual: 'f' },
      ],
    });

    const report = visualizer.visualize(createMockHardeningResult(), runtimeResult, createMockPatchProposal());
    expect(report.replayFragility.riskLevel).toBe('high');
    expect(report.replayFragility.divergenceCount).toBe(3);
  });

  it('detects async instability', () => {
    const visualizer = new MutationRiskVisualizer();
    const hardeningResult = createMockHardeningResult({
      asyncRender: {
        sessionId: 'session-1',
        observations: [],
        totalAsyncRenders: 2,
        completedRenders: 1,
        incompleteRenders: 1,
        reRenderChurnDetected: true,
        skeletonReplacements: 0,
        virtualizedListInstability: 0,
        detectedAt: 0,
      },
    });

    const report = visualizer.visualize(hardeningResult, createMockRuntimeResult(), createMockPatchProposal());
    expect(report.asyncInstability.riskLevel).toBe('high');
  });

  it('computes critical overall risk when all factors are high', () => {
    const visualizer = new MutationRiskVisualizer();
    const hardeningResult = createMockHardeningResult({
      asyncRender: {
        sessionId: 'session-1',
        observations: [],
        totalAsyncRenders: 2,
        completedRenders: 1,
        incompleteRenders: 1,
        reRenderChurnDetected: true,
        skeletonReplacements: 0,
        virtualizedListInstability: 0,
        detectedAt: 0,
      },
      frameModal: {
        sessionId: 'session-1',
        frames: [],
        modals: [],
        nestedFrameCount: 2,
        modalTransitionCount: 2,
        focusTrapViolations: 1,
        overlayInterceptions: 1,
        stabilityPassed: false,
        detectedAt: 0,
      },
      domSettling: {
        sessionId: 'session-1',
        status: 'unstable',
        snapshotSequence: [],
        stabilizationCheckCount: 3,
        mutationCountStabilized: false,
        layoutStabilized: false,
        renderLoopDetected: false,
        continuouslyMutatingContainers: [],
        hydrationInstabilityDetected: false,
        settledAt: 0,
      },
    });
    const runtimeResult = createMockRuntimeResult({
      falsePositiveIndicators: [
        { type: 'multiple-matches', stepIndex: 0, detail: 'Multiple matches' },
        { type: 'hidden-element', stepIndex: 0, detail: 'Hidden element' },
        { type: 'detached-element', stepIndex: 0, detail: 'Detached element' },
      ],
      replayDivergence: [
        { type: 'url-mismatch', stepIndex: 0, expected: 'a', actual: 'b' },
        { type: 'element-missing', stepIndex: 1, expected: 'c', actual: 'd' },
        { type: 'interaction-failed', stepIndex: 2, expected: 'e', actual: 'f' },
      ],
    });
    const proposal = createMockPatchProposal({
      patchDiff: {
        unifiedDiff: '@@ -1,5 +1,5 @@',
        beforeSnippet: 'old',
        afterSnippet: 'new',
        beforeStartLine: 0,
        beforeEndLine: 4,
        afterStartLine: 0,
        afterEndLine: 4,
        addedLines: 5,
        removedLines: 5,
      },
    });

    const report = visualizer.visualize(hardeningResult, runtimeResult, proposal);
    expect(report.overallRiskLevel).toBe('critical');
  });
});

describe('Deterministic Rendering', () => {
  it('produces same text output for same input', () => {
    const renderer = new ReviewRenderer();
    const report1 = renderer.render(
      "page.locator('#submit-btn')",
      "page.getByRole('button', { name: 'Submit' })",
      'attribute-similarity',
      createMockValidationResult(),
      createMockRuntimeResult(),
      createMockHardeningResult(),
      createMockGovernanceResult(),
      createMockRollbackMeta(),
      createMockExplanation(),
    );
    const report2 = renderer.render(
      "page.locator('#submit-btn')",
      "page.getByRole('button', { name: 'Submit' })",
      'attribute-similarity',
      createMockValidationResult(),
      createMockRuntimeResult(),
      createMockHardeningResult(),
      createMockGovernanceResult(),
      createMockRollbackMeta(),
      createMockExplanation(),
    );

    const text1 = renderer.renderText(report1).replace(/Review ID: review-\d+/, 'Review ID: review-X');
    const text2 = renderer.renderText(report2).replace(/Review ID: review-\d+/, 'Review ID: review-X');

    expect(text1).toBe(text2);
  });
});
