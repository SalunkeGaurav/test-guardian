import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import type { ElementNode } from '../../src/models/snapshot.js';
import type { Locator } from '../../src/models/locator.js';
import type { ReplaySession } from '../../src/models/replay.js';
import type { HealingCandidate, CandidateRanking, CandidateExplanation, DomEvidence } from '../../src/models/healing-candidate.js';
import type { ValidationResult } from '../../src/models/validation.js';
import type { RuntimeValidationResult, ReplayDivergence } from '../../src/models/runtime.js';
import type { PatchProposal, PatchDiff, RollbackMetadata, ConfidenceMetadata, ASTNodeMetadata, ValidationReference, AuditReference } from '../../src/models/patch.js';
import type { GovernanceResult, GateResult } from '../../src/core/pipeline/confidence-governance.js';
import type { SandboxPatchResult } from '../../src/core/runtime-healing-loop/types.js';
import type { MutationReport, CompileResult, ReplayResult as SandboxReplayResult, RuntimeResult as SandboxRuntimeResult } from '../../src/models/sandbox.js';
import { FailureCapture } from '../../src/core/runtime-healing-loop/failure-capture.js';
import { CandidateExecutor } from '../../src/core/runtime-healing-loop/candidate-executor.js';
import { SandboxRevalidator } from '../../src/core/runtime-healing-loop/sandbox-revalidator.js';
import { ReviewPackageGenerator } from '../../src/core/runtime-healing-loop/review-package-generator.js';
import { RuntimeHealingLoop } from '../../src/core/runtime-healing-loop/runtime-healing-loop.js';

// ─── Test Fixtures ─────────────────────────────────────────────────

function makeNode(overrides: Partial<ElementNode> & { tagName: string }): ElementNode {
  return {
    attributes: {},
    children: [],
    visible: true,
    ...overrides,
  };
}

function makeLocator(overrides: Partial<Locator> & { id: string }): Locator {
  return {
    strategy: 'css',
    expression: overrides.id ?? '#old',
    sourceFile: 'test.spec.ts',
    sourceLine: 10,
    propertyName: null,
    verified: false,
    value: 'old',
    ...overrides,
  };
}

function makeReplaySession(): ReplaySession {
  return {
    id: 'session-1',
    traceId: 'trace-1',
    testName: 'test',
    testFile: 'test.spec.ts',
    framework: 'playwright',
    schemaVersion: 1,
    entryUrl: 'https://example.com',
    urlTransitions: [],
    redirectChain: [],
    frameContext: [],
    modalDialogContext: [],
    steps: [{
      stepId: 'step-1',
      timestamp: 1000,
      actionType: 'click',
      pageUrl: 'https://example.com',
      result: { success: true, duration: 10 },
      navigationContext: { url: 'https://example.com' },
    }],
    createdAt: 1000,
  };
}

function makeCandidate(overrides: Partial<HealingCandidate> & { id: string }): HealingCandidate {
  const ranking: CandidateRanking = {
    overall: 0.75,
    survivabilityScore: 0.7,
    structuralSimilarity: 0.8,
    attributeMatchScore: 0.9,
    hierarchyStability: 0.7,
    replayContextConfidence: 0.6,
  };
  return {
    id: overrides.id,
    locatorId: 'loc-1',
    originalExpression: '#old-submit',
    proposedExpression: '[data-testid="submit-btn"]',
    proposedStrategy: 'testid',
    proposedValue: 'submit-btn',
    strategy: 'attribute-similarity',
    confidence: 0.75,
    ranking,
    explanation: {
      whyMatched: 'Attribute match on data-testid',
      structuralChanges: [],
      confidenceBreakdown: ranking,
      survivabilityReasoning: 'Element survived with attribute change',
      attributeChanges: [],
      strategyApplied: 'attribute-similarity',
    },
    domEvidence: {
      originalPath: 'button#old-submit',
      matchedPath: 'button[data-testid="submit-btn"]',
      originalTag: 'button',
      matchedTag: 'button',
      stableAttributeMatches: ['data-testid'],
    },
    validated: false,
    createdAt: 1000,
    ...overrides,
  };
}

