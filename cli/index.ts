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

program
  .command('risk-discrimination')
  .description('Run risk discrimination analysis (Risk Discrimination Hardening v1)')
  .option('--candidate-id <id>', 'Analyze a specific candidate')
  .option('--governance', 'Run governance blind spot analysis')
  .option('--simulation', 'Run risk simulation')
  .option('--verbose', 'Enable debug logging')
  .action(async (opts) => {
    const { runRiskDiscrimination } = await import('./commands/risk-discrimination.js');
    await runRiskDiscrimination({
      candidateId: opts.candidateId,
      governanceAnalysis: opts.governance,
      simulation: opts.simulation,
      verbose: opts.verbose,
    });
  });

program
  .command('ci-failure-validation')
  .description('Run real CI failure replay validation (Real CI Failure Replay Validation v1)')
  .option('--corpus <path>', 'Path to failure corpus JSON file')
  .option('--replay-attempts <number>', 'Number of replay attempts per failure', '5')
  .option('--verbose', 'Enable debug logging')
  .action(async (opts) => {
    const { runCIFailureValidation } = await import('./commands/ci-failure-validation.js');
    await runCIFailureValidation({
      corpusPath: opts.corpus,
      replayAttempts: parseInt(opts.replayAttempts, 10),
      verbose: opts.verbose,
    });
  });

program
  .command('cohesion-audit')
  .description('Run architecture cohesion audit (Architecture Cohesion Audit v1)')
  .option('--modules <list>', 'Comma-separated list of modules to audit')
  .option('--skip-persistence', 'Skip persistence schema audit')
  .option('--skip-dependency', 'Skip dependency stability audit')
  .option('--skip-determinism', 'Skip determinism integrity audit')
  .option('--verbose', 'Enable debug logging')
  .action(async (opts) => {
    const { runArchitectureCohesionAudit } = await import('./commands/architecture-cohesion-audit.js');
    await runArchitectureCohesionAudit({
      modules: opts.modules,
      skipPersistence: opts.skipPersistence,
      skipDependency: opts.skipDependency,
      skipDeterminism: opts.skipDeterminism,
      verbose: opts.verbose,
    });
  });

program
  .command('runtime-heal')
  .description('Execute runtime healing loop for a failing test (Runtime Healing Execution Loop v1)')
  .option('--test <path>', 'Path to the failing test file')
  .option('--line <number>', 'Line number of the failing locator')
  .option('--locator <expression>', 'The failing locator expression')
  .option('--project <path>', 'Project root directory')
  .option('--verbose', 'Enable debug logging')
  .action(async (opts) => {
    const { runtimeHeal } = await import('./commands/runtime-heal.js');
    await runtimeHeal({
      test: opts.test,
      line: opts.line ? parseInt(opts.line, 10) : undefined,
      locator: opts.locator,
      project: opts.project,
      verbose: opts.verbose,
    });
  });

program
  .command('runtime-hardening')
  .description('Execute runtime hardening analysis for browser stability (Real Browser Runtime Hardening v1)')
  .option('--test <path>', 'Path to the test file to harden')
  .option('--project <path>', 'Project root directory')
  .option('--verbose', 'Enable debug logging')
  .action(async (opts) => {
    const { runtimeHardening } = await import('./commands/runtime-hardening.js');
    await runtimeHardening({
      test: opts.test,
      project: opts.project,
      verbose: opts.verbose,
    });
  });

program
  .command('run')
  .description('Execute unified TestGuardian workflow (Unified Execution Runtime v1)')
  .option('--repo <path>', 'Path to the repository to analyze and heal')
  .option('--sandbox', 'Enable sandbox verification')
  .option('--validate-only', 'Run validation only, skip healing')
  .option('--runtime-healing', 'Run runtime healing only')
  .option('--strict-governance', 'Use strict governance thresholds')
  .option('--report-only', 'Generate report only')
  .option('--verbose', 'Enable debug logging')
  .action(async (opts) => {
    const { run } = await import('./commands/run.js');
    await run({
      repo: opts.repo,
      sandbox: opts.sandbox,
      validateOnly: opts.validateOnly,
      runtimeHealing: opts.runtimeHealing,
      strictGovernance: opts.strictGovernance,
      reportOnly: opts.reportOnly,
      verbose: opts.verbose,
    });
  });

