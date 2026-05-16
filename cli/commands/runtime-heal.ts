/**
 * runtime-heal — Execute runtime healing loop for a failing test.
 *
 * Flow:
 *   1. Parse test path and failure context
 *   2. Run RuntimeHealingLoop.execute()
 *   3. Output review package summary
 *
 * Usage:
 *   testguardian runtime-heal --test <path>
 *   testguardian runtime-heal --test <path> --line <number>
 *   testguardian runtime-heal --test <path> --locator <expression>
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { RuntimeHealingLoop, FailureCapture } from '../../src/core/runtime-healing-loop/index.js';
import type { Locator } from '../../src/models/locator.js';
import type { ElementNode } from '../../src/models/snapshot.js';

export interface RuntimeHealOptions {
  test: string;
  line?: number;
  locator?: string;
  project?: string;
  verbose?: boolean;
}

export async function runtimeHeal(options: RuntimeHealOptions): Promise<void> {
  const projectRoot = options.project ? resolve(options.project) : process.cwd();

  if (!options.test) {
    console.error('Error: --test <path> is required');
    process.exit(1);
  }

  const testPath = resolve(options.test);
  if (!existsSync(testPath)) {
    console.error(`Error: Test file not found: ${testPath}`);
    process.exit(1);
  }

  if (options.verbose) {
    console.log(`[runtime-heal] Project root: ${projectRoot}`);
    console.log(`[runtime-heal] Test file: ${testPath}`);
  }

  // Build failure context from the test file
  const failureContext = buildFailureContextFromTest(testPath, options);

  if (options.verbose) {
    console.log(`[runtime-heal] Failure context: ${failureContext.locator.id}`);
    console.log(`[runtime-heal] Failed locator: ${failureContext.failedLocatorExpression}`);
  }

  // Execute the runtime healing loop
  const loop = new RuntimeHealingLoop(projectRoot);
  const result = await loop.execute({
    failureContext,
    projectRoot,
  });

  if (!result.ok) {
    console.error(`Runtime healing failed: ${result.error}`);
    process.exit(1);
  }

  // Output review package summary
  const { reviewPackage, metrics, persistedPaths } = result.value;

  console.log('\n=== Runtime Healing Review Package ===\n');
  console.log(`Review ID:      ${reviewPackage.reviewId}`);
  console.log(`Status:         ${reviewPackage.status}`);
  console.log(`Original:       ${reviewPackage.originalLocator}`);
  console.log(`Healed:         ${reviewPackage.healedLocator}`);
  console.log(`Confidence:     ${reviewPackage.confidenceBreakdown.overall.toFixed(2)}`);
  console.log('');
  console.log('Sandbox Verification:');
  console.log(`  Compile:      ${reviewPackage.sandboxVerification.compileSuccess ? 'PASS' : 'FAIL'}`);
  console.log(`  Replay:       ${reviewPackage.sandboxVerification.replaySuccess ? 'PASS' : 'FAIL'}`);
  console.log(`  No Divergence:${reviewPackage.sandboxVerification.noNavigationDivergence ? 'PASS' : 'FAIL'}`);
  console.log(`  No New Fails: ${reviewPackage.sandboxVerification.noNewFailures ? 'PASS' : 'FAIL'}`);
  console.log(`  Isolation:    ${reviewPackage.sandboxVerification.isolationVerified ? 'VERIFIED' : 'UNVERIFIED'}`);
  console.log(`  Sandbox ID:   ${reviewPackage.sandboxVerification.sandboxId}`);
  console.log('');
  console.log('Metrics:');
  console.log(`  Healing Success Rate:    ${metrics.successfulHealings}/${metrics.totalHealingAttempts}`);
  console.log(`  Sandbox Replay Success:  ${metrics.sandboxReplaySuccesses}/${metrics.totalHealingAttempts}`);
  console.log(`  False Recovery Rate:     ${metrics.falseRecoveries}/${metrics.totalHealingAttempts}`);
  console.log(`  Replay Divergence Rate:  ${metrics.replayDivergences}`);
  console.log(`  Rollback Reliability:    ${metrics.rollbackReliability > 0 ? 'PASS' : 'FAIL'}`);
  console.log(`  Patch Survivability:     ${metrics.patchSurvivability > 0 ? 'PASS' : 'FAIL'}`);
  console.log('');
  console.log('Persisted to:');
  for (const p of persistedPaths) {
    console.log(`  ${p}`);
  }
  console.log('');
  console.log('Review package is ready for developer approval.');
  console.log('No changes have been made to the original repository.');
}

function buildFailureContextFromTest(testPath: string, options: RuntimeHealOptions) {
  const capture = new FailureCapture();

  const fileContent = existsSync(testPath) ? readFileSync(testPath, 'utf-8') : '';
  const failingLine = options.line ?? extractFailingLine(fileContent);

  const locatorExpression = options.locator ?? extractLocatorFromLine(fileContent, failingLine);

  const locator: Locator = {
    id: `loc-runtime-${failingLine}`,
    strategy: detectStrategy(locatorExpression),
    value: extractLocatorValue(locatorExpression),
    expression: locatorExpression,
    sourceFile: testPath,
    sourceLine: failingLine,
    propertyName: null,
    verified: false,
  };

  const domSnapshot = buildDomSnapshotFromContext(locatorExpression);

  return capture.capture({
    locator,
    failedLocatorExpression: locatorExpression,
    stackTrace: `at Test.run (${testPath}:${failingLine}:1)`,
    failingFile: testPath,
    failingLine,
    domSnapshot,
    errorMessage: `Locator "${locatorExpression}" not found`,
  });
}

function extractFailingLine(content: string): number {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.includes('.getBy') || line.includes('.locator(') || line.includes('.getTestId')) {
      return i + 1;
    }
  }
  return 1;
}

function extractLocatorFromLine(content: string, lineNum: number): string {
  const lines = content.split('\n');
  const line = lines[lineNum - 1] ?? '';

  const patterns = [
    /getByTestId\((["'])(.*?)\1\)/,
    /getByRole\((["'])(.*?)\1\)/,
    /getByText\((["'])(.*?)\1\)/,
    /getByLabel\((["'])(.*?)\1\)/,
    /locator\((["'])(.*?)\1\)/,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) return match[2] ?? '';
  }

  return 'unknown';
}

function detectStrategy(expression: string): import('../../src/models/locator.js').LocatorStrategy {
  if (expression.startsWith('#')) return 'id';
  if (expression.startsWith('.')) return 'class-name';
  if (expression.includes('data-testid')) return 'testid';
  if (expression.includes('aria-label')) return 'aria-label';
  if (expression.includes('role=')) return 'role';
  if (expression.includes('placeholder=')) return 'placeholder';
  if (expression.startsWith('//') || expression.startsWith('(')) return 'xpath';
  return 'css';
}

function extractLocatorValue(expression: string): string {
  return expression.replace(/^[#.]/, '').split('=')[1] ?? expression;
}

function buildDomSnapshotFromContext(expression: string): ElementNode[] {
  return [
    {
      tagName: 'html',
      attributes: {},
      children: [
        {
          tagName: 'body',
          attributes: {},
          children: [
            {
              tagName: 'button',
              attributes: {
                id: extractLocatorValue(expression),
                'data-testid': expression.includes('data-testid') ? extractLocatorValue(expression) : '',
              },
              children: [],
              textContent: 'Submit',
              visible: true,
            },
          ],
          visible: true,
        },
      ],
      visible: true,
    },
  ];
}