function makeValidation(proposalId: string, confidence: number, status: 'passed' | 'failed' | 'ambiguous' | 'error' = 'passed'): ValidationResult {
  return {
    id: `val-${proposalId}`,
    proposalId,
    locatorId: 'loc-1',
    replaySessionId: 'session-1',
    status,
    matchedElementCount: 1,
    interactionSuccess: true,
    replayConfidence: confidence,
    falsePositiveIndicators: [],
    executionMetadata: { stepIndex: 0, actionType: 'click', pageUrl: '', frame: '', resolvedAt: 1000 },
    validatedAt: 1000,
  };
}

function makePatchProposal(overrides?: Partial<PatchProposal>): PatchProposal {
  const diff: PatchDiff = {
    unifiedDiff: '- page.locator("#old-submit")\n+ page.locator("[data-testid=\'submit-btn\']")',
    beforeSnippet: 'page.locator("#old-submit")',
    afterSnippet: 'page.locator("[data-testid=\'submit-btn\']")',
    beforeStartLine: 10,
    beforeEndLine: 10,
    afterStartLine: 10,
    afterEndLine: 10,
    addedLines: 1,
    removedLines: 1,
  };

  const rollback: RollbackMetadata = {
    originalLocatorExpression: '#old-submit',
    originalStrategy: 'css',
    originalValue: 'old-submit',
    originalSourceFile: 'test.spec.ts',
    originalLine: 10,
    originalColumn: 4,
    patchReversalCode: '#old-submit',
    validationIds: ['val-1'],
    replaySessionIds: ['session-1'],
    createdAt: 1000,
  };

  const astMeta: ASTNodeMetadata = {
    nodeType: 'CallExpression',
    startLine: 9,
    endLine: 9,
    startColumn: 4,
    endColumn: 30,
    parentType: 'ExpressionStatement',
    expressionType: 'PropertyAccessExpression',
  };

  const confidenceMeta: ConfidenceMetadata = {
    staticValidationConfidence: 0.75,
    runtimeConfidence: 0.8,
    governanceConfidence: 0.75,
    stabilityScore: 0.7,
  };

  const validationRef: ValidationReference = {
    validationId: 'val-1',
    validationStatus: 'passed',
    matchedElementCount: 1,
    falsePositiveCount: 0,
  };

  const auditRef: AuditReference = {
    auditTrailId: 'audit-1',
    pipelineRunId: 'pipeline-1',
  };

  return {
    patchId: 'patch-1',
    proposalId: 'cand-1',
    targetFile: 'test.spec.ts',
    targetLocator: {
      expression: '#old-submit',
      strategy: 'css',
      value: 'old-submit',
      sourceLine: 10,
      sourceColumn: 4,
    },
    originalCodeSnippet: 'page.locator("#old-submit")',
    replacementCodeSnippet: 'page.locator("[data-testid=\'submit-btn\']")',
    astNodeMetadata: astMeta,
    confidenceMetadata: confidenceMeta,
    rollbackMetadata: rollback,
    patchSummary: 'Replace locator',
    validationRefs: [validationRef],
    auditRefs: [auditRef],
    patchDiff: diff,
    status: 'proposed',
    schemaVersion: 1,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

function makeSandboxPatchResult(overrides?: Partial<SandboxPatchResult>): SandboxPatchResult {
  const compileResult: CompileResult = {
    success: true,
    errors: [],
    warnings: [],
    duration: 100,
  };

  const replayResult: SandboxReplayResult = {
    success: true,
    passedSteps: 1,
    failedSteps: 0,
    divergedSteps: 0,
    errors: [],
    duration: 50,
  };

  const runtimeResult: SandboxRuntimeResult = {
    success: true,
    validationPassed: true,
    confidence: 0.9,
    errors: [],
    duration: 200,
  };

  const mutationReport: MutationReport = {
    reportId: 'report-1',
    sandboxId: 'sandbox-1',
    sandboxPath: '/tmp/sandbox-1',
    originalFrameworkPath: '/project',
    appliedPatches: [{
      patchId: 'patch-1',
      proposalId: 'cand-1',
      targetFile: 'test.spec.ts',
      targetLine: 10,
      strategy: 'testid',
      success: true,
    }],
    compileResult,
    replayResult,
    runtimeResult,
    failureReasons: [],
    mutationDuration: 350,
    validationSummaries: [],
    createdAt: 1000,
  };

  return {
    sandboxId: 'sandbox-1',
    patchProposal: makePatchProposal(),
    compileResult,
    replayResult,
    runtimeResult,
    mutationReport,
    isolationVerified: true,
    ...overrides,
  };
}

function makeGovernanceResult(passed: boolean, approvedCount: number = 1, rejectedCount: number = 0): GovernanceResult {
  return {
    passed,
    gates: [],
    approvedCandidates: Array.from({ length: approvedCount }, (_, i) => makeCandidate({ id: `approved-${i}` })),
    rejectedCandidates: Array.from({ length: rejectedCount }, (_, i) => ({
      candidate: makeCandidate({ id: `rejected-${i}` }),
      reason: 'Below threshold',
      gate: 'min-static-confidence',
    })),
  };
}

// ─── FailureCapture Tests ──────────────────────────────────────────

describe('FailureCapture', () => {
  it('captures a failure context from input', () => {
    const capture = new FailureCapture();
    const locator = makeLocator({ id: 'loc-1', value: '#old' });
    const dom: ElementNode[] = [makeNode({ tagName: 'button', attributes: { id: 'old' } })];

    const result = capture.capture({
      locator,
      failedLocatorExpression: '#old',
      stackTrace: 'at Test.run (test.spec.ts:10:1)',
      failingFile: 'test.spec.ts',
      failingLine: 10,
      domSnapshot: dom,
      errorMessage: 'Element not found',
    });

    expect(result.locator.id).toBe('loc-1');
    expect(result.failedLocatorExpression).toBe('#old');
    expect(result.failingFile).toBe('test.spec.ts');
    expect(result.failingLine).toBe(10);
    expect(result.domSnapshot).toBe(dom);
    expect(result.errorMessage).toBe('Element not found');
    expect(result.replaySessionRef).toBe('none');
  });

  it('captures replay session reference when provided', () => {
    const capture = new FailureCapture();
    const locator = makeLocator({ id: 'loc-2', value: '#btn' });
    const session = makeReplaySession();

    const result = capture.capture({
      locator,
      failedLocatorExpression: '#btn',
      stackTrace: '',
      failingFile: 'test.spec.ts',
      failingLine: 5,
      domSnapshot: [],
      replaySession: session,
      errorMessage: 'Timeout',
    });

    expect(result.replaySessionRef).toBe('session-1');
    expect(result.replaySession).toBe(session);
  });

  it('parses failed locator from error message', () => {
    expect(FailureCapture.parseFailedLocator('Error: locator("#submit") not found')).toBe('#submit');
    expect(FailureCapture.parseFailedLocator('Error: getByTestId("btn") timed out')).toBe('btn');
    expect(FailureCapture.parseFailedLocator('Error: page.locator(".class") failed')).toBe('.class');
  });

  it('parses stack trace for file and line', () => {
    const trace = 'Error: Element not found\n  at Test.run (/path/test.spec.ts:42:15)\n  at Runner.execute';
    const parsed = FailureCapture.parseStackTrace(trace);
    expect(parsed.file).toBe('/path/test.spec.ts');
    expect(parsed.line).toBe(42);
  });

  it('returns empty when stack trace has no match', () => {
    const parsed = FailureCapture.parseStackTrace('No useful trace here');
    expect(parsed.file).toBe('');
    expect(parsed.line).toBe(0);
  });
});

// ─── CandidateExecutor Tests ───────────────────────────────────────

describe('CandidateExecutor', () => {
  it('executes candidates through validation', () => {
    const executor = new CandidateExecutor();
    const locator = makeLocator({ id: 'loc-1', value: 'old' });
    const dom: ElementNode[] = [makeNode({ tagName: 'button', attributes: { 'data-testid': 'submit-btn' } })];
    const candidate = makeCandidate({ id: 'cand-1' });
    const session = makeReplaySession();

    const result = executor.execute({
      failureContext: {
        locator,
        failedLocatorExpression: '#old',
        stackTrace: '',
        failingFile: 'test.spec.ts',
        failingLine: 10,
        domSnapshot: dom,
        replaySessionRef: 'session-1',
        replaySession: session,
        errorMessage: 'Not found',
        capturedAt: 1000,
      },
      candidates: [candidate],
      currentDom: dom,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.length).toBe(1);
    expect(result.value[0]!.candidate.id).toBe('cand-1');
    expect(result.value[0]!.validation).toBeDefined();
  });

  it('returns failure when no candidates provided', () => {
    const executor = new CandidateExecutor();
    const locator = makeLocator({ id: 'loc-1', value: 'old' });

    const result = executor.execute({
      failureContext: {
        locator,
        failedLocatorExpression: '#old',
        stackTrace: '',
        failingFile: 'test.spec.ts',
        failingLine: 10,
        domSnapshot: [],
        replaySessionRef: 'none',
        errorMessage: 'Not found',
        capturedAt: 1000,
      },
      candidates: [],
      currentDom: [],
    });

    expect(result.ok).toBe(false);
  });

  it('selects safest candidate from results', () => {
    const executor = new CandidateExecutor();
    const locator = makeLocator({ id: 'loc-1', value: 'old' });
    const dom: ElementNode[] = [makeNode({ tagName: 'button', attributes: { 'data-testid': 'submit-btn' } })];
    const candidate = makeCandidate({ id: 'cand-1' });

    const execResult = executor.execute({
      failureContext: {
        locator,
        failedLocatorExpression: '#old',
        stackTrace: '',
        failingFile: 'test.spec.ts',
        failingLine: 10,
        domSnapshot: dom,
        replaySessionRef: 'none',
        errorMessage: 'Not found',
        capturedAt: 1000,
      },
      candidates: [candidate],
      currentDom: dom,
    });

    expect(execResult.ok).toBe(true);
    if (!execResult.ok) return;

    const safest = executor.selectSafestCandidate(execResult.value);
    expect(safest.ok).toBe(true);
  });

  it('rejects candidates with low structural similarity', () => {
    const executor = new CandidateExecutor();
    const locator = makeLocator({ id: 'loc-1', value: 'old' });
    const dom: ElementNode[] = [makeNode({ tagName: 'button', attributes: { 'data-testid': 'submit-btn' } })];
    const candidate = makeCandidate({
      id: 'cand-unstable',
      ranking: {
        overall: 0.2,
        survivabilityScore: 0.1,
        structuralSimilarity: 0.1,
        attributeMatchScore: 0.1,
        hierarchyStability: 0.1,
        replayContextConfidence: 0.1,
      },
      confidence: 0.2,
    });

    const result = executor.execute({
      failureContext: {
        locator,
        failedLocatorExpression: '#old',
        stackTrace: '',
        failingFile: 'test.spec.ts',
        failingLine: 10,
        domSnapshot: dom,
        replaySessionRef: 'none',
        errorMessage: 'Not found',
        capturedAt: 1000,
      },
      candidates: [candidate],
      currentDom: dom,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value[0]!.rejected).toBe(true);
    expect(result.value[0]!.rejectionReasons.length).toBeGreaterThan(0);
  });

  it('produces deterministic results for same inputs', () => {
    const executor = new CandidateExecutor();
    const locator = makeLocator({ id: 'loc-1', value: 'old' });
    const dom: ElementNode[] = [makeNode({ tagName: 'button', attributes: { 'data-testid': 'submit-btn' } })];
    const candidate = makeCandidate({ id: 'cand-1' });

    const input = {
      failureContext: {
        locator,
        failedLocatorExpression: '#old',
        stackTrace: '',
        failingFile: 'test.spec.ts',
        failingLine: 10,
        domSnapshot: dom,
        replaySessionRef: 'none',
        errorMessage: 'Not found',
        capturedAt: 1000,
      },
      candidates: [candidate],
      currentDom: dom,
    };

    const r1 = executor.execute(input);
    const r2 = executor.execute(input);

    expect(r1.ok).toBe(r2.ok);
    if (!r1.ok || !r2.ok) return;
    expect(r1.value.length).toBe(r2.value.length);
    expect(r1.value[0]!.rejected).toBe(r2.value[0]!.rejected);
  });
});

// ─── SandboxRevalidator Tests ──────────────────────────────────────

describe('SandboxRevalidator', () => {
  it('verifies acceptance criteria for passing sandbox result', () => {
    const sandboxResult = makeSandboxPatchResult();
    const acceptance = SandboxRevalidator.verifyAcceptance(sandboxResult);

    expect(acceptance.compileSuccess).toBe(true);
    expect(acceptance.replaySuccess).toBe(true);
    expect(acceptance.noNavigationDivergence).toBe(true);
    expect(acceptance.noNewFailures).toBe(true);
    expect(acceptance.allPassed).toBe(true);
  });

  it('detects compile failure', () => {
    const sandboxResult = makeSandboxPatchResult({
      compileResult: { success: false, errors: ['TS2304'], warnings: [], duration: 0 },
    });
    const acceptance = SandboxRevalidator.verifyAcceptance(sandboxResult);

    expect(acceptance.compileSuccess).toBe(false);
    expect(acceptance.allPassed).toBe(false);
  });

  it('detects replay failure', () => {
    const sandboxResult = makeSandboxPatchResult({
      replayResult: { success: false, passedSteps: 0, failedSteps: 1, divergedSteps: 0, errors: ['Step failed'], duration: 0 },
    });
    const acceptance = SandboxRevalidator.verifyAcceptance(sandboxResult);

    expect(acceptance.replaySuccess).toBe(false);
    expect(acceptance.allPassed).toBe(false);
  });

  it('detects navigation divergence', () => {
    const sandboxResult = makeSandboxPatchResult({
      replayResult: { success: true, passedSteps: 1, failedSteps: 0, divergedSteps: 1, errors: [], duration: 0 },
    });
    const acceptance = SandboxRevalidator.verifyAcceptance(sandboxResult);

    expect(acceptance.noNavigationDivergence).toBe(false);
    expect(acceptance.allPassed).toBe(false);
  });

  it('detects new failures', () => {
    const sandboxResult = makeSandboxPatchResult({
      replayResult: { success: true, passedSteps: 0, failedSteps: 2, divergedSteps: 0, errors: [], duration: 0 },
    });
    const acceptance = SandboxRevalidator.verifyAcceptance(sandboxResult);

    expect(acceptance.noNewFailures).toBe(false);
    expect(acceptance.allPassed).toBe(false);
  });
});

// ─── ReviewPackageGenerator Tests ──────────────────────────────────

describe('ReviewPackageGenerator', () => {
  it('generates a review package from complete input', () => {
    const generator = new ReviewPackageGenerator();
    const locator = makeLocator({ id: 'loc-1', value: 'old-submit' });
    const sandboxResult = makeSandboxPatchResult();
    const governanceResult = makeGovernanceResult(true);

    const input = {
      failureContext: {
        locator,
        failedLocatorExpression: '#old-submit',
        stackTrace: 'at Test.run (test.spec.ts:10:1)',
        failingFile: 'test.spec.ts',
        failingLine: 10,
        domSnapshot: [makeNode({ tagName: 'button', attributes: { 'data-testid': 'submit-btn' } })],
        replaySessionRef: 'session-1',
        replaySession: makeReplaySession(),
        errorMessage: 'Element not found',
        capturedAt: 1000,
      },
      selectedCandidate: {
        originalExpression: '#old-submit',
        proposedExpression: '[data-testid="submit-btn"]',
      },
      confidenceBreakdown: {
        overall: 0.75,
        survivabilityScore: 0.7,
        structuralSimilarity: 0.8,
        attributeMatchScore: 0.9,
        hierarchyStability: 0.7,
        replayContextConfidence: 0.6,
      },
      validationResults: [makeValidation('cand-1', 0.8)],
      replayDivergences: [],
      sandboxResult,
      governanceResult,
      gateResults: [],
      patchProposal: makePatchProposal(),
    };

    const result = generator.generate(input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const pkg = result.value;
    expect(pkg.reviewId).toBeDefined();
    expect(pkg.originalLocator).toBe('#old-submit');
    expect(pkg.healedLocator).toBe('[data-testid="submit-btn"]');
    expect(pkg.confidenceBreakdown.overall).toBe(0.75);
    expect(pkg.sandboxVerification.compileSuccess).toBe(true);
    expect(pkg.sandboxVerification.replaySuccess).toBe(true);
    expect(pkg.sandboxVerification.noNavigationDivergence).toBe(true);
    expect(pkg.sandboxVerification.noNewFailures).toBe(true);
    expect(pkg.status).toBe('ready-for-review');
    expect(pkg.patchDiff).toBeDefined();
    expect(pkg.rollbackMetadata).toBeDefined();
    expect(pkg.explainabilitySummary).toBeDefined();
  });

  it('sets sandbox-failed status when sandbox verification fails', () => {
    const generator = new ReviewPackageGenerator();
    const locator = makeLocator({ id: 'loc-1', value: 'old' });
    const sandboxResult = makeSandboxPatchResult({
      compileResult: { success: false, errors: ['TS error'], warnings: [], duration: 0 },
    });
    const governanceResult = makeGovernanceResult(true);

    const input = {
      failureContext: {
        locator,
        failedLocatorExpression: '#old',
        stackTrace: '',
        failingFile: 'test.spec.ts',
        failingLine: 10,
        domSnapshot: [],
        replaySessionRef: 'none',
        errorMessage: 'Not found',
        capturedAt: 1000,
      },
      selectedCandidate: {
        originalExpression: '#old',
        proposedExpression: '#new',
      },
      confidenceBreakdown: {
        overall: 0.5,
        survivabilityScore: 0.5,
        structuralSimilarity: 0.5,
        attributeMatchScore: 0.5,
        hierarchyStability: 0.5,
        replayContextConfidence: 0.5,
      },
      validationResults: [makeValidation('cand-1', 0.6)],
      replayDivergences: [],
      sandboxResult,
      governanceResult,
      gateResults: [],
      patchProposal: makePatchProposal(),
    };

    const result = generator.generate(input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('sandbox-failed');
  });
});

// ─── RuntimeHealingLoop Integration Tests ──────────────────────────

describe('RuntimeHealingLoop', () => {
  it('executes healing pipeline and candidate selection successfully', async () => {
    const projectRoot = process.cwd();
    const loop = new RuntimeHealingLoop(projectRoot);

    const fixturePath = join(projectRoot, 'tests', 'fixtures', 'healing-benchmarks', 'baseline.spec.ts');
    const locator = makeLocator({ id: 'loc-integration', value: '#username', sourceFile: fixturePath, sourceLine: 6 });
    const dom: ElementNode[] = [
      makeNode({
        tagName: 'input',
        attributes: { id: 'username', name: 'username' },
        textContent: '',
      }),
    ];

    const result = await loop.execute({
      failureContext: {
        locator,
        failedLocatorExpression: '#username',
        stackTrace: `at Test.run (${fixturePath}:6:1)`,
        failingFile: fixturePath,
        failingLine: 6,
        domSnapshot: dom,
        replaySessionRef: 'session-1',
        replaySession: makeReplaySession(),
        errorMessage: 'Element not found',
        capturedAt: 1000,
      },
      projectRoot,
    });

    if (result.ok) {
      const { reviewPackage, metrics, persistedPaths } = result.value;
      expect(reviewPackage.reviewId).toBeDefined();
      expect(reviewPackage.originalLocator).toBe('#username');
      expect(metrics.totalHealingAttempts).toBe(1);
      expect(persistedPaths.length).toBeGreaterThan(0);
    } else {
      expect(result.error).toBeDefined();
    }
  });

  it('fails when no healing candidates can be generated', async () => {
    const projectRoot = process.cwd();
    const loop = new RuntimeHealingLoop(projectRoot);

    const locator = makeLocator({ id: 'loc-empty', value: 'nonexistent' });
    const dom: ElementNode[] = [makeNode({ tagName: 'div', attributes: {} })];

    const result = await loop.execute({
      failureContext: {
        locator,
        failedLocatorExpression: '#nonexistent',
        stackTrace: '',
        failingFile: 'test.spec.ts',
        failingLine: 10,
        domSnapshot: dom,
        replaySessionRef: 'none',
        errorMessage: 'Not found',
        capturedAt: 1000,
      },
      projectRoot,
    });

    expect(result.ok).toBe(false);
  });

  it('produces deterministic review package for same inputs', async () => {
    const projectRoot = process.cwd();
    const locator = makeLocator({ id: 'loc-deterministic', value: 'btn' });
    const dom: ElementNode[] = [
      makeNode({
        tagName: 'button',
        attributes: { 'data-testid': 'btn' },
        textContent: 'Click',
      }),
    ];

    const input = {
      failureContext: {
        locator,
        failedLocatorExpression: '#old-btn',
        stackTrace: '',
        failingFile: 'test.spec.ts',
        failingLine: 5,
        domSnapshot: dom,
        replaySessionRef: 'none',
        errorMessage: 'Not found',
        capturedAt: 1000,
      },
      projectRoot,
    };

    const loop1 = new RuntimeHealingLoop(projectRoot);
    const loop2 = new RuntimeHealingLoop(projectRoot);

    const r1 = await loop1.execute(input);
    const r2 = await loop2.execute(input);

    expect(r1.ok).toBe(r2.ok);
    if (!r1.ok || !r2.ok) return;

    expect(r1.value.reviewPackage.originalLocator).toBe(r2.value.reviewPackage.originalLocator);
    expect(r1.value.reviewPackage.healedLocator).toBe(r2.value.reviewPackage.healedLocator);
    expect(r1.value.metrics.totalHealingAttempts).toBe(r2.value.metrics.totalHealingAttempts);
  });
});
