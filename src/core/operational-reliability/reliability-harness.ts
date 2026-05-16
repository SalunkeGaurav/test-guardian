/**
 * Reliability Harness
 *
 * Long-run operational reliability harness that continuously measures
 * real-world platform stability across repository executions.
 *
 * Reuses: UnifiedRuntime, RuntimeHealingLoop, RuntimeStabilityEngine,
 *         ConfidenceGovernance, ValidationEngine, AuditPersister
 *
 * No AI. No autonomous behavior. Deterministic measurement.
 */

import { existsSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Result } from '../../models/result.js';
import type { ReliabilityHarnessInput, ReliabilityHarnessResult } from './types.js';
import { success, failure } from '../../models/result.js';
import { UnifiedRuntime } from '../unified-runtime/unified-runtime.js';
import { ExecutionObserver } from './execution-observer.js';
import { RuntimeRegressionDetector } from './runtime-regression-detector.js';
import { HealingRegressionDetector } from './healing-regression-detector.js';
import { GovernanceRegressionDetector } from './governance-regression-detector.js';
import { ReplayReliabilityMonitor } from './replay-reliability-monitor.js';
import { PatchSafetyMonitor } from './patch-safety-monitor.js';
import { ReliabilityScorer } from './reliability-scoring.js';
import { HistoricalBaselineManager } from './historical-baseline.js';

let sessionCounter = 0;
function nextSessionId(): string {
  sessionCounter++;
  return `reliability-session-${sessionCounter}`;
}

export class ReliabilityHarness {
  private readonly unifiedRuntime: UnifiedRuntime;
  private readonly observer: ExecutionObserver;
  private readonly runtimeRegressionDetector: RuntimeRegressionDetector;
  private readonly healingRegressionDetector: HealingRegressionDetector;
  private readonly governanceRegressionDetector: GovernanceRegressionDetector;
  private readonly replayReliabilityMonitor: ReplayReliabilityMonitor;
  private readonly patchSafetyMonitor: PatchSafetyMonitor;
  private readonly reliabilityScorer: ReliabilityScorer;
  private readonly baselineManager: HistoricalBaselineManager;

  constructor(private readonly projectRoot: string) {
    this.unifiedRuntime = new UnifiedRuntime();
    this.observer = new ExecutionObserver();
    this.runtimeRegressionDetector = new RuntimeRegressionDetector();
    this.healingRegressionDetector = new HealingRegressionDetector();
    this.governanceRegressionDetector = new GovernanceRegressionDetector();
    this.replayReliabilityMonitor = new ReplayReliabilityMonitor();
    this.patchSafetyMonitor = new PatchSafetyMonitor();
    this.reliabilityScorer = new ReliabilityScorer();
    this.baselineManager = new HistoricalBaselineManager(projectRoot);
  }

  /**
   * Execute the full reliability harness across a corpus.
   */
  async execute(input: ReliabilityHarnessInput): Promise<Result<ReliabilityHarnessResult>> {
    const { corpusPath, iterations = 3, strictBaseline = false, detectRegressions = true, reportOnly = false } = input;

    if (!existsSync(corpusPath)) {
      return failure(`Corpus path not found: ${corpusPath}`);
    }

    const repos = this.discoverRepositories(corpusPath);
    if (repos.length === 0) {
      return failure(`No repositories found in corpus: ${corpusPath}`);
    }

    const sessionId = nextSessionId();
    const startedAt = 0;
    const runs: import('./types.js').ReliabilityRun[] = [];

    // Execute iterations across repositories
    for (let iteration = 0; iteration < iterations; iteration++) {
      for (const repoPath of repos) {
        if (reportOnly) {
          continue;
        }

        const result = await this.unifiedRuntime.execute({
          repoPath,
          sandbox: true,
          validateOnly: false,
          runtimeHealing: false,
          strictGovernance: strictBaseline,
          reportOnly: false,
        });

        if (result.ok) {
          const run = this.observer.observe(
            iteration * repos.length + repos.indexOf(repoPath) + 1,
            repoPath,
            result.value.report,
          );
          runs.push(run);
        } else {
          const run = this.observer.observe(
            iteration * repos.length + repos.indexOf(repoPath) + 1,
            repoPath,
            this.buildEmptyReport(repoPath),
            result.error,
          );
          runs.push(run);
        }
      }
    }

    const session: import('./types.js').ReliabilityExecutionSession = {
      sessionId,
      corpusPath,
      iterations,
      runs,
      startedAt,
      completedAt: 0,
    };

    // Load historical baseline if available
    const baselineResult = this.baselineManager.loadLatest();
    const baseline = baselineResult.ok ? baselineResult.value : undefined;

    // Detect regressions
    const runtimeRegression = this.runtimeRegressionDetector.detect(session, detectRegressions ? baseline : undefined);
    const healingRegression = this.healingRegressionDetector.detect(session, detectRegressions ? baseline : undefined);
    const governanceRegression = this.governanceRegressionDetector.detect(session, detectRegressions ? baseline : undefined);

    // Monitor replay reliability
    const replayReliability = this.replayReliabilityMonitor.monitor(session);

    // Monitor patch safety
    const patchSafety = this.patchSafetyMonitor.monitor(session);

    // Create and persist new baseline
    const newBaseline = this.baselineManager.createBaseline(session);
    this.baselineManager.persist(newBaseline);

    // Compute reliability score
    const reliabilityScore = this.reliabilityScorer.computeScore(session, baseline);

    const result: ReliabilityHarnessResult = {
      session,
      runtimeRegression,
      healingRegression,
      governanceRegression,
      replayReliability,
      patchSafety,
      baseline: newBaseline,
      reliabilityScore,
      persistedPaths: [],
    };

    // Persist results
    result.persistedPaths = this.persistResults(result);

    return success(result);
  }

