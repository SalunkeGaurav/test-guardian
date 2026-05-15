import { readdir, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { info, error, warn } from '../../logger/index.js';
import {
  RepositoryValidator,
  type RepositoryValidationReport,
} from '../repository-validator/index.js';
import {
  PatternIntelligence,
  type PatternIntelligenceReport,
} from '../pattern-intelligence/index.js';
import {
  HealingBenchmark,
  type HealingEffectivenessReport,
} from '../healing-benchmark/index.js';
import {
  HealingIntelligence,
  type HealingIntelligenceReport,
} from '../healing-intelligence/index.js';
import type {
  RepositoryCorpusIndex,
  RepositoryCorpusEntry,
  CorpusExecutionResult,
  CorpusAggregateReport,
  AggregateMetrics,
  RepositoryCorrelationReport,
  RepositoryClassification,
  FailureInventory,
  FrameworkType,
  LanguageType,
  BDDType,
  WrapperArchitecture,
  CorpusExecutionOptions,
} from './types.js';

function generateId(): string {
  return `corpus-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function detectFrameworkType(repoPath: string): FrameworkType {
  try {
    const packageJsonPath = join(repoPath, 'package.json');
    return 'playwright';
  } catch {
    return 'unknown';
  }
}

async function detectLanguageType(repoPath: string): Promise<LanguageType> {
  try {
    const files = await readdir(repoPath);
    const hasTs = files.some((f) => f.endsWith('.ts') || f.endsWith('.tsx'));
    const hasJs = files.some((f) => f.endsWith('.js') || f.endsWith('.jsx'));
    if (hasTs && hasJs) return 'mixed';
    if (hasTs) return 'typescript';
    if (hasJs) return 'javascript';
    return 'javascript';
  } catch {
    return 'javascript';
  }
}

async function detectBDDType(repoPath: string): Promise<BDDType> {
  try {
    const files = await readdir(join(repoPath, 'tests'));
    const hasCucumber = files.some(
      (f) => f.includes('.feature') || f.includes('cucumber')
    );
    if (hasCucumber) return 'cucumber';
    return 'none';
  } catch {
    return 'none';
  }
}

async function detectWrapperArchitecture(
  repoPath: string
): Promise<WrapperArchitecture> {
  try {
    const pageFactoryPath = join(repoPath, 'pageFactory');
    const hasFactory = await stat(pageFactoryPath).then(() => true).catch(() => false);
    const utilsPath = join(repoPath, 'utils');
    const hasUtils = await stat(utilsPath).then(() => true).catch(() => false);
    if (hasFactory && hasUtils) return 'heavy';
    if (hasFactory || hasUtils) return 'moderate';
    return 'lightweight';
  } catch {
    return 'lightweight';
  }
}

async function countTestFiles(repoPath: string): Promise<number> {
  try {
    const testsDir = join(repoPath, 'tests');
    const entries = await readdir(testsDir);
    return entries.filter((e) => e.endsWith('.spec.ts') || e.endsWith('.spec.js')).length;
  } catch {
    return 0;
  }
}

async function countPageObjects(repoPath: string): Promise<number> {
  try {
    const pagesDir = join(repoPath, 'pages');
    const entries = await readdir(pagesDir);
    return entries.filter((e) => e.endsWith('.ts') || e.endsWith('.js')).length;
  } catch {
    return 0;
  }
}

export async function discoverRepositories(
  corpusPath: string
): Promise<RepositoryCorpusIndex> {
  info('CorpusExecution', `Discovering repositories in: ${corpusPath}`);

  const entries = await readdir(corpusPath);
  const repositories: RepositoryCorpusEntry[] = [];

  for (const entry of entries.sort()) {
    const repoPath = join(corpusPath, entry);
    const stats = await stat(repoPath);

    if (!stats.isDirectory()) continue;

    const framework = detectFrameworkType(repoPath);
    const language = await detectLanguageType(repoPath);
    const bdd = await detectBDDType(repoPath);
    const wrapperArch = await detectWrapperArchitecture(repoPath);
    const testCount = await countTestFiles(repoPath);
    const pageObjectCount = await countPageObjects(repoPath);

    const repoEntry: RepositoryCorpusEntry = {
      id: generateId(),
      name: entry,
      path: repoPath,
      framework,
      language,
      bdd,
      wrapperArchitecture: wrapperArch,
      discoveredAt: Date.now(),
      testFileCount: testCount,
      pageObjectCount,
    };

    repositories.push(repoEntry);
    info('CorpusExecution', `Discovered: ${entry} (${framework}, ${language}, ${bdd})`);
  }

  const index: RepositoryCorpusIndex = {
    generatedAt: Date.now(),
    corpusPath,
    repositoryCount: repositories.length,
    repositories,
  };

  info('CorpusExecution', `Discovery complete. Found ${repositories.length} repositories`);
  return index;
}

export async function executeRepository(
  repoPath: string,
  order: number,
  verbose?: boolean
): Promise<CorpusExecutionResult> {
  const startTime = Date.now();
  const result: CorpusExecutionResult = {
    repositoryId: generateId(),
    repositoryPath: repoPath,
    executionOrder: order,
    executionTimeMs: 0,
    success: false,
  };

  try {
    info('CorpusExecution', `[${order}] Executing: ${repoPath}`);

    if (verbose) {
      info('CorpusExecution', `  Running repository validator...`);
    }
    const validator = new RepositoryValidator();
    result.validationReport = await validator.validateRepository(repoPath) as unknown;

    if (verbose) {
      info('CorpusExecution', `  Running pattern intelligence...`);
    }
    const patternExtractor = new PatternIntelligence();
    result.patternReport = await patternExtractor.extractIntelligence(repoPath) as unknown;

    if (verbose) {
      info('CorpusExecution', `  Running healing benchmark...`);
    }
    const benchmark = new HealingBenchmark();
    result.benchmarkReport = await benchmark.runBenchmark() as unknown;

    if (verbose) {
      info('CorpusExecution', `  Running healing intelligence...`);
    }
    const intelligence = new HealingIntelligence();
    result.intelligenceReport = await intelligence.analyzeHealingFailures() as unknown;

    result.success = true;
    info('CorpusExecution', `[${order}] Completed: ${repoPath}`);
  } catch (err) {
    error('CorpusExecution', `Error executing ${repoPath}: ${err instanceof Error ? err.message : String(err)}`);
    result.error = err instanceof Error ? err.message : String(err);
  }

  result.executionTimeMs = Date.now() - startTime;
  return result;
}

function extractStabilityMetrics(report: unknown): {
  parserSurvivability: number;
  compileStability: number;
  replayStability: number;
} {
  const validationReport = report as RepositoryValidationReport | undefined;
  if (!validationReport?.stabilityMetrics) {
    return { parserSurvivability: 0, compileStability: 0, replayStability: 0 };
  }
  return {
    parserSurvivability: validationReport.stabilityMetrics.parserSurvivability,
    compileStability: validationReport.stabilityMetrics.compileStability,
    replayStability: validationReport.stabilityMetrics.replayStability,
  };
}

function extractHealingMetrics(report: unknown): {
  recoveryRate: number;
  riskyRecoveryRate: number;
  governanceRejectionRate: number;
} {
  const benchmarkReport = report as HealingEffectivenessReport | undefined;
  if (!benchmarkReport) {
    return { recoveryRate: 0, riskyRecoveryRate: 0, governanceRejectionRate: 0 };
  }
  return {
    recoveryRate: benchmarkReport.overallRecoveryRate,
    riskyRecoveryRate: benchmarkReport.falsePositiveRate,
    governanceRejectionRate: benchmarkReport.governanceRejectionRate,
  };
}

function extractConfidenceMetrics(report: unknown): {
  high: number;
  moderate: number;
  low: number;
  average: number;
} {
  const intelligenceReport = report as HealingIntelligenceReport | undefined;
  if (!intelligenceReport?.confidenceCalibration) {
    return { high: 0, moderate: 0, low: 0, average: 0 };
  }
  const calibration = intelligenceReport.confidenceCalibration;
  const reliability = calibration.confidenceReliability || [];
  const high = reliability.find((r) => r.confidenceBand === 'high')?.accuracy || 0;
  const moderate = reliability.find((r) => r.confidenceBand === 'moderate')?.accuracy || 0;
  const low = reliability.find((r) => r.confidenceBand === 'low')?.accuracy || 0;
  return {
    high,
    moderate,
    low,
    average: (high + moderate + low) / 3,
  };
}

function calculateAggregateMetrics(results: CorpusExecutionResult[]): AggregateMetrics {
  const stabilityMetrics = results.map((r) => extractStabilityMetrics(r.validationReport));
  const healingMetrics = results.map((r) => extractHealingMetrics(r.benchmarkReport));
  const confidenceMetrics = results.map((r) => extractConfidenceMetrics(r.intelligenceReport));

  const extractDistribution = (values: number[]): Record<string, number> => {
    const ranges = { '0-25': 0, '26-50': 0, '51-75': 0, '76-100': 0 };
    values.forEach((v) => {
      if (v <= 25) ranges['0-25']++;
      else if (v <= 50) ranges['26-50']++;
      else if (v <= 75) ranges['51-75']++;
      else ranges['76-100']++;
    });
    return ranges;
  };

  const extractStats = (values: number[]) => ({
    average: values.reduce((a, b) => a + b, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    distribution: extractDistribution(values),
  });

  return {
    parserSurvivability: extractStats(stabilityMetrics.map((m) => m.parserSurvivability)),
    compileStability: extractStats(stabilityMetrics.map((m) => m.compileStability)),
    replayStability: extractStats(stabilityMetrics.map((m) => m.replayStability)),
    healingRecoveryRate: extractStats(healingMetrics.map((m) => m.recoveryRate)),
    riskyRecoveryRate: extractStats(healingMetrics.map((m) => m.riskyRecoveryRate)),
    governanceRejectionRate: extractStats(healingMetrics.map((m) => m.governanceRejectionRate)),
    confidenceAccuracy: {
      highConfidence: confidenceMetrics.reduce((a, c) => a + c.high, 0) / confidenceMetrics.length,
      moderateConfidence: confidenceMetrics.reduce((a, c) => a + c.moderate, 0) / confidenceMetrics.length,
      lowConfidence: confidenceMetrics.reduce((a, c) => a + c.low, 0) / confidenceMetrics.length,
      average: confidenceMetrics.reduce((a, c) => a + c.average, 0) / confidenceMetrics.length,
    },
    mutationRiskDistribution: {},
  };
}

export async function runCorpusExecution(
  options: CorpusExecutionOptions
): Promise<CorpusAggregateReport> {
  const { corpusPath, verbose } = options;

  info('CorpusExecution', `Starting corpus execution against: ${corpusPath}`);

  const index = await discoverRepositories(corpusPath);

  const results: CorpusExecutionResult[] = [];
  for (let i = 0; i < index.repositories.length; i++) {
    const repo = index.repositories[i];
    if (!repo) continue;
    const result = await executeRepository(repo.path, i + 1, verbose);
    result.repositoryId = repo.id;
    results.push(result);
  }

  const aggregateMetrics = calculateAggregateMetrics(results);

  const report: CorpusAggregateReport = {
    id: generateId(),
    generatedAt: Date.now(),
    corpusPath,
    totalRepositories: index.repositoryCount,
    executionResults: results,
    aggregateMetrics,
  };

  info('CorpusExecution', `Corpus execution complete. ${results.filter((r) => r.success).length}/${results.length} succeeded`);
  return report;
}

export function generateCorrelationReport(
  aggregateReport: CorpusAggregateReport,
  corpusIndex: RepositoryCorpusIndex
): RepositoryCorrelationReport {
  const correlatedFailures: unknown[] = [];
  const structuralPatterns: unknown[] = [];

  for (const result of aggregateReport.executionResults) {
    if (!result.success) continue;
    const patternReport = result.patternReport as PatternIntelligenceReport | undefined;
    if (!patternReport) continue;
  }

  return {
    id: generateId(),
    generatedAt: Date.now(),
    correlatedFailures: correlatedFailures as unknown as import('./types').FailureCorrelation[],
    structuralPatterns: structuralPatterns as unknown as import('./types').StructuralPattern[],
    recommendations: [],
  };
}

export function classifyRepositories(
  aggregateReport: CorpusAggregateReport,
  corpusIndex: RepositoryCorpusIndex
): RepositoryClassification[] {
  const classifications: RepositoryClassification[] = [];

  for (let i = 0; i < aggregateReport.executionResults.length; i++) {
    const result = aggregateReport.executionResults[i];
    const repo = corpusIndex.repositories[i];
    if (!result || !repo) continue;

    let classification: import('./types').CompatibilityClassification = 'fully-supported';
    const evidence: import('./types').ClassificationEvidence[] = [];

    const stability = extractStabilityMetrics(result.validationReport);
    const healing = extractHealingMetrics(result.benchmarkReport);
    const confidence = extractConfidenceMetrics(result.intelligenceReport);

    if (stability.parserSurvivability < 50 || healing.recoveryRate < 50) {
      classification = 'unsupported-architecture';
      evidence.push({ metric: 'parserSurvivability', value: stability.parserSurvivability, threshold: '>=50', passed: false });
    } else if (stability.replayStability < 60) {
      classification = 'replay-fragile';
      evidence.push({ metric: 'replayStability', value: stability.replayStability, threshold: '>=60', passed: false });
    } else if (healing.riskyRecoveryRate > 30) {
      classification = 'mutation-risk-heavy';
      evidence.push({ metric: 'riskyRecoveryRate', value: healing.riskyRecoveryRate, threshold: '<=30', passed: false });
    } else if (healing.governanceRejectionRate > 25) {
      classification = 'governance-unstable';
      evidence.push({ metric: 'governanceRejectionRate', value: healing.governanceRejectionRate, threshold: '<=25', passed: false });
    } else if (stability.parserSurvivability < 80 || healing.recoveryRate < 80) {
      classification = 'partially-supported';
    }

    const confidenceScore = (stability.parserSurvivability + stability.compileStability + stability.replayStability + healing.recoveryRate + confidence.average) / 5;

    classifications.push({
      repositoryId: result.repositoryId,
      repositoryPath: result.repositoryPath,
      classification,
      evidence,
      confidence: confidenceScore,
    });
  }

  return classifications;
}

export function generateFailureInventory(
  aggregateReport: CorpusAggregateReport,
  corpusIndex: RepositoryCorpusIndex,
  classifications: RepositoryClassification[]
): FailureInventory {
  const unsupportedPatterns: import('./types').UnsupportedPattern[] = [];
  const replayInstabilitySources: import('./types').ReplayInstabilitySource[] = [];
  const riskyHealingStructures: import('./types').RiskyHealingStructure[] = [];
  const confidenceCalibrationFailures: import('./types').ConfidenceCalibrationFailure[] = [];
  const parserLimitations: import('./types').ParserLimitation[] = [];
  const governanceWeaknesses: import('./types').GovernanceWeakness[] = [];

  for (const result of aggregateReport.executionResults) {
    if (!result.success) continue;

    const validationReport = result.validationReport as RepositoryValidationReport | undefined;
    const patternReport = result.patternReport as PatternIntelligenceReport | undefined;
    const benchmarkReport = result.benchmarkReport as HealingEffectivenessReport | undefined;
    const intelligenceReport = result.intelligenceReport as HealingIntelligenceReport | undefined;

    if (validationReport?.parserResults?.unsupportedSyntax) {
      for (const syntax of validationReport.parserResults.unsupportedSyntax) {
        const existing = parserLimitations.find((p) => p.limitation === syntax);
        if (existing) {
          existing.occurrenceCount++;
          if (!existing.affectedRepositories.includes(result.repositoryPath)) {
            existing.affectedRepositories.push(result.repositoryPath);
          }
        } else {
          parserLimitations.push({
            limitation: syntax,
            syntaxType: 'unknown',
            occurrenceCount: 1,
            affectedRepositories: [result.repositoryPath],
          });
        }
      }
    }

    if (patternReport?.replayRiskIntelligence) {
      const risks = patternReport.replayRiskIntelligence;
      if (risks.navigationRisks?.length) {
        for (const risk of risks.navigationRisks) {
          const existing = replayInstabilitySources.find((s) => s.source === risk.type);
          if (existing) {
            existing.occurrenceCount += risk.count;
          } else {
            replayInstabilitySources.push({
              source: risk.type,
              type: risk.type,
              occurrenceCount: risk.count,
              severity: risk.severity,
              affectedRepositories: [result.repositoryPath],
            });
          }
        }
      }
    }

    if (benchmarkReport?.riskyHealingPatterns) {
      for (const pattern of benchmarkReport.riskyHealingPatterns) {
        const existing = riskyHealingStructures.find((s) => s.structure === pattern.pattern);
        if (existing) {
          existing.occurrenceCount += pattern.occurrenceCount;
        } else {
          riskyHealingStructures.push({
            structure: pattern.pattern,
            riskLevel: pattern.riskLevel,
            occurrenceCount: pattern.occurrenceCount,
            falsePositiveCorrelation: 0,
            affectedRepositories: [result.repositoryPath],
          });
        }
      }
    }

    if (intelligenceReport?.confidenceCalibration?.weakScoringSignals) {
      for (const signal of intelligenceReport.confidenceCalibration.weakScoringSignals) {
        const existing = confidenceCalibrationFailures.find((f) => f.signal === signal.signal);
        if (existing) {
          existing.occurrenceCount++;
        } else {
          confidenceCalibrationFailures.push({
            signal: signal.signal,
            calibrationError: 100 - signal.reliabilityScore,
            occurrenceCount: 1,
            affectedRepositories: [result.repositoryPath],
          });
        }
      }
    }

    if (intelligenceReport?.validationFailureAnalysis?.governanceRejections) {
      for (const rejection of intelligenceReport.validationFailureAnalysis.governanceRejections) {
        const existing = governanceWeaknesses.find((w) => w.weakness === rejection.reason);
        if (existing) {
          existing.occurrenceCount += rejection.count;
        } else {
          governanceWeaknesses.push({
            weakness: rejection.reason,
            thresholdViolated: rejection.thresholdViolated,
            occurrenceCount: rejection.count,
            affectedRepositories: [result.repositoryPath],
          });
        }
      }
    }
  }

  return {
    id: generateId(),
    generatedAt: Date.now(),
    unsupportedPatterns,
    replayInstabilitySources,
    riskyHealingStructures,
    confidenceCalibrationFailures,
    parserLimitations,
    governanceWeaknesses,
  };
}

export function generateCorpusSummary(aggregateReport: CorpusAggregateReport): string {
  const lines: string[] = [];
  const metrics = aggregateReport.aggregateMetrics;

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('            CORPUS AGGREGATE REPORT');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Total Repositories: ${aggregateReport.totalRepositories}`);
  lines.push(`Execution Time: ${aggregateReport.executionResults.reduce((a, r) => a + r.executionTimeMs, 0)}ms`);
  lines.push('');

  lines.push('─── Parser Survivability ───');
  lines.push(`  Average: ${metrics.parserSurvivability.average.toFixed(1)}%`);
  lines.push(`  Range: ${metrics.parserSurvivability.min.toFixed(1)}% - ${metrics.parserSurvivability.max.toFixed(1)}%`);
  lines.push('');

  lines.push('─── Compile Stability ───');
  lines.push(`  Average: ${metrics.compileStability.average.toFixed(1)}%`);
  lines.push(`  Range: ${metrics.compileStability.min.toFixed(1)}% - ${metrics.compileStability.max.toFixed(1)}%`);
  lines.push('');

  lines.push('─── Replay Stability ───');
  lines.push(`  Average: ${metrics.replayStability.average.toFixed(1)}%`);
  lines.push(`  Range: ${metrics.replayStability.min.toFixed(1)}% - ${metrics.replayStability.max.toFixed(1)}%`);
  lines.push('');

  lines.push('─── Healing Recovery Rate ───');
  lines.push(`  Average: ${metrics.healingRecoveryRate.average.toFixed(1)}%`);
  lines.push(`  Range: ${metrics.healingRecoveryRate.min.toFixed(1)}% - ${metrics.healingRecoveryRate.max.toFixed(1)}%`);
  lines.push('');

  lines.push('─── Risky Recovery Rate ───');
  lines.push(`  Average: ${metrics.riskyRecoveryRate.average.toFixed(1)}%`);
  lines.push('');

  lines.push('─── Governance Rejection Rate ───');
  lines.push(`  Average: ${metrics.governanceRejectionRate.average.toFixed(1)}%`);
  lines.push('');

  lines.push('─── Confidence Accuracy ───');
  lines.push(`  High: ${metrics.confidenceAccuracy.highConfidence.toFixed(1)}%`);
  lines.push(`  Moderate: ${metrics.confidenceAccuracy.moderateConfidence.toFixed(1)}%`);
  lines.push(`  Low: ${metrics.confidenceAccuracy.lowConfidence.toFixed(1)}%`);
  lines.push(`  Average: ${metrics.confidenceAccuracy.average.toFixed(1)}%`);
  lines.push('');

  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

export function generateClassificationSummary(classifications: RepositoryClassification[]): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('            REPOSITORY COMPATIBILITY CLASSIFICATIONS');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  const counts: Record<string, number> = {};
  for (const c of classifications) {
    counts[c.classification] = (counts[c.classification] || 0) + 1;
  }

  for (const [classification, count] of Object.entries(counts)) {
    lines.push(`  ${classification}: ${count}`);
  }
  lines.push('');

  for (const c of classifications) {
    const repoName = c.repositoryPath.split(/[/\\]/).pop() || c.repositoryPath;
    lines.push(`  • ${repoName}: ${c.classification} (${c.confidence.toFixed(0)}% confidence)`);
  }

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

export function generateFailureInventorySummary(inventory: FailureInventory): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                    FAILURE INVENTORY');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  lines.push(`Parser Limitations: ${inventory.parserLimitations.length}`);
  for (const p of inventory.parserLimitations.slice(0, 5)) {
    lines.push(`  - ${p.limitation} (${p.occurrenceCount} occurrences)`);
  }

  lines.push('');
  lines.push(`Replay Instability Sources: ${inventory.replayInstabilitySources.length}`);
  for (const s of inventory.replayInstabilitySources.slice(0, 5)) {
    lines.push(`  - ${s.source}: ${s.occurrenceCount} (${s.severity})`);
  }

  lines.push('');
  lines.push(`Risky Healing Structures: ${inventory.riskyHealingStructures.length}`);
  for (const s of inventory.riskyHealingStructures.slice(0, 5)) {
    lines.push(`  - ${s.structure}: ${s.occurrenceCount} (${s.riskLevel})`);
  }

  lines.push('');
  lines.push(`Confidence Calibration Failures: ${inventory.confidenceCalibrationFailures.length}`);
  for (const f of inventory.confidenceCalibrationFailures.slice(0, 5)) {
    lines.push(`  - ${f.signal}: ${f.calibrationError.toFixed(0)}% error`);
  }

  lines.push('');
  lines.push(`Governance Weaknesses: ${inventory.governanceWeaknesses.length}`);
  for (const w of inventory.governanceWeaknesses.slice(0, 5)) {
    lines.push(`  - ${w.weakness}: ${w.occurrenceCount} occurrences`);
  }

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}