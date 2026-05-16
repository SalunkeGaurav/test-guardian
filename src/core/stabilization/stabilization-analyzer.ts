/**
 * Stabilization Analyzer
 *
 * Main orchestrator for stabilization analysis.
 * Runs full operational validation across the real repository corpus
 * and generates evidence-driven stabilization priorities.
 *
 * Reuses:
 * - CorpusDiscovery
 * - RepositoryExecutionRunner
 * - CrossRepositoryAggregator
 * - ArchitectureAuditor
 * - SimplificationDetector
 * - AlphaReadinessAssessor
 * - RepositoryValidator
 * - UnifiedRuntime
 *
 * No Date.now(). No Math.random(). Deterministic only.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CorpusDiscovery } from '../large-scale-corpus/corpus-discovery.js';
import { RepositoryExecutionRunner } from '../large-scale-corpus/repository-execution-runner.js';
import { CrossRepositoryAggregator } from '../large-scale-corpus/cross-repository-aggregator.js';
import { ArchitectureAuditor } from './architecture-auditor.js';
import { SimplificationDetector } from './simplification-detector.js';
import { AlphaReadinessAssessor } from './alpha-readiness.js';
import type {
  StabilizationReport,
  StabilizationInput,
  StabilizationSummary,
  HighestRiskPatterns,
  RiskPattern,
  ReplayInstabilityReport,
  ReplayInstabilityHotspot,
  GovernanceWeaknessesReport,
  GovernanceWeakness,
  UnsupportedStructuresReport,
  UnsupportedStructure,
  PerformanceBottlenecksReport,
  PerformanceBottleneckDetail,
  RecoveryQualityReport,
  RecoveryQualityMetric,
  FalseConfidenceReport,
  FalseConfidenceIndicator,
  RepositoryExecutionResult,
} from './types.js';

let reportCounter = 0;
function nextReportId(): string {
  reportCounter++;
  return `stabilization-${reportCounter}`;
}

export class StabilizationAnalyzer {
  private readonly corpusDiscovery: CorpusDiscovery;
  private readonly executionRunner: RepositoryExecutionRunner;
  private readonly aggregator: CrossRepositoryAggregator;
  private readonly architectureAuditor: ArchitectureAuditor;
  private readonly simplificationDetector: SimplificationDetector;
  private readonly alphaReadinessAssessor: AlphaReadinessAssessor;

  constructor(private readonly projectRoot: string) {
    this.corpusDiscovery = new CorpusDiscovery();
    this.executionRunner = new RepositoryExecutionRunner(projectRoot);
    this.aggregator = new CrossRepositoryAggregator();
    this.architectureAuditor = new ArchitectureAuditor();
    this.simplificationDetector = new SimplificationDetector();
    this.alphaReadinessAssessor = new AlphaReadinessAssessor();
  }

  async execute(input: StabilizationInput): Promise<StabilizationReport> {
    const { corpusPath, batchSize = 10, resume = false, reportOnly = false } = input;
    const reportId = nextReportId();

    // Step 1: Discover repositories
    const inventory = this.corpusDiscovery.discover(corpusPath);

    if (inventory.totalRepositories === 0) {
      return this.emptyReport(reportId, corpusPath);
    }

    // Step 2: Execute repositories
    const results: RepositoryExecutionResult[] = [];
    const repoPaths = inventory.repositories.map((r) => r.path);

    for (const repoPath of repoPaths) {
      const result = await this.executionRunner.execute(repoPath, reportOnly);
      results.push(result);
    }

    // Step 3: Aggregate results
    const aggregation = this.aggregator.aggregate(corpusPath, results);

    // Step 4: Generate stabilization reports
    const summary = this.generateSummary(reportId, corpusPath, results);
    const highestRiskPatterns = this.generateHighestRiskPatterns(results);
    const replayInstability = this.generateReplayInstabilityReport(results);
    const governanceWeaknesses = this.generateGovernanceWeaknessesReport(results);
    const unsupportedStructures = this.generateUnsupportedStructuresReport(results);
    const architecturalHotspots = this.architectureAuditor.audit(this.projectRoot);
    const performanceBottlenecks = this.generatePerformanceBottlenecksReport(results);
    const recoveryQuality = this.generateRecoveryQualityReport(results);
    const falseConfidence = this.generateFalseConfidenceReport(results);
    const simplificationOpportunities = this.simplificationDetector.detect(this.projectRoot);
    const alphaReadiness = this.alphaReadinessAssessor.assess(results);

    // Step 5: Persist reports
    const persistedPaths = this.persistReports(
      reportId,
      corpusPath,
      summary,
      highestRiskPatterns,
      replayInstability,
      governanceWeaknesses,
      unsupportedStructures,
      architecturalHotspots,
      performanceBottlenecks,
      recoveryQuality,
      falseConfidence,
      simplificationOpportunities,
      alphaReadiness,
    );

    return {
      reportId,
      corpusPath,
      summary,
      highestRiskPatterns,
      replayInstability,
      governanceWeaknesses,
      unsupportedStructures,
      architecturalHotspots,
      performanceBottlenecks,
      recoveryQuality,
      falseConfidence,
      simplificationOpportunities,
      alphaReadiness,
      persistedPaths,
      generatedAt: 0,
    };
  }

  private generateSummary(
    reportId: string,
    corpusPath: string,
    results: RepositoryExecutionResult[],
  ): StabilizationSummary {
    const completed = results.filter((r) => r.status === 'completed');
    const failed = results.filter((r) => r.status === 'failed');
    const total = results.length;

    const successRate = total > 0 ? completed.length / total : 0;
    const overallStabilityScore = Math.round(successRate * 100);

    const criticalIssues = results.filter((r) => r.error?.includes('critical')).length;
    const highIssues = results.filter((r) => r.error?.includes('high') || r.replayInstability).length;
    const mediumIssues = results.filter((r) => r.error?.includes('medium') || r.governanceRejectionRate !== undefined && r.governanceRejectionRate > 0.1).length;
    const lowIssues = results.filter((r) => r.error?.includes('low')).length;

    return {
      summaryId: reportId,
      corpusPath,
      totalRepositories: total,
      completedRepositories: completed.length,
      failedRepositories: failed.length,
      overallStabilityScore,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      generatedAt: 0,
    };
  }

  private generateHighestRiskPatterns(results: RepositoryExecutionResult[]): HighestRiskPatterns {
    const patterns: RiskPattern[] = [];

    // Unsupported patterns
    const unsupportedMap = new Map<string, { frequency: number; repos: string[] }>();
    for (const result of results) {
      if (!result.unsupportedPatterns) continue;
      for (const pattern of result.unsupportedPatterns) {
        const existing = unsupportedMap.get(pattern) ?? { frequency: 0, repos: [] };
        existing.frequency++;
        if (!existing.repos.includes(result.repoPath)) {
          existing.repos.push(result.repoPath);
        }
        unsupportedMap.set(pattern, existing);
      }
    }

    for (const [pattern, data] of unsupportedMap) {
      patterns.push({
        pattern,
        frequency: data.frequency,
        affectedRepositories: data.repos.sort(),
        severity: data.frequency > 5 ? 'critical' : data.frequency > 2 ? 'high' : 'medium',
        category: 'unsupported-pattern',
        description: `Unsupported pattern: ${pattern}`,
      });
    }

    // Replay instability patterns
    const replayInstableResults = results.filter((r) => r.replayInstability);
    if (replayInstableResults.length > 0) {
      patterns.push({
        pattern: 'replay-instability',
        frequency: replayInstableResults.length,
        affectedRepositories: replayInstableResults.map((r) => r.repoPath).sort(),
        severity: replayInstableResults.length > 10 ? 'critical' : replayInstableResults.length > 5 ? 'high' : 'medium',
        category: 'replay-instability',
        description: 'Replay instability detected',
      });
    }

    // Governance rejection patterns
    const highRejectionResults = results.filter((r) => r.governanceRejectionRate !== undefined && r.governanceRejectionRate > 0.2);
    if (highRejectionResults.length > 0) {
      patterns.push({
        pattern: 'high-governance-rejection',
        frequency: highRejectionResults.length,
        affectedRepositories: highRejectionResults.map((r) => r.repoPath).sort(),
        severity: highRejectionResults.length > 5 ? 'critical' : 'high',
        category: 'governance',
        description: 'High governance rejection rate',
      });
    }

    return {
      reportId: `risk-patterns-${reportCounter}`,
      patterns: patterns.sort((a, b) => b.frequency - a.frequency),
      totalPatterns: patterns.length,
      criticalPatterns: patterns.filter((p) => p.severity === 'critical').length,
      highPatterns: patterns.filter((p) => p.severity === 'high').length,
      generatedAt: 0,
    };
  }

  private generateReplayInstabilityReport(results: RepositoryExecutionResult[]): ReplayInstabilityReport {
    const hotspots: ReplayInstabilityHotspot[] = [];

    for (const result of results) {
      if (result.replayInstability) {
        hotspots.push({
          repository: result.name,
          category: result.category,
          instabilityType: 'replay-instability',
          frequency: 1,
          severity: result.status === 'failed' ? 'critical' : 'high',
          details: result.error ?? 'Replay instability detected',
        });
      }
    }

    const categoryMap = new Map<string, number>();
    for (const hotspot of hotspots) {
      const count = categoryMap.get(hotspot.category) ?? 0;
      categoryMap.set(hotspot.category, count + 1);
    }

    const mostUnstableCategory = [...categoryMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'none';

    return {
      reportId: `replay-instability-${reportCounter}`,
      hotspots: hotspots.sort((a, b) => a.repository.localeCompare(b.repository)),
      totalHotspots: hotspots.length,
      mostUnstableCategory,
      generatedAt: 0,
    };
  }

  private generateGovernanceWeaknessesReport(results: RepositoryExecutionResult[]): GovernanceWeaknessesReport {
    const weaknesses: GovernanceWeakness[] = [];

    const rejectionMap = new Map<string, { repos: string[]; totalRate: number; count: number }>();
    for (const result of results) {
      if (result.governanceRejectionRate !== undefined && result.governanceRejectionRate > 0) {
        const key = `rejection-rate-${(result.governanceRejectionRate * 100).toFixed(0)}%`;
        const existing = rejectionMap.get(key) ?? { repos: [], totalRate: 0, count: 0 };
        existing.repos.push(result.repoPath);
        existing.totalRate += result.governanceRejectionRate;
        existing.count++;
        rejectionMap.set(key, existing);
      }
    }

    for (const [weakness, data] of rejectionMap) {
      const avgRate = data.totalRate / data.count;
      weaknesses.push({
        weakness,
        affectedRepositories: data.repos.sort(),
        rejectionRate: avgRate,
        severity: avgRate > 0.5 ? 'critical' : avgRate > 0.3 ? 'high' : avgRate > 0.1 ? 'medium' : 'low',
        description: `Governance rejection rate: ${(avgRate * 100).toFixed(1)}%`,
      });
    }

    const overallHealth = weaknesses.length === 0
      ? 'healthy'
      : weaknesses.some((w) => w.severity === 'critical')
        ? 'critical'
        : weaknesses.some((w) => w.severity === 'high')
          ? 'unhealthy'
          : 'moderate';

    return {
      reportId: `governance-weaknesses-${reportCounter}`,
      weaknesses: weaknesses.sort((a, b) => b.rejectionRate - a.rejectionRate),
      totalWeaknesses: weaknesses.length,
      overallGovernanceHealth: overallHealth,
      generatedAt: 0,
    };
  }

  private generateUnsupportedStructuresReport(results: RepositoryExecutionResult[]): UnsupportedStructuresReport {
    const structures: UnsupportedStructure[] = [];

    const structureMap = new Map<string, { frequency: number; repos: string[] }>();
    for (const result of results) {
      if (!result.unsupportedPatterns) continue;
      for (const pattern of result.unsupportedPatterns) {
        const existing = structureMap.get(pattern) ?? { frequency: 0, repos: [] };
        existing.frequency++;
        if (!existing.repos.includes(result.repoPath)) {
          existing.repos.push(result.repoPath);
        }
        structureMap.set(pattern, existing);
      }
    }

    for (const [structure, data] of structureMap) {
      structures.push({
        structure,
        frequency: data.frequency,
        affectedRepositories: data.repos.sort(),
        severity: data.frequency > 5 ? 'critical' : data.frequency > 2 ? 'high' : 'medium',
        category: 'unsupported-structure',
      });
    }

    const mostCommon = structures.sort((a, b) => b.frequency - a.frequency)[0]?.structure ?? 'none';

    return {
      reportId: `unsupported-structures-${reportCounter}`,
      structures: structures.sort((a, b) => b.frequency - a.frequency),
      totalStructures: structures.length,
      mostCommonStructure: mostCommon,
      generatedAt: 0,
    };
  }

  private generatePerformanceBottlenecksReport(results: RepositoryExecutionResult[]): PerformanceBottlenecksReport {
    const bottlenecks: PerformanceBottleneckDetail[] = [];

    const stageMap = new Map<string, { durations: number[]; repos: string[] }>();
    for (const result of results) {
      if (result.executionDurationMs === undefined) continue;
      const stage = 'validation';
      const existing = stageMap.get(stage) ?? { durations: [], repos: [] };
      existing.durations.push(result.executionDurationMs);
      if (!existing.repos.includes(result.repoPath)) {
        existing.repos.push(result.repoPath);
      }
      stageMap.set(stage, existing);
    }

    for (const [stage, data] of stageMap) {
      const avg = data.durations.reduce((a, b) => a + b, 0) / data.durations.length;
      const max = Math.max(...data.durations);
      const min = Math.min(...data.durations);

      bottlenecks.push({
        stage,
        avgDurationMs: Math.round(avg),
        maxDurationMs: max,
        minDurationMs: min,
        affectedRepositories: data.repos.sort(),
        severity: avg > 500 ? 'high' : avg > 200 ? 'medium' : 'low',
      });
    }

    const slowestStage = bottlenecks.sort((a, b) => b.avgDurationMs - a.avgDurationMs)[0]?.stage ?? 'none';

    return {
      reportId: `performance-bottlenecks-${reportCounter}`,
      bottlenecks: bottlenecks.sort((a, b) => b.avgDurationMs - a.avgDurationMs),
      slowestStage,
      largestOrchestrationHotspot: slowestStage,
      generatedAt: 0,
    };
  }

  private generateRecoveryQualityReport(results: RepositoryExecutionResult[]): RecoveryQualityReport {
    const metrics: RecoveryQualityMetric[] = [];

    const completedResults = results.filter((r) => r.status === 'completed');

    // Parser survivability
    const parserValues = completedResults.map((r) => r.parserSurvivability ?? 0).filter((v) => v > 0);
    if (parserValues.length > 0) {
      const avg = parserValues.reduce((a, b) => a + b, 0) / parserValues.length;
      metrics.push({
        metric: 'parser-survivability',
        avgValue: Math.round(avg * 1000) / 1000,
        minValue: Math.min(...parserValues),
        maxValue: Math.max(...parserValues),
        repositoryCount: parserValues.length,
        quality: avg >= 0.9 ? 'excellent' : avg >= 0.7 ? 'good' : avg >= 0.5 ? 'fair' : 'poor',
      });
    }

    // Compile stability
    const compileValues = completedResults.map((r) => r.compileStability ?? 0).filter((v) => v > 0);
    if (compileValues.length > 0) {
      const avg = compileValues.reduce((a, b) => a + b, 0) / compileValues.length;
      metrics.push({
        metric: 'compile-stability',
        avgValue: Math.round(avg * 1000) / 1000,
        minValue: Math.min(...compileValues),
        maxValue: Math.max(...compileValues),
        repositoryCount: compileValues.length,
        quality: avg >= 0.9 ? 'excellent' : avg >= 0.7 ? 'good' : avg >= 0.5 ? 'fair' : 'poor',
      });
    }

    // Healing recovery rate
    const healingValues = completedResults.map((r) => r.healingRecoveryRate ?? 0).filter((v) => v > 0);
    if (healingValues.length > 0) {
      const avg = healingValues.reduce((a, b) => a + b, 0) / healingValues.length;
      metrics.push({
        metric: 'healing-recovery-rate',
        avgValue: Math.round(avg * 1000) / 1000,
        minValue: Math.min(...healingValues),
        maxValue: Math.max(...healingValues),
        repositoryCount: healingValues.length,
        quality: avg >= 0.9 ? 'excellent' : avg >= 0.7 ? 'good' : avg >= 0.5 ? 'fair' : 'poor',
      });
    }

    const overallHealth = metrics.length === 0
      ? 'poor'
      : metrics.every((m) => m.quality === 'excellent')
        ? 'excellent'
        : metrics.every((m) => m.quality === 'good' || m.quality === 'excellent')
          ? 'good'
          : metrics.some((m) => m.quality === 'poor')
            ? 'poor'
            : 'fair';

    return {
      reportId: `recovery-quality-${reportCounter}`,
      metrics,
      overallRecoveryHealth: overallHealth,
      generatedAt: 0,
    };
  }

  private generateFalseConfidenceReport(results: RepositoryExecutionResult[]): FalseConfidenceReport {
    const indicators: FalseConfidenceIndicator[] = [];

    for (const result of results) {
      if (result.status === 'completed' && result.error) {
        indicators.push({
          repository: result.name,
          indicator: 'completed-with-error',
          confidenceScore: 1,
          actualOutcome: 'error',
          discrepancy: 1,
          severity: 'high',
        });
      }

      if (result.healingRecoveryRate !== undefined && result.healingRecoveryRate > 0.8 && result.status === 'failed') {
        indicators.push({
          repository: result.name,
          indicator: 'high-healing-recovery-but-failed',
          confidenceScore: result.healingRecoveryRate,
          actualOutcome: 'failed',
          discrepancy: 1 - result.healingRecoveryRate,
          severity: 'medium',
        });
      }
    }

    const falseConfidenceRate = results.length > 0 ? indicators.length / results.length : 0;

    return {
      reportId: `false-confidence-${reportCounter}`,
      indicators: indicators.sort((a, b) => b.discrepancy - a.discrepancy),
      totalIndicators: indicators.length,
      falseConfidenceRate,
      generatedAt: 0,
    };
  }

  private persistReports(
    reportId: string,
    corpusPath: string,
    summary: StabilizationSummary,
    highestRiskPatterns: HighestRiskPatterns,
    replayInstability: ReplayInstabilityReport,
    governanceWeaknesses: GovernanceWeaknessesReport,
    unsupportedStructures: UnsupportedStructuresReport,
    architecturalHotspots: import('./types.js').ArchitecturalHotspotsReport,
    performanceBottlenecks: PerformanceBottlenecksReport,
    recoveryQuality: RecoveryQualityReport,
    falseConfidence: FalseConfidenceReport,
    simplificationOpportunities: import('./types.js').SimplificationOpportunitiesReport,
    alphaReadiness: import('./types.js').AlphaReadinessScore,
  ): string[] {
    const paths: string[] = [];

    try {
      const outputDir = join(this.projectRoot, '.testguardian', 'stabilization');
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      // stabilization-summary.json
      const summaryPath = join(outputDir, 'stabilization-summary.json');
      writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
      paths.push(summaryPath);

      // highest-risk-patterns.json
      const riskPath = join(outputDir, 'highest-risk-patterns.json');
      writeFileSync(riskPath, JSON.stringify(highestRiskPatterns, null, 2), 'utf-8');
      paths.push(riskPath);

      // replay-instability-hotspots.json
      const replayPath = join(outputDir, 'replay-instability-hotspots.json');
      writeFileSync(replayPath, JSON.stringify(replayInstability, null, 2), 'utf-8');
      paths.push(replayPath);

      // governance-weaknesses.json
      const governancePath = join(outputDir, 'governance-weaknesses.json');
      writeFileSync(governancePath, JSON.stringify(governanceWeaknesses, null, 2), 'utf-8');
      paths.push(governancePath);

      // unsupported-structures.json
      const unsupportedPath = join(outputDir, 'unsupported-structures.json');
      writeFileSync(unsupportedPath, JSON.stringify(unsupportedStructures, null, 2), 'utf-8');
      paths.push(unsupportedPath);

      // architectural-hotspots.json
      const archPath = join(outputDir, 'architectural-hotspots.json');
      writeFileSync(archPath, JSON.stringify(architecturalHotspots, null, 2), 'utf-8');
      paths.push(archPath);

      // performance-bottlenecks.json
      const perfPath = join(outputDir, 'performance-bottlenecks.json');
      writeFileSync(perfPath, JSON.stringify(performanceBottlenecks, null, 2), 'utf-8');
      paths.push(perfPath);

      // recovery-quality-report.json
      const recoveryPath = join(outputDir, 'recovery-quality-report.json');
      writeFileSync(recoveryPath, JSON.stringify(recoveryQuality, null, 2), 'utf-8');
      paths.push(recoveryPath);

      // false-confidence-report.json
      const falseConfPath = join(outputDir, 'false-confidence-report.json');
      writeFileSync(falseConfPath, JSON.stringify(falseConfidence, null, 2), 'utf-8');
      paths.push(falseConfPath);

      // simplification-opportunities.json
      const simpPath = join(outputDir, 'simplification-opportunities.json');
      writeFileSync(simpPath, JSON.stringify(simplificationOpportunities, null, 2), 'utf-8');
      paths.push(simpPath);

      // alpha-readiness.json
      const alphaPath = join(outputDir, 'alpha-readiness.json');
      writeFileSync(alphaPath, JSON.stringify(alphaReadiness, null, 2), 'utf-8');
      paths.push(alphaPath);
    } catch {
    }

    return paths;
  }

  private emptyReport(reportId: string, corpusPath: string): StabilizationReport {
    return {
      reportId,
      corpusPath,
      summary: {
        summaryId: reportId,
        corpusPath,
        totalRepositories: 0,
        completedRepositories: 0,
        failedRepositories: 0,
        overallStabilityScore: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0,
        generatedAt: 0,
      },
      highestRiskPatterns: {
        reportId: `risk-patterns-${reportCounter}`,
        patterns: [],
        totalPatterns: 0,
        criticalPatterns: 0,
        highPatterns: 0,
        generatedAt: 0,
      },
      replayInstability: {
        reportId: `replay-instability-${reportCounter}`,
        hotspots: [],
        totalHotspots: 0,
        mostUnstableCategory: 'none',
        generatedAt: 0,
      },
      governanceWeaknesses: {
        reportId: `governance-weaknesses-${reportCounter}`,
        weaknesses: [],
        totalWeaknesses: 0,
        overallGovernanceHealth: 'healthy',
        generatedAt: 0,
      },
      unsupportedStructures: {
        reportId: `unsupported-structures-${reportCounter}`,
        structures: [],
        totalStructures: 0,
        mostCommonStructure: 'none',
        generatedAt: 0,
      },
      architecturalHotspots: {
        reportId: `arch-audit-${reportCounter}`,
        hotspots: [],
        totalHotspots: 0,
        criticalHotspots: 0,
        generatedAt: 0,
      },
      performanceBottlenecks: {
        reportId: `performance-bottlenecks-${reportCounter}`,
        bottlenecks: [],
        slowestStage: 'none',
        largestOrchestrationHotspot: 'none',
        generatedAt: 0,
      },
      recoveryQuality: {
        reportId: `recovery-quality-${reportCounter}`,
        metrics: [],
        overallRecoveryHealth: 'poor',
        generatedAt: 0,
      },
      falseConfidence: {
        reportId: `false-confidence-${reportCounter}`,
        indicators: [],
        totalIndicators: 0,
        falseConfidenceRate: 0,
        generatedAt: 0,
      },
      simplificationOpportunities: {
        reportId: `simplification-${reportCounter}`,
        opportunities: [],
        totalOpportunities: 0,
        highImpactOpportunities: 0,
        generatedAt: 0,
      },
      alphaReadiness: {
        reportId: `alpha-readiness-${reportCounter}`,
        overallScore: 0,
        overallStatus: 'not-ready',
        assessments: [],
        criticalBlockers: [],
        recommendedBeforeAlpha: [],
        safeToShipFeatures: [],
        experimentalFeatures: [],
        generatedAt: 0,
      },
      persistedPaths: [],
      generatedAt: 0,
    };
  }
}
