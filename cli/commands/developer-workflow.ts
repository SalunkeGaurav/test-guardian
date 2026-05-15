import { resolve } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { info, error } from '../../src/logger/index.js';
import {
  runDeveloperWorkflowSimulation,
  generateWorkflowSummary,
} from '../../src/core/developer-workflow/index.js';

export interface DeveloperWorkflowOptions {
  corpusPath?: string;
  outputPath?: string;
  sessionCount?: number;
  verbose?: boolean;
}

const DEFAULT_OUTPUT_PATH = '.testguardian/developer-workflows';

export async function runWorkflowSimulation(options: DeveloperWorkflowOptions): Promise<void> {
  const outputPath = options.outputPath || resolve(DEFAULT_OUTPUT_PATH);

  info('CLI', 'Starting Developer Workflow Simulation v1');
  info('CLI', `Sessions: ${options.sessionCount || 20}`);

  try {
    await mkdir(outputPath, { recursive: true });

    const result = await runDeveloperWorkflowSimulation({
      sessionCount: options.sessionCount,
      verbose: options.verbose,
    });

    console.log('');
    console.log(generateWorkflowSummary(result));

    const sessionsPath = resolve(outputPath, 'review-sessions.json');
    await writeFile(sessionsPath, JSON.stringify(result.sessions, null, 2), 'utf-8');
    info('CLI', `Review sessions saved to: ${sessionsPath}`);

    const ergonomicsPath = resolve(outputPath, 'ergonomics-report.json');
    await writeFile(ergonomicsPath, JSON.stringify(result.ergonomicsReport, null, 2), 'utf-8');
    info('CLI', `Ergonomics report saved to: ${ergonomicsPath}`);

    const governancePath = resolve(outputPath, 'governance-visibility.json');
    await writeFile(governancePath, JSON.stringify(result.governanceVisibility, null, 2), 'utf-8');
    info('CLI', `Governance visibility saved to: ${governancePath}`);

    const benchmarkPath = resolve(outputPath, 'approval-benchmark.json');
    await writeFile(benchmarkPath, JSON.stringify(result.approvalBenchmark, null, 2), 'utf-8');
    info('CLI', `Approval benchmark saved to: ${benchmarkPath}`);

    const packagesPath = resolve(outputPath, 'review-packages.json');
    await writeFile(packagesPath, JSON.stringify(result.reviewPackages, null, 2), 'utf-8');
    info('CLI', `Review packages saved to: ${packagesPath}`);

    info('CLI', 'Developer workflow simulation complete');
  } catch (err) {
    error('CLI', `Simulation failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}