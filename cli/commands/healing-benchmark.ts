import { resolve } from 'node:path';
import { info, error, warn } from '../../src/logger/index.js';
import { HealingBenchmark, generateHealingSummary } from '../../src/core/healing-benchmark/index.js';

export interface HealingBenchmarkOptions {
  fixturePath?: string;
  verbose?: boolean;
}

export async function runHealingBenchmark(options: HealingBenchmarkOptions): Promise<void> {
  const fixturePath = options.fixturePath
    ? resolve(options.fixturePath)
    : undefined;

  info('CLI', 'Healing effectiveness benchmark started');

  try {
    const benchmark = new HealingBenchmark();
    const report = await benchmark.runBenchmark(fixturePath);

    console.log('');
    console.log(generateHealingSummary(report));

    if (report.overallRecoveryRate < 50) {
      warn('CLI', `Benchmark warning: Low recovery rate (${report.overallRecoveryRate.toFixed(1)}%)`);
    } else if (report.falsePositiveRate > 20) {
      warn('CLI', `Benchmark warning: High false positive rate (${report.falsePositiveRate.toFixed(1)}%)`);
    } else {
      info('CLI', 'Healing benchmark completed successfully');
    }
  } catch (err) {
    error('CLI', `Benchmark failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}