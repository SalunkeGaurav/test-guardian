/**
 * CI Failure Validation CLI Command
 *
 * Implements Real CI Failure Replay Validation v1.
 * Validates the platform against real historical automation failures.
 */

import { info, error } from '../../src/logger/index.js';
import {
  CIFailureValidationOrchestrator,
  CIFailureValidationStorage,
} from '../../src/core/ci-failure-validation/index.js';
import type {
  HistoricalFailure,
  CIFailureValidationConfig,
} from '../../src/core/ci-failure-validation/types.js';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface CIFailureValidationOptions {
  corpusPath?: string;
  replayAttempts?: number;
  enableHealingValidation?: boolean;
  enableStabilityAnalysis?: boolean;
  enableTrustworthinessBenchmark?: boolean;
  verbose?: boolean;
}

function loadFailureCorpus(corpusPath?: string): HistoricalFailure[] {
  if (corpusPath && existsSync(corpusPath)) {
    try {
      const data = readFileSync(corpusPath, 'utf-8');
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  }

  const defaultPath = join(process.cwd(), '.testguardian', 'ci-failure-validation', 'failures');
  if (existsSync(defaultPath)) {
    const { readdirSync } = require('node:fs');
    const files = readdirSync(defaultPath).filter((f: string) => f.endsWith('.json'));
    const failures: HistoricalFailure[] = [];

    for (const file of files) {
      try {
        const data = readFileSync(join(defaultPath, file), 'utf-8');
        const failure = JSON.parse(data) as HistoricalFailure;
        failures.push(failure);
      } catch {
      }
    }

    return failures;
  }

  return generateSampleFailures();
}

function generateSampleFailures(): HistoricalFailure[] {
  return [
    {
      id: 'sample-failure-001',
      sourceRepository: 'sample-repo',
      testFile: 'tests/login.spec.ts',
      testName: 'should login successfully',
      framework: 'playwright',
      originalSelector: '#login-button',
      failureReason: 'Element not found: #login-button',
      category: 'selector-drift',
      severity: 'high',
      timestamp: Date.now() - 86400000,
      flakyHistory: {
        failureCount: 8,
        passCount: 12,
        lastFlakyDate: Date.now() - 3600000,
      },
    },
    {
      id: 'sample-failure-002',
      sourceRepository: 'sample-repo',
      testFile: 'tests/checkout.spec.ts',
      testName: 'should complete checkout',
      framework: 'playwright',
      originalSelector: '[data-testid="checkout-button"]',
      failureReason: 'Timeout waiting for element to be visible',
      category: 'async-timing-failure',
      severity: 'critical',
      timestamp: Date.now() - 172800000,
      flakyHistory: {
        failureCount: 15,
        passCount: 5,
        lastFlakyDate: Date.now() - 7200000,
      },
    },
    {
      id: 'sample-failure-003',
      sourceRepository: 'sample-repo',
      testFile: 'tests/dashboard.spec.ts',
      testName: 'should display dashboard',
      framework: 'playwright',
      originalSelector: '.dashboard-container',
      failureReason: 'Multiple elements match selector - ambiguous',
      category: 'governance-ambiguity',
      severity: 'medium',
      timestamp: Date.now() - 259200000,
    },
    {
      id: 'sample-failure-004',
      sourceRepository: 'sample-repo',
      testFile: 'tests/modal.spec.ts',
      testName: 'should handle modal dialog',
      framework: 'playwright',
      originalSelector: '#modal-overlay iframe.content',
      failureReason: 'Cannot access iframe content - unsupported structure',
      category: 'unsupported-structure',
      severity: 'high',
      timestamp: Date.now() - 345600000,
    },
    {
      id: 'sample-failure-005',
      sourceRepository: 'sample-repo',
      testFile: 'tests/form.spec.ts',
      testName: 'should submit form',
      framework: 'playwright',
      originalSelector: 'button[type="submit"]',
      failureReason: 'Element matched but wrong target - deceptive successful replay',
      category: 'deceptive-successful-replay',
      severity: 'high',
      timestamp: Date.now() - 432000000,
      flakyHistory: {
        failureCount: 3,
        passCount: 17,
        lastFlakyDate: Date.now() - 1800000,
      },
    },
  ];
}

export async function runCIFailureValidation(options: CIFailureValidationOptions): Promise<void> {
  info('CLI', 'Real CI Failure Replay Validation v1');

  try {
    const config: CIFailureValidationConfig = {
      failureCorpusPath: options.corpusPath,
      replayAttempts: options.replayAttempts ?? 5,
      enableHealingValidation: options.enableHealingValidation ?? true,
      enableStabilityAnalysis: options.enableStabilityAnalysis ?? true,
      enableTrustworthinessBenchmark: options.enableTrustworthinessBenchmark ?? true,
    };

    const failures = loadFailureCorpus(options.corpusPath);

    if (failures.length === 0) {
      info('CLI', 'No failure corpus found. Using sample failures for demonstration.');
    }

    info('CLI', `Validating against ${failures.length} historical failures...`);

    const orchestrator = new CIFailureValidationOrchestrator(config);
    const storage = new CIFailureValidationStorage(process.cwd());

    const result = orchestrator.validate(failures);

    for (const failure of failures) {
      storage.saveFailure(failure);
    }

    for (const session of result.replaySessions) {
      storage.saveReplaySession(session);
    }

    storage.saveClassificationReport(result.classificationReport);
    storage.saveHealingValidationReport(result.healingValidationReport);
    storage.saveStabilityReport(result.stabilityReport);
    storage.saveTrustworthinessReport(result.trustworthinessReport);
    storage.saveInventory(result.inventory);

    console.log(orchestrator.generateSummary(result));

    info('CLI', 'Validation complete. Reports saved to .testguardian/ci-failure-validation/');
  } catch (err) {
    error('CLI', `CI failure validation failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}