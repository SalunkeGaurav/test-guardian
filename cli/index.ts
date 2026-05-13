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

await program.parseAsync(process.argv);