program
  .command('execution-lab')
  .description('Execute operational execution laboratory (Execution Lab v1)')
  .option('--corpus <path>', 'Path to repository corpus')
  .option('--iterations <number>', 'Number of execution iterations', '3')
  .option('--batch-size <number>', 'Number of repositories per batch', '10')
  .option('--subset <pattern>', 'Filter repositories by pattern')
  .option('--report-only', 'Generate report only, skip execution')
  .option('--verbose', 'Enable debug logging')
  .action(async (opts) => {
    const { executionLab } = await import('./commands/execution-lab.js');
    await executionLab({
      corpus: opts.corpus,
      iterations: parseInt(opts.iterations, 10),
      batchSize: parseInt(opts.batchSize, 10),
      subset: opts.subset,
      reportOnly: opts.reportOnly,
      verbose: opts.verbose,
    });
  });

program
  .command('review')
  .description('Generate developer-facing review reports (Developer Review Experience v1)')
  .option('--report <path>', 'Path to review bundle JSON report')
  .option('--json', 'Output as JSON')
  .option('--html', 'Output as HTML')
  .option('--compact', 'Output compact summary')
  .option('--full', 'Output full detailed report (default)')
  .option('--verbose', 'Enable debug logging')
  .action(async (opts) => {
    const { review } = await import('./commands/review.js');
    const format = opts.json ? 'json' : opts.html ? 'html' : opts.compact ? 'compact' : 'full';
    await review({
      report: opts.report,
      format: format as 'html' | 'json' | 'compact' | 'full',
      verbose: opts.verbose,
    });
  });

program
  .command('production-readiness')
  .description('Execute production readiness assessment (Production Readiness & Real-World Integration v1)')
  .option('--repo <path>', 'Path to repository to assess')
  .option('--profile', 'Include performance profiling')
  .option('--ci', 'Include CI integration report')
  .option('--package-audit', 'Include package readiness audit')
  .option('--verbose', 'Enable debug logging')
  .action(async (opts) => {
    const { productionReadiness } = await import('./commands/production-readiness.js');
    await productionReadiness({
      repo: opts.repo,
      profile: opts.profile,
      ci: opts.ci,
      packageAudit: opts.packageAudit,
      verbose: opts.verbose,
    });
  });

program
  .command('corpus-scale')
  .description('Execute large-scale corpus validation (Large Scale Corpus Execution v1)')
  .option('--corpus <path>', 'Path to benchmark corpus directory')
  .option('--batch-size <number>', 'Number of repositories per batch', '10')
  .option('--resume', 'Resume from previous execution state')
  .option('--failed-only', 'Re-run only failed repositories')
  .option('--report-only', 'Generate reports only, skip execution')
  .option('--verbose', 'Enable debug logging')
  .action(async (opts) => {
    const { corpusScale } = await import('./commands/corpus-scale.js');
    await corpusScale({
      corpus: opts.corpus,
      batchSize: parseInt(opts.batchSize, 10),
      resume: opts.resume,
      failedOnly: opts.failedOnly,
      reportOnly: opts.reportOnly,
      verbose: opts.verbose,
    });
  });

program
  .command('stabilization')
  .description('Execute stabilization analysis (Stabilization & Real-World Evidence v1)')
  .option('--corpus <path>', 'Path to benchmark corpus directory')
  .option('--batch-size <number>', 'Number of repositories per batch', '10')
  .option('--resume', 'Resume from previous execution state')
  .option('--report-only', 'Generate reports only, skip execution')
  .option('--verbose', 'Enable debug logging')
  .action(async (opts) => {
    const { stabilization } = await import('./commands/stabilization.js');
    await stabilization({
      corpus: opts.corpus,
      batchSize: parseInt(opts.batchSize, 10),
      resume: opts.resume,
      reportOnly: opts.reportOnly,
      verbose: opts.verbose,
    });
  });

program
  .command('alpha-prepare')
  .description('Prepare alpha release with consolidated reports (Alpha Consolidation & Packaging v1)')
  .option('--corpus <path>', 'Path to benchmark corpus directory')
  .option('--output <path>', 'Output directory for reports')
  .option('--verbose', 'Enable debug logging')
  .action(async (opts) => {
    const { alphaPrepare } = await import('./commands/alpha-prepare.js');
    await alphaPrepare({
      corpus: opts.corpus,
      output: opts.output,
      verbose: opts.verbose,
    });
  });

await program.parseAsync(process.argv);
