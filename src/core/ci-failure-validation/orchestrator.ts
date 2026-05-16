/**
 * CI Failure Validation Orchestrator
 *
 * Coordinates all validation components against real historical failures.
 */

import type {
  HistoricalFailure,
  FailureReplaySession,
  RealFailureClassification,
  RealFailureClassificationReport,
  HistoricalHealingValidationReport,
  ReplayStabilityReport,
  TrustworthinessBenchmarkReport,
  RealWorldFailureInventory,
  CIFailureValidationConfig,
} from './types.js';

import { FailureReplayEngine } from './failure-replay-engine.js';
import { RealFailureClassifier } from './failure-classifier.js';
import { HistoricalHealingValidator } from './healing-validator.js';
import { ReplayStabilityAnalyzer } from './replay-stability.js';
import { TrustworthinessBenchmarker } from './trustworthiness-benchmarker.js';
import { RealWorldFailureInventoryGenerator } from './failure-inventory.js';

export interface CIFailureValidationResult {
  replaySessions: FailureReplaySession[];
  classificationReport: RealFailureClassificationReport;
  healingValidationReport: HistoricalHealingValidationReport;
  stabilityReport: ReplayStabilityReport;
  trustworthinessReport: TrustworthinessBenchmarkReport;
  inventory: RealWorldFailureInventory;
}

export class CIFailureValidationOrchestrator {
  private replayEngine: FailureReplayEngine;
  private classifier: RealFailureClassifier;
  private healingValidator: HistoricalHealingValidator;
  private stabilityAnalyzer: ReplayStabilityAnalyzer;
  private trustworthinessBenchmarker: TrustworthinessBenchmarker;
  private inventoryGenerator: RealWorldFailureInventoryGenerator;

  constructor(config: CIFailureValidationConfig) {
    this.replayEngine = new FailureReplayEngine(config.replayAttempts ?? 5);
    this.classifier = new RealFailureClassifier();
    this.healingValidator = new HistoricalHealingValidator();
    this.stabilityAnalyzer = new ReplayStabilityAnalyzer();
    this.trustworthinessBenchmarker = new TrustworthinessBenchmarker();
    this.inventoryGenerator = new RealWorldFailureInventoryGenerator();
  }

  validate(failures: HistoricalFailure[]): CIFailureValidationResult {
    const replaySessions: FailureReplaySession[] = [];
    const replaySessionMap = new Map<string, FailureReplaySession>();

    for (const failure of failures) {
      const session = this.replayEngine.replayFailure(failure);
      replaySessions.push(session);
      replaySessionMap.set(failure.id, session);
    }

    const classificationReport = this.classifier.classifyBatch(failures, replaySessionMap);

    const classificationMap = new Map<string, RealFailureClassification>();
    for (const c of classificationReport.classifications) {
      classificationMap.set(c.failureId, c);
    }

    const healingValidationReport = this.healingValidator.validateBatch(
      failures,
      replaySessionMap,
      classificationMap
    );

    const stabilityReport = this.stabilityAnalyzer.analyzeBatch(failures, replaySessionMap);

    const stabilityMetricsMap = new Map<string, import('./types.js').ReplayStabilityMetrics>();
    for (const m of stabilityReport.metrics) {
      stabilityMetricsMap.set(m.failureId, m);
    }

    const trustworthinessReport = this.trustworthinessBenchmarker.benchmark(
      failures,
      replaySessionMap,
      classificationReport.classifications,
      healingValidationReport.validations,
      stabilityReport.metrics
    );

    const inventory = this.inventoryGenerator.generate(
      failures,
      replaySessionMap,
      classificationReport.classifications
    );

    return {
      replaySessions,
      classificationReport,
      healingValidationReport,
      stabilityReport,
      trustworthinessReport,
      inventory,
    };
  }

  generateSummary(result: CIFailureValidationResult): string {
    const lines: string[] = [];

    lines.push('═'.repeat(60));
    lines.push('CI FAILURE VALIDATION REPORT');
    lines.push('═'.repeat(60));
    lines.push('');

    lines.push('FAILURE CLASSIFICATION:');
    lines.push(`  Total Failures: ${result.classificationReport.totalFailures}`);
    lines.push(`  Deceptive: ${result.classificationReport.deceptiveCount}`);
    lines.push(`  Governance Ambiguous: ${result.classificationReport.governanceAmbiguousCount}`);
    lines.push('');

    lines.push('HEALING VALIDATION:');
    lines.push(`  Recovery Rate: ${(result.healingValidationReport.recoveryRate * 100).toFixed(0)}%`);
    lines.push(`  Risky Recovery Rate: ${(result.healingValidationReport.riskyRecoveryRate * 100).toFixed(0)}%`);
    lines.push(`  Replay Divergence Rate: ${(result.healingValidationReport.replayDivergenceRate * 100).toFixed(0)}%`);
    lines.push('');

    lines.push('REPLAY STABILITY:');
    lines.push(`  Overall Flaky Rate: ${(result.stabilityReport.overallFlakyRate * 100).toFixed(0)}%`);
    lines.push(`  Overall Reproducibility: ${(result.stabilityReport.overallReproducibility * 100).toFixed(0)}%`);
    lines.push(`  Timing Sensitive: ${result.stabilityReport.timingSensitiveCount}`);
    lines.push('');

    lines.push('TRUSTWORTHINESS:');
    lines.push(`  Governance Trustworthiness: ${(result.trustworthinessReport.governanceTrustworthiness * 100).toFixed(0)}%`);
    lines.push(`  Confidence Reliability: ${(result.trustworthinessReport.confidenceReliability * 100).toFixed(0)}%`);
    lines.push(`  Deceptive Detection Rate: ${(result.trustworthinessReport.deceptiveMutationDetectionRate * 100).toFixed(0)}%`);
    lines.push('');

    lines.push('FAILURE INVENTORY:');
    lines.push(`  Unsupported Patterns: ${result.inventory.unsupportedPatterns.length}`);
    lines.push(`  Unstable Replay Behaviors: ${result.inventory.unstableReplayBehaviors.length}`);
    lines.push(`  Deceptive Recovery Structures: ${result.inventory.deceptiveRecoveryStructures.length}`);
    lines.push(`  Governance Blind Spots: ${result.inventory.governanceBlindSpots.length}`);
    lines.push('');

    lines.push(result.trustworthinessReport.summary);
    lines.push('');
    lines.push('═'.repeat(60));

    return lines.join('\n');
  }
}