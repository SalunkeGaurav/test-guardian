import { resolve } from 'node:path';
import { info, error, warn } from '../../src/logger/index.js';
import { AdversarialTester, generateStressReportSummary } from '../../src/core/adversarial-tester/index.js';

export interface StressTestOptions {
  fixturePath?: string;
  verbose?: boolean;
}

export async function runStressTest(options: StressTestOptions): Promise<void> {
  const fixturePath = options.fixturePath
    ? resolve(options.fixturePath)
    : undefined;

  info('CLI', 'Adversarial stress testing started');

  try {
    const tester = new AdversarialTester();
    const report = await tester.runStressTests(fixturePath);

    console.log('');
    console.log(generateStressReportSummary(report));

    if (report.overallStability < 60) {
      warn('CLI', `Stress test failed: stability below threshold (${report.overallStability.toFixed(1)}%)`);
      process.exit(1);
    } else if (report.overallStability < 80) {
      warn('CLI', `Warning: stability below optimal (${report.overallStability.toFixed(1)}%)`);
    } else {
      info('CLI', 'Stress test passed with good stability');
    }
  } catch (err) {
    error('CLI', `Stress test failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}