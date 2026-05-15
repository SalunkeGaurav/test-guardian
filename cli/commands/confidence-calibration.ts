import { resolve } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { info, error } from '../../src/logger/index.js';
import {
  runConfidenceCalibration,
  generateCalibrationSummary,
} from '../../src/core/confidence-calibration/index.js';

export interface ConfidenceCalibrationOptions {
  corpusPath?: string;
  outputPath?: string;
  verbose?: boolean;
}

const DEFAULT_CORPUS_PATH = 'C:\\Users\\Hp\\Automation Tools\\Tool Testing Data\\benchmark-repositories';
const DEFAULT_OUTPUT_PATH = '.testguardian/confidence-calibration';

export async function runCalibration(options: ConfidenceCalibrationOptions): Promise<void> {
  const corpusPath = options.corpusPath ? resolve(options.corpusPath) : resolve(DEFAULT_CORPUS_PATH);
  const outputPath = options.outputPath || resolve(DEFAULT_OUTPUT_PATH);

  info('CLI', 'Starting Confidence Calibration Hardening v1');
  info('CLI', `Corpus path: ${corpusPath}`);

  try {
    await mkdir(outputPath, { recursive: true });

    const report = await runConfidenceCalibration({
      corpusPath,
      verbose: options.verbose,
    });

    console.log('');
    console.log(generateCalibrationSummary(report));

    const reportPath = resolve(outputPath, 'calibration-report.json');
    await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    info('CLI', `Calibration report saved to: ${reportPath}`);

    const reliabilityPath = resolve(outputPath, 'reliability-report.json');
    await writeFile(reliabilityPath, JSON.stringify(report.analysisResults, null, 2), 'utf-8');
    info('CLI', `Reliability report saved to: ${reliabilityPath}`);

    const governancePath = resolve(outputPath, 'governance-hardening.json');
    await writeFile(governancePath, JSON.stringify(report.governanceAnalysis, null, 2), 'utf-8');
    info('CLI', `Governance hardening report saved to: ${governancePath}`);

    const structuralPath = resolve(outputPath, 'structural-correlation.json');
    await writeFile(structuralPath, JSON.stringify(report.structuralCorrelation, null, 2), 'utf-8');
    info('CLI', `Structural correlation saved to: ${structuralPath}`);

    const simulationPath = resolve(outputPath, 'simulation-results.json');
    await writeFile(simulationPath, JSON.stringify(report.simulationResults, null, 2), 'utf-8');
    info('CLI', `Simulation results saved to: ${simulationPath}`);

    info('CLI', 'Confidence calibration complete');
  } catch (err) {
    error('CLI', `Calibration failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}