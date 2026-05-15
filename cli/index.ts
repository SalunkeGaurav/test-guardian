#!/usr/bin/env node

/**
 * TestGuardian CLI Entry Point
 *
 * Commands:
 *   init     — Bootstrap .testguardian in the current project
 *   analyze  — Detect framework, discover tests, index locators
 *   trace    — Run tests and capture execution traces
 *   heal     — Analyze failures and generate healing proposals
 *   validate — Verify healing proposals against DOM
 *
 * Architecture:
 *   CLI is a thin shell. Each command delegates to a core module.
 *   No healing logic exists in the CLI layer.
 */

import { Command } from 'commander';

const program = new Command();

program
  .name('testguardian')
  .description('Framework-agnostic automation healing platform')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize .testguardian in the current project')
  .action(async () => {
    const { init } = await import('./commands/init.js');
    await init();
  });

program
  .command('analyze')
  .description('Analyze the test framework in the current project')
  .option('--adapter <name>', 'Force a specific adapter')
  .option('--verbose', 'Enable debug logging')
  .action(async (opts) => {
    const { analyze } = await import('./commands/analyze.js');
    await analyze({ adapter: opts.adapter, verbose: opts.verbose });
  });

program
  .command('trace')
  .description('Run tests and capture execution traces')
  .argument('[files...]', 'Test files to trace')
  .option('--test-name <name>', 'Run a specific test by name')
  .action(async (files: string[], opts) => {
    const { trace } = await import('./commands/trace.js');
    await trace(files, opts.testName);
  });

program
  .command('heal')
  .description('Analyze failures and generate healing proposals')
  .option('--trace-id <id>', 'Heal a specific trace')
  .option('--apply', 'Apply validated patches automatically')
  .action(async (opts) => {
    const { heal } = await import('./commands/heal.js');
    await heal(opts);
  });

program
  .command('validate')
  .description('Validate healing proposals')
  .option('--proposal-id <id>', 'Validate a specific proposal')
  .option('--live', 'Use live browser replay for validation')
  .action(async (opts) => {
    const { validate } = await import('./commands/validate.js');
    await validate(opts);
  });

program
  .command('validate-repo')
  .description('Validate real repository compatibility (Real Repository Compatibility v1)')
  .option('-p, --path <path>', 'Path to repository to validate', '.')
  .option('--verbose', 'Enable debug logging')
  .action(async (opts) => {
    const { validateRepository } = await import('./commands/validate-repository.js');
    await validateRepository({ path: opts.path, verbose: opts.verbose });
  });

program
  .command('stress-test')
  .description('Run adversarial stress tests (Adversarial Repository Stress Testing v1)')
  .option('-f, --fixtures <path>', 'Path to adversarial fixtures directory')
  .option('--verbose', 'Enable debug logging')
  .action(async (opts) => {
    const { runStressTest } = await import('./commands/stress-test.js');
    await runStressTest({ fixturePath: opts.fixtures, verbose: opts.verbose });
  });

program
  .command('pattern-intel')
  .description('Extract repository pattern intelligence (Pattern Intelligence v1)')
  .option('-p, --path <path>', 'Path to repository to analyze', '.')
  .option('--verbose', 'Enable debug logging')
  .action(async (opts) => {
    const { extractPatternIntelligence } = await import('./commands/pattern-intelligence.js');
    await extractPatternIntelligence({ path: opts.path, verbose: opts.verbose });
  });

program
  .command('healing-benchmark')
  .description('Run healing effectiveness benchmark (Measured Healing Effectiveness v1)')
  .option('-f, --fixtures <path>', 'Path to benchmark fixtures')
  .option('--verbose', 'Enable debug logging')
  .action(async (opts) => {
    const { runHealingBenchmark } = await import('./commands/healing-benchmark.js');
    await runHealingBenchmark({ fixturePath: opts.fixtures, verbose: opts.verbose });
  });

program
  .command('healing-intel')
  .description('Analyze healing failures and root causes (Healing Failure Intelligence v1)')
  .option('-b, --benchmark <path>', 'Path to benchmark reports')
  .option('--verbose', 'Enable debug logging')
  .action(async (opts) => {
    const { analyzeHealingIntelligence } = await import('./commands/healing-intelligence.js');
    await analyzeHealingIntelligence({ benchmarkPath: opts.benchmark, verbose: opts.verbose });
  });

program
  .command('corpus')
  .description('Run real repository corpus benchmarking (Real Repository Corpus Execution v1)')
  .option('-c, --corpus <path>', 'Path to benchmark repositories corpus', 'C:\\Users\\Hp\\Automation Tools\\Tool Testing Data\\benchmark-repositories')
  .option('-o, --output <path>', 'Path to output reports directory')
  .option('--verbose', 'Enable debug logging')
  .action(async (opts) => {
    const { runCorpusBenchmarks } = await import('./commands/corpus-execution.js');
    await runCorpusBenchmarks({ corpusPath: opts.corpus, outputPath: opts.output, verbose: opts.verbose });
  });

program
  .command('calibrate')
  .description('Run confidence calibration hardening (Confidence Calibration Hardening v1)')
  .option('-c, --corpus <path>', 'Path to benchmark repositories corpus')
  .option('-o, --output <path>', 'Path to output reports directory')
  .option('--verbose', 'Enable debug logging')
  .action(async (opts) => {
    const { runCalibration } = await import('./commands/confidence-calibration.js');
    await runCalibration({ corpusPath: opts.corpus, outputPath: opts.output, verbose: opts.verbose });
  });

program
  .command('workflow')
  .description('Simulate developer workflows (Developer Workflow Simulation v1)')
  .option('-s, --sessions <number>', 'Number of review sessions to simulate', '20')
  .option('-o, --output <path>', 'Path to output reports directory')
  .option('--verbose', 'Enable debug logging')
  .action(async (opts) => {
    const { runWorkflowSimulation } = await import('./commands/developer-workflow.js');
    await runWorkflowSimulation({ sessionCount: parseInt(opts.sessions, 10), outputPath: opts.output, verbose: opts.verbose });
  });

await program.parseAsync(process.argv);
