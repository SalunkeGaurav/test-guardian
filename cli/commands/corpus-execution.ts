import { resolve } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { info, error } from '../../src/logger/index.js';
import {
  runCorpusExecution,
  discoverRepositories,
  generateCorrelationReport,
  classifyRepositories,
  generateFailureInventory,
  generateCorpusSummary,
  generateClassificationSummary,
  generateFailureInventorySummary,
} from '../../src/core/corpus-execution/index.js';

export interface CorpusExecutionOptions {
  corpusPath?: string;
  outputPath?: string;
  verbose?: boolean;
}

const DEFAULT_CORPUS_PATH = 'C:\\Users\\Hp\\Automation Tools\\Tool Testing Data\\benchmark-repositories';

export async function runCorpusBenchmarks(options: CorpusExecutionOptions): Promise<void> {
  const corpusPath = options.corpusPath ? resolve(options.corpusPath) : resolve(DEFAULT_CORPUS_PATH);
  const outputPath = options.outputPath || resolve('.testguardian', 'corpus-reports');

  info('CLI', `Starting Real Repository Corpus Execution v1`);
  info('CLI', `Corpus path: ${corpusPath}`);

  try {
    await mkdir(outputPath, { recursive: true });

    info('CLI', 'Running corpus execution...');
    const aggregateReport = await runCorpusExecution({
      corpusPath,
      verbose: options.verbose,
    });

    console.log('');
    console.log(generateCorpusSummary(aggregateReport));

    const index = await discoverRepositories(corpusPath);

    info('CLI', 'Generating correlation analysis...');
    const correlationReport = generateCorrelationReport(aggregateReport, index);

    info('CLI', 'Classifying repositories...');
    const classifications = classifyRepositories(aggregateReport, index);

    console.log(generateClassificationSummary(classifications));

    info('CLI', 'Generating failure inventory...');
    const failureInventory = generateFailureInventory(aggregateReport, index, classifications);

    console.log(generateFailureInventorySummary(failureInventory));

    const corpusIndexPath = resolve(outputPath, 'corpus-index.json');
    await writeFile(corpusIndexPath, JSON.stringify(index, null, 2), 'utf-8');
    info('CLI', `Repository corpus index saved to: ${corpusIndexPath}`);

    const aggregateReportPath = resolve(outputPath, 'aggregate-report.json');
    await writeFile(aggregateReportPath, JSON.stringify(aggregateReport, null, 2), 'utf-8');
    info('CLI', `Aggregate report saved to: ${aggregateReportPath}`);

    const correlationReportPath = resolve(outputPath, 'correlation-report.json');
    await writeFile(correlationReportPath, JSON.stringify(correlationReport, null, 2), 'utf-8');
    info('CLI', `Correlation report saved to: ${correlationReportPath}`);

    const classificationsPath = resolve(outputPath, 'classifications.json');
    await writeFile(classificationsPath, JSON.stringify(classifications, null, 2), 'utf-8');
    info('CLI', `Classifications saved to: ${classificationsPath}`);

    const failureInventoryPath = resolve(outputPath, 'failure-inventory.json');
    await writeFile(failureInventoryPath, JSON.stringify(failureInventory, null, 2), 'utf-8');
    info('CLI', `Failure inventory saved to: ${failureInventoryPath}`);

    const successfulCount = aggregateReport.executionResults.filter((r) => r.success).length;
    const failedCount = aggregateReport.executionResults.filter((r) => !r.success).length;

    info('CLI', `Corpus execution complete.`);
    info('CLI', `  Successful: ${successfulCount}`);
    info('CLI', `  Failed: ${failedCount}`);
    info('CLI', `  Reports: ${outputPath}`);

  } catch (err) {
    error('CLI', `Corpus execution failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}