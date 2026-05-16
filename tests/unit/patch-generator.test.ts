import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { HealingCandidate } from '../../src/models/healing-candidate.js';
import type { ValidationResult } from '../../src/models/validation.js';
import type { ElementNode } from '../../src/models/snapshot.js';
import type { ReplaySession, ReplayStep } from '../../src/models/replay.js';
import { PatchDiffEngine } from '../../src/core/patcher/patch-diff-engine.js';
import { PatchSafetyValidator } from '../../src/core/patcher/patch-safety-validator.js';
import { PatchGenerator } from '../../src/core/patcher/patch-generator.js';
import { PatchStorage } from '../../src/core/patcher/patch-storage.js';
import { PATCH_SCHEMA_VERSION, PATCH_STORAGE_DIR } from '../../src/models/patch.js';
import type { PatchProposal } from '../../src/models/patch.js';

// ─── Helpers ────────────────────────────────────────────────────────

function makeCandidate(overrides: Partial<HealingCandidate>): HealingCandidate {
  return {
    id: 'cand-1',
    locatorId: 'loc-1',
    originalExpression: "page.getByTestId('submit')",
    proposedExpression: "page.getByRole('button', { name: 'Submit' })",
    proposedStrategy: 'role',
    proposedValue: "button, { name: 'Submit' }",
    strategy: 'attribute-similarity',
    confidence: 0.85,
    ranking: { overall: 0.85, survivabilityScore: 0.8, structuralSimilarity: 0.7, attributeMatchScore: 0.9, hierarchyStability: 0.8, replayContextConfidence: 0.9 },
    explanation: {
      whyMatched: 'Role and name match',
      structuralChanges: [],
      confidenceBreakdown: { overall: 0.85, survivabilityScore: 0.8, structuralSimilarity: 0.7, attributeMatchScore: 0.9, hierarchyStability: 0.8, replayContextConfidence: 0.9 },
      survivabilityReasoning: 'Element is stable',
      attributeChanges: [],
      strategyApplied: 'attribute-similarity',
    },
    domEvidence: { matchedPath: 'button', matchedTag: 'button', stableAttributeMatches: ['data-testid'] },
    validated: false,
    createdAt: Date.now(),
    ...overrides,
  };
}

function makeValidation(overrides: Partial<ValidationResult>): ValidationResult {
  return {
    id: 'val-1',
    proposalId: 'cand-1',
    locatorId: 'loc-1',
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
      frame: '',
      resolvedAt: Date.now(),
    },
    validatedAt: Date.now(),
    ...overrides,
  };
}

function makeNode(overrides: Partial<ElementNode> & { tagName: string }): ElementNode {
  return {
    attributes: {},
    children: [],
    visible: true,
    ...overrides,
  };
}

function makeStep(overrides: Partial<ReplayStep> & { actionType: string }): ReplayStep {
  return {
    stepId: 'step-1',
    timestamp: Date.now(),
    actionType: overrides.actionType as ReplayStep['actionType'],
    pageUrl: 'https://example.com/page',
    result: { success: true, duration: 100 },
    navigationContext: { url: 'https://example.com/page' },
    ...overrides,
  } as ReplayStep;
}

function makeSession(overrides: Partial<ReplaySession> & { steps: ReplayStep[] }): ReplaySession {
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
    createdAt: Date.now(),
    ...overrides,
  };
}