  private discoverRepositories(corpusPath: string): string[] {
    const repos: string[] = [];

    if (statSync(corpusPath).isFile()) {
      return [corpusPath];
    }

    const entries = readdirSync(corpusPath);
    for (const entry of entries) {
      const fullPath = join(corpusPath, entry);
      if (statSync(fullPath).isDirectory()) {
        repos.push(fullPath);
      }
    }

    return repos.sort();
  }

  private buildEmptyReport(repoPath: string): import('../unified-runtime/types.js').UnifiedExecutionReport {
    return {
      executionId: 'empty',
      repoPath,
      frameworkType: 'unknown',
      compatibilityStatus: 'unsupported',
      repositorySummary: { totalFiles: 0, totalLocators: 0, compatibilityScore: 0, risks: 0 },
      healingSummary: { totalAttempts: 0, successfulHealings: 0, reviewPackages: 0 },
      validationOutcomes: { totalValidations: 0, passed: 0, failed: 0 },
      replayStability: { domStabilized: false, replayDeterministic: false, driftSeverity: 'none' },
      governanceDecisions: { governancePassed: false, gatesPassed: 0, gatesFailed: 0 },
      sandboxVerification: { sandboxExecuted: false, compileSuccess: false, isolationVerified: false },
      patchProposals: { totalProposals: 0, status: 'none' },
      rollbackMetadata: { rollbackAvailable: false },
      riskAnalysis: { overallRisk: 'high', riskFactors: ['Execution failed'] },
      runtimeMetrics: {
        domStabilizationSuccessRate: 0,
        replayRecoverySuccess: 0,
        staleRecoverySuccess: 0,
        iframeRecoveryRate: 0,
        asyncRenderInstabilityFrequency: 0,
        replayDriftFrequency: 0,
      },
      stateTransitions: { transitions: [], currentState: 'failed', finalState: 'failed', totalTransitions: 0, failedTransitions: 1 },
      failureBoundary: { events: [], totalFailures: 1, recoverableFailures: 0, unrecoverableFailures: 1, gracefulDegradation: false },
      persistedPaths: [],
      completedAt: 0,
    };
  }

  private persistResults(result: ReliabilityHarnessResult): string[] {
    const paths: string[] = [];

    try {
      const outputDir = join(this.projectRoot, '.testguardian', 'operational-reliability');
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      const reportPath = join(outputDir, `${result.session.sessionId}.json`);
      writeFileSync(reportPath, JSON.stringify({
        sessionId: result.session.sessionId,
        corpusPath: result.session.corpusPath,
        iterations: result.session.iterations,
        totalRuns: result.session.runs.length,
        reliabilityScore: result.reliabilityScore,
        runtimeRegression: {
          overallSeverity: result.runtimeRegression.overallSeverity,
          indicators: result.runtimeRegression.indicators.length,
        },
        healingRegression: {
          overallSeverity: result.healingRegression.overallSeverity,
          indicators: result.healingRegression.indicators.length,
        },
        governanceRegression: {
          overallSeverity: result.governanceRegression.overallSeverity,
          indicators: result.governanceRegression.indicators.length,
        },
        replayReliability: {
          overallReliability: result.replayReliability.overallReliability,
          reproducibilityRate: result.replayReliability.reproducibilityRate,
        },
        patchSafety: {
          overallSafety: result.patchSafety.overallSafety,
          compilePreservationRate: result.patchSafety.compilePreservationRate,
        },
        baseline: {
          baselineId: result.baseline.baselineId,
          totalRuns: result.baseline.totalRuns,
        },
      }, null, 2), 'utf-8');
      paths.push(reportPath);

      const scorePath = join(outputDir, `${result.session.sessionId}-score.json`);
      writeFileSync(scorePath, JSON.stringify(result.reliabilityScore, null, 2), 'utf-8');
      paths.push(scorePath);
    } catch {
    }

    return paths;
  }
}
