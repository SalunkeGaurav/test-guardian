/**
 * runtime-hardening — Execute runtime hardening analysis for a test session.
 *
 * Flow:
 *   1. Parse test path and build replay session
 *   2. Run RuntimeStabilityEngine.analyze()
 *   3. Output hardening report summary
 *
 * Usage:
 *   testguardian runtime-hardening --test <path>
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { RuntimeStabilityEngine } from '../../src/core/runtime-hardening/index.js';
import type { ElementNode } from '../../src/models/snapshot.js';
import type { ReplaySession } from '../../src/models/replay.js';

export interface RuntimeHardeningOptions {
  test: string;
  project?: string;
  verbose?: boolean;
}

export async function runtimeHardening(options: RuntimeHardeningOptions): Promise<void> {
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
    console.log(`[runtime-hardening] Project root: ${projectRoot}`);
    console.log(`[runtime-hardening] Test file: ${testPath}`);
  }

  const session = buildReplaySessionFromTest(testPath);
  const domSnapshots = buildDomSnapshotsFromTest(testPath);

  if (options.verbose) {
    console.log(`[runtime-hardening] Session: ${session.id}`);
    console.log(`[runtime-hardening] DOM snapshots: ${domSnapshots.length}`);
  }

  const engine = new RuntimeStabilityEngine();
  const result = engine.analyze({
    session,
    domSnapshots,
    projectRoot,
  });

  if (!result.ok) {
    console.error(`Runtime hardening failed: ${result.error}`);
    process.exit(1);
  }

  const report = result.value;

  console.log('\n=== Runtime Hardening Report ===\n');
  console.log(`Session ID:     ${report.sessionId}`);
  console.log(`Overall Stable: ${report.overallStable ? 'YES' : 'NO'}`);
  console.log('');
  console.log('DOM Settling:');
  console.log(`  Status:               ${report.domSettling.status}`);
  console.log(`  Mutation Stabilized:  ${report.domSettling.mutationCountStabilized ? 'YES' : 'NO'}`);
  console.log(`  Layout Stabilized:    ${report.domSettling.layoutStabilized ? 'YES' : 'NO'}`);
  console.log(`  Render Loop:          ${report.domSettling.renderLoopDetected ? 'DETECTED' : 'NONE'}`);
  console.log(`  Hydration Instable:   ${report.domSettling.hydrationInstabilityDetected ? 'YES' : 'NO'}`);
  console.log('');
  console.log('Navigation Sync:');
  console.log(`  Readiness:            ${report.navigationSync.readiness}`);
  console.log(`  Blocked:              ${report.navigationSync.blockedByUnreadiness ? 'YES' : 'NO'}`);
  console.log(`  Soft Navigations:     ${report.navigationSync.softNavigations}`);
  console.log('');
  console.log('Async Render:');
  console.log(`  Total Async Renders:  ${report.asyncRender.totalAsyncRenders}`);
  console.log(`  Completed:            ${report.asyncRender.completedRenders}`);
  console.log(`  Incomplete:           ${report.asyncRender.incompleteRenders}`);
  console.log(`  Re-render Churn:      ${report.asyncRender.reRenderChurnDetected ? 'DETECTED' : 'NONE'}`);
  console.log(`  Skeleton Replacements:${report.asyncRender.skeletonReplacements}`);
  console.log('');
  console.log('Stale Context:');
  console.log(`  Total Stale Events:   ${report.staleContext.totalStaleEvents}`);
  console.log(`  Successful Recovery:  ${report.staleContext.successfulRecoveries}`);
  console.log(`  Failed Recovery:      ${report.staleContext.failedRecoveries}`);
  console.log(`  Recovery Rate:        ${(report.staleContext.recoveryRate * 100).toFixed(1)}%`);
  console.log('');
  console.log('iframe / Modal:');
  console.log(`  Stability Passed:     ${report.frameModal.stabilityPassed ? 'YES' : 'NO'}`);
  console.log(`  Nested Frames:        ${report.frameModal.nestedFrameCount}`);
  console.log(`  Modal Transitions:    ${report.frameModal.modalTransitionCount}`);
  console.log(`  Focus Trap Violations:${report.frameModal.focusTrapViolations}`);
  console.log('');
  console.log('Replay Drift:');
  console.log(`  Deterministic:        ${report.replayDrift.replayDeterministic ? 'YES' : 'NO'}`);
  console.log(`  Total Drift Events:   ${report.replayDrift.totalDriftEvents}`);
  console.log(`  Severity:             ${report.replayDrift.driftSeverity}`);
  console.log('');
  console.log('Metrics:');
  console.log(`  DOM Stabilization:    ${(report.metrics.domStabilizationSuccessRate * 100).toFixed(1)}%`);
  console.log(`  Replay Recovery:      ${(report.metrics.replayRecoverySuccess * 100).toFixed(1)}%`);
  console.log(`  Stale Recovery:       ${(report.metrics.staleRecoverySuccess * 100).toFixed(1)}%`);
  console.log(`  iframe Recovery:      ${(report.metrics.iframeRecoveryRate * 100).toFixed(1)}%`);
  console.log(`  Async Instability:    ${report.metrics.asyncRenderInstabilityFrequency}`);
  console.log(`  Replay Drift Freq:    ${report.metrics.replayDriftFrequency}`);
  console.log('');
  console.log('Persisted to:');
  for (const p of report.persistedPaths) {
    console.log(`  ${p}`);
  }
}

function buildReplaySessionFromTest(testPath: string): ReplaySession {
  const content = existsSync(testPath) ? readFileSync(testPath, 'utf-8') : '';
  const lines = content.split('\n');

  const steps = extractStepsFromContent(lines, testPath);

  return {
    id: `hardening-session-${extractFileName(testPath)}`,
    traceId: `trace-${extractFileName(testPath)}`,
    testName: extractFileName(testPath),
    testFile: testPath,
    framework: 'playwright',
    schemaVersion: 1,
    entryUrl: extractEntryUrl(content),
    urlTransitions: extractUrlTransitions(content),
    redirectChain: [],
    frameContext: ['main'],
    modalDialogContext: [],
    steps,
    createdAt: 1000,
  };
}

function extractStepsFromContent(lines: string[], testPath: string): import('../../src/models/replay.js').ReplayStep[] {
  const steps: import('../../src/models/replay.js').ReplayStep[] = [];
  let stepIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    if (trimmed.includes('.goto(')) {
      const urlMatch = trimmed.match(/goto\(['"`](.*?)['"`]\)/);
      steps.push({
        stepId: `step-${stepIndex++}`,
        timestamp: 1000 + stepIndex * 100,
        actionType: 'goto',
        pageUrl: urlMatch?.[1] ?? '',
        result: { success: true, duration: 100 },
        navigationContext: { url: urlMatch?.[1] ?? '' },
      });
    } else if (trimmed.includes('.click(') || trimmed.includes('.getBy')) {
      const locatorMatch = trimmed.match(/(?:getBy\w+|locator)\((.*?)\)/);
      steps.push({
        stepId: `step-${stepIndex++}`,
        timestamp: 1000 + stepIndex * 100,
        actionType: 'click',
        locatorRef: locatorMatch ? {
          strategy: 'css',
          value: locatorMatch[1]?.replace(/['"]/g, '') ?? '',
          expression: locatorMatch[0] ?? '',
        } : undefined,
        pageUrl: '',
        result: { success: true, duration: 50 },
        navigationContext: { url: '' },
      });
    } else if (trimmed.includes('.fill(')) {
      steps.push({
        stepId: `step-${stepIndex++}`,
        timestamp: 1000 + stepIndex * 100,
        actionType: 'fill',
        pageUrl: '',
        result: { success: true, duration: 30 },
        navigationContext: { url: '' },
      });
    }
  }

  return steps;
}

function extractEntryUrl(content: string): string {
  const match = content.match(/goto\(['"`](.*?)['"`]\)/);
  return match?.[1] ?? 'https://example.com';
}

function extractUrlTransitions(content: string): string[] {
  const urls: string[] = [];
  const matches = content.matchAll(/goto\(['"`](.*?)['"`]\)/g);
  for (const m of matches) {
    if (m[1]) urls.push(m[1]);
  }
  return urls;
}

function extractFileName(path: string): string {
  const parts = path.split(/[\\/]/);
  const fileName = parts[parts.length - 1] ?? '';
  return fileName.replace(/\.[^.]+$/, '');
}

function buildDomSnapshotsFromTest(testPath: string): ElementNode[] {
  const content = existsSync(testPath) ? readFileSync(testPath, 'utf-8') : '';
  const locators = extractLocatorsFromContent(content);

  const snapshots: ElementNode[] = [];

  for (const locator of locators) {
    snapshots.push(buildDomSnapshotForLocator(locator));
  }

  if (snapshots.length === 0) {
    snapshots.push(buildDefaultSnapshot());
  }

  return snapshots;
}

function extractLocatorsFromContent(content: string): string[] {
  const locators: string[] = [];
  const patterns = [
    /getByTestId\(['"`](.*?)['"`]\)/g,
    /getByRole\(['"`](.*?)['"`]\)/g,
    /getByText\(['"`](.*?)['"`]\)/g,
    /locator\(['"`](.*?)['"`]\)/g,
    /getByLabel\(['"`](.*?)['"`]\)/g,
  ];

  for (const pattern of patterns) {
    const matches = content.matchAll(pattern);
    for (const m of matches) {
      if (m[1]) locators.push(m[1]);
    }
  }

  return locators;
}

function buildDomSnapshotForLocator(locator: string): ElementNode {
  const attrs: Record<string, string> = {};

  if (locator.startsWith('#')) {
    attrs.id = locator.slice(1);
  } else if (locator.startsWith('.')) {
    attrs.class = locator.slice(1);
  } else if (locator.includes('=')) {
    const [key, value] = locator.split('=');
    if (key && value) attrs[key] = value;
  } else {
    attrs['data-testid'] = locator;
  }

  return {
    tagName: 'div',
    attributes: attrs,
    children: [],
    textContent: '',
    visible: true,
  };
}

function buildDefaultSnapshot(): ElementNode {
  return {
    tagName: 'html',
    attributes: {},
    children: [
      {
        tagName: 'body',
        attributes: {},
        children: [],
        visible: true,
      },
    ],
    visible: true,
  };
}