function createTestTempDir(): string {
  const dir = join(tmpdir(), `patch-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

// ─── PatchDiffEngine Tests ─────────────────────────────────────────

describe('PatchDiffEngine', () => {
  const engine = new PatchDiffEngine();

  it('generates unified diff for single-line change', () => {
    const content = "page.getByTestId('submit')";
    const original = "page.getByTestId('submit')";
    const replacement = "page.getByRole('button', { name: 'Submit' })";

    const diff = engine.generateDiff(content, original, replacement, 0, 'test.spec.ts');

    expect(diff.unifiedDiff).toBeTruthy();
    expect(diff.addedLines).toBe(1);
    expect(diff.removedLines).toBe(1);
    expect(diff.beforeSnippet).toContain("page.getByTestId('submit')");
    expect(diff.afterSnippet).toContain("page.getByRole('button', { name: 'Submit' })");
  });

  it('generates diff for multi-line change', () => {
    const content = [
      "page.getByRole('button', {",
      "  name: 'Submit'",
      '})',
    ].join('\n');
    const original = [
      "page.getByRole('button', {",
      "  name: 'Submit'",
      '})',
    ].join('\n');
    const replacement = [
      "page.getByTestId('submit')",
    ].join('\n');

    const diff = engine.generateDiff(content, original, replacement, 0, 'test.spec.ts');

    expect(diff.removedLines).toBe(3);
    expect(diff.addedLines).toBe(1);
    expect(diff.unifiedDiff).toContain('-');
    expect(diff.unifiedDiff).toContain('+');
  });

  it('produces deterministic output for identical inputs', () => {
    const content = "page.locator('#old-id')";
    const original = "page.locator('#old-id')";
    const replacement = "page.getByTestId('new-id')";

    const diff1 = engine.generateDiff(content, original, replacement, 0, 'test.spec.ts');
    const diff2 = engine.generateDiff(content, original, replacement, 0, 'test.spec.ts');

    expect(diff1.unifiedDiff).toBe(diff2.unifiedDiff);
    expect(diff1.addedLines).toBe(diff2.addedLines);
    expect(diff1.removedLines).toBe(diff2.removedLines);
  });

  it('extracts before snippet with context', () => {
    const lines = [
      'import { test } from "@playwright/test";',
      '',
      "test('example', async ({ page }) => {",
      "  await page.goto('https://example.com');",
      "  await page.getByTestId('submit').click();",
      "  await expect(page.locator('.welcome')).toBeVisible();",
      '});',
    ];
    const content = lines.join('\n');
    const original = "  await page.getByTestId('submit').click();";
    const replacement = "  await page.getByRole('button', { name: 'Submit' }).click();";

    const diff = engine.generateDiff(content, original, replacement, 4, 'test.spec.ts');

    expect(diff.beforeSnippet).toContain("page.getByTestId('submit')");
    expect(diff.afterSnippet).toContain("page.getByRole('button'");
    expect(diff.beforeStartLine).toBeGreaterThanOrEqual(1);
    expect(diff.beforeEndLine).toBeLessThanOrEqual(7);
  });

  it('handles identical original and replacement (no diff)', () => {
    const content = "page.locator('#same')";
    const diff = engine.generateDiff(content, "page.locator('#same')", "page.locator('#same')", 0, 'test.spec.ts');

    expect(diff.addedLines).toBe(0);
    expect(diff.removedLines).toBe(0);
  });

  it('generates proper unified diff format with + and - markers', () => {
    const original = 'oldCode();';
    const replacement = 'newCode();';

    const diffStr = engine.generateUnifiedDiffString(original, replacement, 'file.ts');

    expect(diffStr).toContain('-oldCode();');
    expect(diffStr).toContain('+newCode();');
    expect(diffStr).toContain('@@');
  });

  it('applies replacement correctly for after-snippet', () => {
    const content = 'line1\nline2\nold\nline4\nline5';
    const result = engine.applyReplacement(content, 'old', 'new', 2);

    expect(result).toBe('line1\nline2\nnew\nline4\nline5');
  });

  it('preserves formatting in replacement', () => {
    const content = [
      '  const btn = page.getByTestId("old-btn");',
      '  await btn.click();',
    ].join('\n');
    const original = '  const btn = page.getByTestId("old-btn");';
    const replacement = '  const btn = page.getByRole("button", { name: "Submit" });';

    const diff = engine.generateDiff(content, original, replacement, 0, 'test.spec.ts');

    expect(diff.unifiedDiff).toContain('+  const btn = page.getByRole(');
    expect(diff.afterSnippet).toContain('  const btn = page.getByRole(');
  });
});

// ─── PatchSafetyValidator Tests ─────────────────────────────────────

describe('PatchSafetyValidator', () => {
  const validator = new PatchSafetyValidator(0.5);

  it('passes all gates for clean validation result', () => {
    const candidate = makeCandidate({ confidence: 0.85 });
    const validation = makeValidation({ replayConfidence: 0.85, matchedElementCount: 1, status: 'passed' });

    const result = validator.validate({ candidate, validation, governanceThreshold: 0.5 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.passed).toBe(true);
    expect(result.value.gates.every(g => g.passed)).toBe(true);
  });

  it('rejects if target node has zero matches', () => {
    const candidate = makeCandidate({ confidence: 0.85 });
    const validation = makeValidation({ matchedElementCount: 0, status: 'failed' });

    const result = validator.validate({ candidate, validation, governanceThreshold: 0.5 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.passed).toBe(false);
    const nodeGate = result.value.gates.find(g => g.gate === 'node-uniqueness');
    expect(nodeGate?.passed).toBe(false);
    expect(nodeGate?.detail).toContain('not found');
  });

  it('rejects if target node has multiple matches', () => {
    const candidate = makeCandidate({ confidence: 0.85 });
    const validation = makeValidation({
      matchedElementCount: 3,
      status: 'ambiguous',
      falsePositiveIndicators: [{ type: 'multiple-matches', detail: '3 elements matched' }],
    });

    const result = validator.validate({ candidate, validation, governanceThreshold: 0.5 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.passed).toBe(false);
    const nodeGate = result.value.gates.find(g => g.gate === 'node-uniqueness');
    expect(nodeGate?.passed).toBe(false);
  });

  it('rejects if confidence below governance threshold', () => {
    const candidate = makeCandidate({ confidence: 0.3 });
    const validation = makeValidation({ replayConfidence: 0.3 });

    const result = validator.validate({ candidate, validation, governanceThreshold: 0.5 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.passed).toBe(false);
    const confGate = result.value.gates.find(g => g.gate === 'confidence-threshold');
    expect(confGate?.passed).toBe(false);
    expect(confGate?.detail).toContain('below');
  });

  it('rejects if replay instability detected', () => {
    const candidate = makeCandidate({ confidence: 0.85 });
    const validation = makeValidation({ replayConfidence: 0.85, matchedElementCount: 1, status: 'passed' });
    const stability = {
      candidateId: 'cand-1',
      locatorId: 'loc-1',
      proposedExpression: "page.getByRole('button', { name: 'Submit' })",
      runCount: 3,
      reproducibilityScore: 0.5,
      confidenceVariance: 0.25,
      runtimeReproducible: false,
      replayConsistent: false,
      flakinessIndicators: ['Validation status varies across runs: passed, failed'],
      runs: [],
      createdAt: Date.now(),
    };

    const result = validator.validate({ candidate, validation, stabilityReport: stability, governanceThreshold: 0.5 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.passed).toBe(false);
    const stabilityGate = result.value.gates.find(g => g.gate === 'replay-stability');
    expect(stabilityGate?.passed).toBe(false);
  });

  it('rejects if runtime validation failed', () => {
    const candidate = makeCandidate({ confidence: 0.85 });
    const validation = makeValidation({ replayConfidence: 0.85, matchedElementCount: 1, status: 'passed' });
    const runtime = {
      id: 'runtime-1',
      replaySessionId: 'session-1',
      proposalId: 'cand-1',
      status: 'failed' as const,
      executedStepCount: 5,
      totalStepCount: 5,
      runtimeConfidence: 0.2,
      runtimeEvidence: [],
      timingMetadata: { startedAt: 0, finishedAt: 0, totalDuration: 0, stepDurations: [] },
      browserMetadata: { browserName: 'chromium' },
      replayDivergence: [{ type: 'element-missing', stepIndex: 2, expected: 'button', actual: 'div' }],
      falsePositiveIndicators: [{ type: 'wrong-element', stepIndex: 2, detail: 'element missing' }],
      createdAt: Date.now(),
    };

    const result = validator.validate({ candidate, validation, runtimeValidation: runtime, governanceThreshold: 0.5 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.passed).toBe(false);
    const runtimeGate = result.value.gates.find(g => g.gate === 'runtime-validation');
    expect(runtimeGate?.passed).toBe(false);
  });

  it('passes when no validation is available (skips gate)', () => {
    const candidate = makeCandidate({ confidence: 0.85 });

    const result = validator.validate({ candidate, governanceThreshold: 0.5 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.passed).toBe(true);
  });

  it('returns rejection reason with all failed gates', () => {
    const candidate = makeCandidate({ confidence: 0.3 });
    const validation = makeValidation({ matchedElementCount: 0, replayConfidence: 0.3, status: 'failed' });

    const result = validator.validate({ candidate, validation, governanceThreshold: 0.5 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.passed).toBe(false);
    expect(result.value.rejectionReason).toBeTruthy();
    expect(result.value.rejectionReason).toContain('Patch generation rejected');
  });

  it('provides deterministic results for same inputs', () => {
    const candidate = makeCandidate({ confidence: 0.85 });
    const validation = makeValidation({ replayConfidence: 0.85, matchedElementCount: 1, status: 'passed' });

    const r1 = validator.validate({ candidate, validation, governanceThreshold: 0.5 });
    const r2 = validator.validate({ candidate, validation, governanceThreshold: 0.5 });

    expect(r1.ok).toBe(r2.ok);
    if (!r1.ok || !r2.ok) return;
    expect(r1.value.passed).toBe(r2.value.passed);
    expect(r1.value.gates.length).toBe(r2.value.gates.length);
    expect(r1.value.gates.every((g, i) => g.passed === r2.value.gates[i]!.passed)).toBe(true);
  });
});

// ─── PatchGenerator Tests ──────────────────────────────────────────

describe('PatchGenerator', () => {
  let tempDir: string;
  let testFilePath: string;

  beforeEach(() => {
    tempDir = createTestTempDir();
    testFilePath = join(tempDir, 'login.spec.ts');
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
  });

  it('generates patch proposal for valid locator replacement', () => {
    const testContent = [
      "import { test, expect } from '@playwright/test';",
      '',
      "test('login', async ({ page }) => {",
      "  await page.goto('https://example.com/login');",
      "  await page.getByTestId('submit').click();",
      "  await expect(page.locator('.welcome')).toBeVisible();",
      '});',
    ].join('\n');
    writeFileSync(testFilePath, testContent, 'utf-8');

    const candidate = makeCandidate({
      originalExpression: "page.getByTestId('submit')",
      proposedExpression: "page.getByRole('button', { name: 'Submit' })",
      proposedStrategy: 'role',
      proposedValue: "button, { name: 'Submit' }",
      confidence: 0.85,
    });

    const validation = makeValidation({
      replayConfidence: 0.85,
      matchedElementCount: 1,
      status: 'passed',
    });

    const generator = new PatchGenerator();
    const result = generator.generate({
      candidate,
      targetFile: testFilePath,
      targetLine: 4,
      validation,
      governanceThreshold: 0.5,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const proposal = result.value;
    expect(proposal.patchId).toBeTruthy();
    expect(proposal.proposalId).toBe('cand-1');
    expect(proposal.targetFile).toBe(testFilePath);
    expect(proposal.targetLocator.expression).toBe("page.getByTestId('submit')");
    expect(proposal.targetLocator.strategy).toBe('role');
    expect(proposal.status).toBe('proposed');
    expect(proposal.schemaVersion).toBe(PATCH_SCHEMA_VERSION);
  });

  it('preserves formatting in replacement snippet', () => {
    const testContent = [
      "import { test } from '@playwright/test';",
      '',
      "test('form', async ({ page }) => {",
      "  await page.getByPlaceholder('Username').fill('admin');",
      '});',
    ].join('\n');
    writeFileSync(testFilePath, testContent, 'utf-8');

    const candidate = makeCandidate({
      originalExpression: "page.getByPlaceholder('Username')",
      proposedExpression: "page.getByLabel('Username')",
      proposedStrategy: 'aria-label',
      proposedValue: 'Username',
    });

    const validation = makeValidation({ replayConfidence: 0.9, matchedElementCount: 1, status: 'passed' });

    const generator = new PatchGenerator();
    const result = generator.generate({
      candidate,
      targetFile: testFilePath,
      targetLine: 3,
      validation,
      governanceThreshold: 0.5,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const proposal = result.value;
    expect(proposal.originalCodeSnippet).toContain("page.getByPlaceholder('Username')");
    expect(proposal.replacementCodeSnippet).toContain("page.getByLabel('Username')");
    expect(proposal.patchDiff.removedLines).toBe(1);
    expect(proposal.patchDiff.addedLines).toBe(1);
  });

  it('includes AST node metadata', () => {
    const testContent = [
      "import { test } from '@playwright/test';",
      '',
      "test('meta', async ({ page }) => {",
      "  await page.locator('#old-id').click();",
      '});',
    ].join('\n');
    writeFileSync(testFilePath, testContent, 'utf-8');

    const candidate = makeCandidate({
      originalExpression: "page.locator('#old-id')",
      proposedExpression: "page.getByTestId('new-id')",
    });

    const validation = makeValidation({ replayConfidence: 0.85, matchedElementCount: 1, status: 'passed' });

    const generator = new PatchGenerator();
    const result = generator.generate({
      candidate,
      targetFile: testFilePath,
      targetLine: 3,
      validation,
      governanceThreshold: 0.5,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const proposal = result.value;
    expect(proposal.astNodeMetadata.nodeType).toBe('CallExpression');
    expect(proposal.astNodeMetadata.startLine).toBe(3);
    expect(proposal.astNodeMetadata.expressionType).toBe('PropertyAccessExpression');
  });

  it('includes rollback metadata', () => {
    const testContent = [
      "import { test } from '@playwright/test';",
      '',
      "test('rollback', async ({ page }) => {",
      "  await page.getByTestId('old-btn').click();",
      '});',
    ].join('\n');
    writeFileSync(testFilePath, testContent, 'utf-8');

    const candidate = makeCandidate({
      originalExpression: "page.getByTestId('old-btn')",
      proposedExpression: "page.getByRole('button', { name: 'New' })",
      strategy: 'role',
    });

    const validation = makeValidation({ replayConfidence: 0.85, matchedElementCount: 1, status: 'passed' });

    const generator = new PatchGenerator();
    const result = generator.generate({
      candidate,
      targetFile: testFilePath,
      targetLine: 3,
      validation,
      governanceThreshold: 0.5,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const proposal = result.value;
    expect(proposal.rollbackMetadata.originalLocatorExpression).toBe("page.getByTestId('old-btn')");
    expect(proposal.rollbackMetadata.originalStrategy).toBe('role');
    expect(proposal.rollbackMetadata.patchReversalCode).toBe(proposal.targetLocator.expression);
    expect(proposal.rollbackMetadata.validationIds).toContain('val-1');
  });

  it('includes confidence metadata', () => {
    const testContent = [
      "import { test } from '@playwright/test';",
      '',
      "test('conf', async ({ page }) => {",
      "  await page.getByTestId('submit').click();",
      '});',
    ].join('\n');
    writeFileSync(testFilePath, testContent, 'utf-8');

    const candidate = makeCandidate();
    const validation = makeValidation({ replayConfidence: 0.85, matchedElementCount: 1, status: 'passed' });

    const generator = new PatchGenerator();
    const result = generator.generate({
      candidate,
      targetFile: testFilePath,
      targetLine: 3,
      validation,
      governanceThreshold: 0.5,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const proposal = result.value;
    expect(proposal.confidenceMetadata.staticValidationConfidence).toBe(0.85);
    expect(proposal.confidenceMetadata.governanceConfidence).toBe(0.85);
  });

  it('includes audit references when provided', () => {
    const testContent = [
      "import { test } from '@playwright/test';",
      '',
      "test('audit', async ({ page }) => {",
      "  await page.getByTestId('submit').click();",
      '});',
    ].join('\n');
    writeFileSync(testFilePath, testContent, 'utf-8');

    const candidate = makeCandidate();
    const validation = makeValidation({ replayConfidence: 0.85, matchedElementCount: 1, status: 'passed' });

    const generator = new PatchGenerator();
    const result = generator.generate({
      candidate,
      targetFile: testFilePath,
      targetLine: 3,
      validation,
      auditTrailId: 'audit-123',
      pipelineRunId: 'pipeline-456',
      governanceThreshold: 0.5,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const proposal = result.value;
    expect(proposal.auditRefs).toHaveLength(1);
    expect(proposal.auditRefs[0]!.auditTrailId).toBe('audit-123');
    expect(proposal.auditRefs[0]!.pipelineRunId).toBe('pipeline-456');
  });

  it('rejects generation for non-existent file', () => {
    const candidate = makeCandidate();
    const generator = new PatchGenerator();
    const result = generator.generate({
      candidate,
      targetFile: join(tempDir, 'nonexistent.ts'),
      targetLine: 0,
      governanceThreshold: 0.5,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('not found');
  });

  it('rejects generation when no AST node found at target line', () => {
    const testContent = [
      "import { test } from '@playwright/test';",
      '',
      "test('empty', async ({ page }) => {",
      '  const x = 42;',
      '});',
    ].join('\n');
    writeFileSync(testFilePath, testContent, 'utf-8');

    const candidate = makeCandidate({ originalExpression: "page.getByTestId('submit')" });
    const validation = makeValidation({ replayConfidence: 0.85, matchedElementCount: 1, status: 'passed' });

    const generator = new PatchGenerator();
    const result = generator.generate({
      candidate,
      targetFile: testFilePath,
      targetLine: 3,
      validation,
      governanceThreshold: 0.5,
    });

    expect(result.ok).toBe(false);
  });

  it('rejects generation when confidence is below threshold', () => {
    const testContent = [
      "import { test } from '@playwright/test';",
      '',
      "test('low-conf', async ({ page }) => {",
      "  await page.getByTestId('btn').click();",
      '});',
    ].join('\n');
    writeFileSync(testFilePath, testContent, 'utf-8');

    const candidate = makeCandidate({
      originalExpression: "page.getByTestId('btn')",
      proposedExpression: "page.getByRole('button')",
    });
    const validation = makeValidation({ replayConfidence: 0.3, matchedElementCount: 1, status: 'passed' });

    const generator = new PatchGenerator();
    const result = generator.generate({
      candidate,
      targetFile: testFilePath,
      targetLine: 3,
      validation,
      governanceThreshold: 0.5,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('below');
  });

  it('generates deterministic output for same inputs', () => {
    const testContent = [
      "import { test } from '@playwright/test';",
      '',
      "test('deterministic', async ({ page }) => {",
      "  await page.getByTestId('btn').click();",
      '});',
    ].join('\n');
    writeFileSync(testFilePath, testContent, 'utf-8');

    const candidate = makeCandidate({
      originalExpression: "page.getByTestId('btn')",
      proposedExpression: "page.locator('#new-btn')",
    });
    const validation = makeValidation({ replayConfidence: 0.85, matchedElementCount: 1, status: 'passed' });

    const generator = new PatchGenerator();
    const r1 = generator.generate({
      candidate,
      targetFile: testFilePath,
      targetLine: 3,
      validation,
      governanceThreshold: 0.5,
    });
    const r2 = generator.generate({
      candidate,
      targetFile: testFilePath,
      targetLine: 3,
      validation,
      governanceThreshold: 0.5,
    });

    expect(r1.ok).toBe(r2.ok);
    if (!r1.ok || !r2.ok) return;
    expect(r1.value.targetLocator.expression).toBe(r2.value.targetLocator.expression);
    expect(r1.value.replacementCodeSnippet).toBe(r2.value.replacementCodeSnippet);
    expect(r1.value.originalCodeSnippet).toBe(r2.value.originalCodeSnippet);
    expect(r1.value.patchDiff.unifiedDiff).toBe(r2.value.patchDiff.unifiedDiff);
  });

  it('handles page object locator replacement', () => {
    const testContent = [
      'import { type Page } from "@playwright/test";',
      '',
      'export class LoginPage {',
      "  readonly usernameInput = page.getByPlaceholder('Username');",
      "  readonly passwordInput = page.locator('#password');",
      "  readonly submitButton = page.getByRole('button', { name: 'Log in' });",
      '}',
    ].join('\n');
    writeFileSync(testFilePath, testContent, 'utf-8');

    const candidate = makeCandidate({
      originalExpression: "page.locator('#password')",
      proposedExpression: "page.getByTestId('password-input')",
      proposedStrategy: 'testid',
      proposedValue: 'password-input',
    });

    const validation = makeValidation({ replayConfidence: 0.85, matchedElementCount: 1, status: 'passed' });

    const generator = new PatchGenerator();
    const result = generator.generate({
      candidate,
      targetFile: testFilePath,
      targetLine: 4,
      validation,
      governanceThreshold: 0.5,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const proposal = result.value;
    expect(proposal.targetLocator.sourceLine).toBe(4);
    expect(proposal.originalCodeSnippet).toContain("page.locator('#password')");
    expect(proposal.replacementCodeSnippet).toContain("page.getByTestId('password-input')");
  });

  it('generates patch summary', () => {
    const testContent = [
      "import { test } from '@playwright/test';",
      '',
      "test('summary', async ({ page }) => {",
      "  await page.locator('#old-btn').click();",
      '});',
    ].join('\n');
    writeFileSync(testFilePath, testContent, 'utf-8');

    const candidate = makeCandidate({
      originalExpression: "page.locator('#old-btn')",
      proposedExpression: "page.getByRole('button', { name: 'Click' })",
    });

    const validation = makeValidation({ replayConfidence: 0.85, matchedElementCount: 1, status: 'passed' });

    const generator = new PatchGenerator();
    const result = generator.generate({
      candidate,
      targetFile: testFilePath,
      targetLine: 3,
      validation,
      governanceThreshold: 0.5,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.patchSummary).toContain('Replace locator in');
    expect(result.value.patchSummary).toContain('Original:');
    expect(result.value.patchSummary).toContain('Replacement:');
  });
});

// ─── PatchStorage Tests ────────────────────────────────────────────

describe('PatchStorage', () => {
  let tempDir: string;
  let storage: PatchStorage;

  beforeEach(() => {
    tempDir = createTestTempDir();
    storage = new PatchStorage(tempDir);
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true });
    }
  });

  function makeProposal(overrides: Partial<PatchProposal> = {}): PatchProposal {
    return {
      patchId: overrides.patchId ?? 'patch-test-1',
      proposalId: overrides.proposalId ?? 'cand-1',
      targetFile: 'test.spec.ts',
      targetLocator: {
        expression: "page.getByTestId('submit')",
        strategy: 'testid',
        value: 'submit',
        sourceLine: 4,
        sourceColumn: 8,
      },
      originalCodeSnippet: "page.getByTestId('submit')",
      replacementCodeSnippet: "page.getByRole('button', { name: 'Submit' })",
      astNodeMetadata: {
        nodeType: 'CallExpression',
        startLine: 4,
        endLine: 4,
        startColumn: 8,
        endColumn: 30,
        parentType: 'ExpressionStatement',
        expressionType: 'PropertyAccessExpression',
      },
      confidenceMetadata: {
        staticValidationConfidence: 0.85,
        governanceConfidence: 0.85,
      },
      rollbackMetadata: {
        originalLocatorExpression: "page.getByTestId('submit')",
        originalStrategy: 'testid',
        originalValue: 'submit',
        originalSourceFile: '',
        originalLine: 4,
        originalColumn: 8,
        patchReversalCode: "page.getByTestId('submit')",
        validationIds: ['val-1'],
        replaySessionIds: ['session-1'],
        createdAt: Date.now(),
      },
      patchSummary: 'Replace locator',
      validationRefs: [
        { validationId: 'val-1', validationStatus: 'passed', matchedElementCount: 1, falsePositiveCount: 0 },
      ],
      auditRefs: [],
      patchDiff: {
        unifiedDiff: '@@ -4 +4 @@\n-page.getByTestId(\'submit\')\n+page.getByRole(\'button\', { name: \'Submit\' })',
        beforeSnippet: 'before',
        afterSnippet: 'after',
        beforeStartLine: 1,
        beforeEndLine: 7,
        afterStartLine: 1,
        afterEndLine: 7,
        addedLines: 1,
        removedLines: 1,
      },
      status: 'proposed',
      schemaVersion: PATCH_SCHEMA_VERSION,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...overrides,
    };
  }

  it('saves and loads a patch proposal', async () => {
    const proposal = makeProposal();
    const saveResult = await storage.save(proposal);
    expect(saveResult.ok).toBe(true);

    const loadResult = await storage.load(proposal.patchId);
    expect(loadResult.ok).toBe(true);
    if (!loadResult.ok) return;
    expect(loadResult.value.patchId).toBe('patch-test-1');
    expect(loadResult.value.schemaVersion).toBe(PATCH_SCHEMA_VERSION);
  });

  it('lists saved patch proposals', async () => {
    await storage.save(makeProposal({ patchId: 'patch-1' }));
    await storage.save(makeProposal({ patchId: 'patch-2' }));

    const listResult = await storage.list();
    expect(listResult.ok).toBe(true);
    if (!listResult.ok) return;
    expect(listResult.value.length).toBe(2);
  });

  it('lists patches by status', async () => {
    await storage.save(makeProposal({ patchId: 'patch-1', status: 'proposed' }));
    await storage.save(makeProposal({ patchId: 'patch-2', status: 'approved' }));

    const proposed = await storage.listByStatus('proposed');
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) return;
    expect(proposed.value.length).toBe(1);
    expect(proposed.value[0]!.patchId).toBe('patch-1');

    const approved = await storage.listByStatus('approved');
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(approved.value.length).toBe(1);
    expect(approved.value[0]!.patchId).toBe('patch-2');
  });

  it('updates patch status', async () => {
    await storage.save(makeProposal({ patchId: 'patch-update' }));
    const updateResult = await storage.updateStatus('patch-update', 'approved');
    expect(updateResult.ok).toBe(true);

    const loadResult = await storage.load('patch-update');
    expect(loadResult.ok).toBe(true);
    if (!loadResult.ok) return;
    expect(loadResult.value.status).toBe('approved');
    expect(loadResult.value.updatedAt).toBeGreaterThan(loadResult.value.createdAt);
  });

  it('deletes a patch proposal', async () => {
    await storage.save(makeProposal({ patchId: 'patch-del' }));
    const deleteResult = await storage.delete('patch-del');
    expect(deleteResult.ok).toBe(true);

    const loadResult = await storage.load('patch-del');
    expect(loadResult.ok).toBe(false);
  });

  it('clears all patches', async () => {
    await storage.save(makeProposal({ patchId: 'patch-1' }));
    await storage.save(makeProposal({ patchId: 'patch-2' }));

    const clearResult = await storage.clear();
    expect(clearResult.ok).toBe(true);

    const listResult = await storage.list();
    expect(listResult.ok).toBe(true);
    if (!listResult.ok) return;
    expect(listResult.value.length).toBe(0);
  });

  it('rejects loading non-existent patch', async () => {
    const result = await storage.load('nonexistent');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('not found');
  });

  it('rejects saving same patch id twice (overwrites silently)', async () => {
    const p1 = makeProposal({ patchId: 'patch-dupe', status: 'proposed' });
    const p2 = makeProposal({ patchId: 'patch-dupe', status: 'approved' });

    await storage.save(p1);
    await storage.save(p2);

    const loadResult = await storage.load('patch-dupe');
    expect(loadResult.ok).toBe(true);
    if (!loadResult.ok) return;
    expect(loadResult.value.status).toBe('approved');
  });

  it('survives corrupt index gracefully', async () => {
    await storage.save(makeProposal({ patchId: 'patch-1' }));

    const indexPath = join(tempDir, '.testguardian', PATCH_STORAGE_DIR, 'index.json');
    writeFileSync(indexPath, 'corrupt json', 'utf-8');

    const listResult = await storage.list();
    expect(listResult.ok).toBe(true);
    if (!listResult.ok) return;
    expect(listResult.value.length).toBe(0);
  });

  it('handles missing patches directory', async () => {
    const listResult = await storage.list();
    expect(listResult.ok).toBe(true);
    if (!listResult.ok) return;
    expect(listResult.value.length).toBe(0);
  });

  it('handles concurrent updates gracefully', async () => {
    await storage.save(makeProposal({ patchId: 'patch-concurrent' }));

    const results = await Promise.all([
      storage.updateStatus('patch-concurrent', 'approved'),
      storage.updateStatus('patch-concurrent', 'rejected'),
    ]);

    expect(results.every(r => r.ok)).toBe(true);

    const loadResult = await storage.load('patch-concurrent');
    expect(loadResult.ok).toBe(true);
    if (!loadResult.ok) return;
    expect(['approved', 'rejected']).toContain(loadResult.value.status);
  });

  it('validates schema version on load', async () => {
    const proposal = makeProposal({ patchId: 'patch-schema' });
    await storage.save(proposal);

    const filePath = join(tempDir, '.testguardian', PATCH_STORAGE_DIR, 'patch-patch-schema.json');
    const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
    raw.schemaVersion = 999;
    writeFileSync(filePath, JSON.stringify(raw, null, 2), 'utf-8');

    const loadResult = await storage.load('patch-schema');
    expect(loadResult.ok).toBe(false);
    if (loadResult.ok) return;
    expect(loadResult.error).toContain('Schema version mismatch');
  });
});
