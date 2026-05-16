import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import { info, warn, error } from '../../src/logger/index.js';
import { Tracer } from '../../src/core/tracer/index.js';
import { FileStorage } from '../../src/core/storage/index.js';
import { PlaywrightAdapter } from '../../src/adapters/playwright/index.js';
import type { TraceSummary } from '../../src/models/trace.js';
import type { Result } from '../../src/models/result.js';

interface TraceResult {
  file: string;
  traceId?: string;
  passed?: boolean;
  eventCount?: number;
  error?: string;
}

export async function trace(files: string[], testName?: string): Promise<void> {
  const projectRoot = resolve(process.cwd());

  const adapter = new PlaywrightAdapter();
  const detection = adapter.detect(projectRoot);

  if (!detection.ok || !detection.value) {
    error('trace', 'No Playwright project detected');
    process.exit(1);
  }

  const resolvedFiles = await resolveTestFiles(files, projectRoot);

  if (resolvedFiles.length === 0) {
    warn('trace', 'No test files found matching the given patterns');
    return;
  }

  info('trace', `Found ${resolvedFiles.length} test file(s)`);

  const storage = new FileStorage(projectRoot);
  const tracer = new Tracer(adapter, storage);
  const results: TraceResult[] = [];

  if (adapter.capabilities.canRunTests) {
    for (const file of resolvedFiles) {
      const result = await tracer.trace(file, testName);
      if (result.ok) {
        results.push({
          file,
          traceId: result.value.id,
          passed: result.value.passed,
          eventCount: result.value.events.length,
        });
      } else {
        results.push({ file, error: result.error });
      }
    }
  } else {
    info('trace', 'Runtime execution not available in analyze mode.');
    info('trace', 'To capture traces:');
    info('trace', `  1. Import fixture in your test files:`);
    info('trace', `     import { test } from 'testguardian/src/adapters/playwright/tracer/fixture.js'`);
    info('trace', `  2. Run your tests with: npx playwright test`);
    info('trace', `  3. Run this command again to collect traces`);
    info('trace', '');

    const collected = await storage.listTraces(20);
    if (collected.ok && collected.value.length > 0) {
      info('trace', `Found ${collected.value.length} existing trace(s) to display:`);
      results.push(...collected.value.map((t: TraceSummary) => ({
        file: t.testFile,
        traceId: t.id,
        passed: t.passed,
        eventCount: t.eventCount,
      })));
    } else {
      info('trace', 'No existing traces found in .testguardian/traces/');
    }
  }

  printSummary(results);
}

async function resolveTestFiles(files: string[], projectRoot: string): Promise<string[]> {
  if (files.length > 0) {
    const { globSync } = await import('fast-glob');
    const resolved: string[] = [];
    for (const pattern of files) {
      const absPattern = resolve(projectRoot, pattern);
      const matches = globSync(absPattern.replace(/\\/g, '/'), { onlyFiles: true });
      resolved.push(...matches.map(m => resolve(m)));
    }
    return [...new Set(resolved)];
  }

  const storage = new FileStorage(projectRoot);
  const traces = await storage.listTraces(1);
  if (traces.ok && traces.value.length > 0) {
    return [];
  }

  return [];
}

function printSummary(results: TraceResult[]): void {
  if (results.length === 0) return;

  const passed = results.filter(r => r.passed);
  const failed = results.filter(r => r.passed === false);
  const errored = results.filter(r => r.error);

  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║        Trace Execution Summary           ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  for (const r of results) {
    const status = r.passed === true ? 'PASS' : r.passed === false ? 'FAIL' : 'SKIP';
    const detail = r.traceId ? ` (${r.eventCount ?? 0} events)` : '';
    console.log(`  ${status.padEnd(6)} ${r.file}${detail}`);
    if (r.error) console.log(`        ${r.error}`);
  }

  console.log('');
  console.log(`  ${results.length} total  ·  ${passed.length} passed  ·  ${failed.length + errored.length} failed`);
  console.log('');
}
