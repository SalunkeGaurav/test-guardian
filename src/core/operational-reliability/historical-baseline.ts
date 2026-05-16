/**
 * Historical Baseline
 *
 * Persists and compares deterministic historical baselines
 * for reliability trend analysis.
 *
 * No AI. No adaptive baselines. Pure historical comparison.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Result } from '../../models/result.js';
import type { HistoricalReliabilityBaseline, ReliabilityExecutionSession } from './types.js';
import { success, failure } from '../../models/result.js';

const OPERATIONAL_RELIABILITY_STORAGE_DIR = 'operational-reliability';

let baselineCounter = 0;
function nextBaselineId(): string {
  baselineCounter++;
  return `baseline-${baselineCounter}`;
}

export class HistoricalBaselineManager {
  constructor(private readonly projectRoot: string) {}

  private get storageDir(): string {
    return join(this.projectRoot, '.testguardian', OPERATIONAL_RELIABILITY_STORAGE_DIR);
  }

  /**
   * Create a historical baseline from an execution session.
   */
  createBaseline(session: ReliabilityExecutionSession): HistoricalReliabilityBaseline {
    const runtimeMetrics = this.aggregateRuntimeMetrics(session);
    const healingMetrics = this.aggregateHealingMetrics(session);
    const governanceMetrics = this.aggregateGovernanceMetrics(session);
    const replayMetrics = this.aggregateReplayMetrics(session);
    const patchMetrics = this.aggregatePatchMetrics(session);

    return {
      baselineId: nextBaselineId(),
      corpusPath: session.corpusPath,
      createdAt: session.completedAt,
      runtimeMetrics,
      healingMetrics,
      governanceMetrics,
      replayMetrics,
      patchMetrics,
      totalRuns: session.runs.length,
    };
  }

  /**
   * Persist a baseline to disk.
   */
  persist(baseline: HistoricalReliabilityBaseline): Result<string> {
    try {
      if (!existsSync(this.storageDir)) {
        mkdirSync(this.storageDir, { recursive: true });
      }

      const path = join(this.storageDir, `${baseline.baselineId}.json`);
      writeFileSync(path, JSON.stringify(baseline, null, 2), 'utf-8');

      const latestPath = join(this.storageDir, 'latest.json');
      writeFileSync(latestPath, JSON.stringify(baseline, null, 2), 'utf-8');

      return success(path);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Load the latest baseline.
   */
  loadLatest(): Result<HistoricalReliabilityBaseline | null> {
    try {
      const latestPath = join(this.storageDir, 'latest.json');
      if (!existsSync(latestPath)) {
        return success(null);
      }

      const data = readFileSync(latestPath, 'utf-8');
      return success(JSON.parse(data) as HistoricalReliabilityBaseline);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Load all baselines.
   */
  loadAll(): Result<HistoricalReliabilityBaseline[]> {
    try {
      if (!existsSync(this.storageDir)) {
        return success([]);
      }

      const files = readdirSync(this.storageDir)
        .filter(f => f.endsWith('.json') && f !== 'latest.json')
        .sort();

      const baselines: HistoricalReliabilityBaseline[] = [];
      for (const file of files) {
        const data = readFileSync(join(this.storageDir, file), 'utf-8');
        baselines.push(JSON.parse(data) as HistoricalReliabilityBaseline);
      }

      return success(baselines);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  private aggregateRuntimeMetrics(session: ReliabilityExecutionSession): HistoricalReliabilityBaseline['runtimeMetrics'] {
    let domStab = 0, replayRec = 0, staleRec = 0, iframeRec = 0, asyncInst = 0, driftFreq = 0;
    let count = 0;

    for (const run of session.runs) {
      if (run.stabilityMetrics) {
        domStab += run.stabilityMetrics.domStabilizationSuccessRate;
        replayRec += run.stabilityMetrics.replayRecoverySuccess;
        staleRec += run.stabilityMetrics.staleRecoverySuccess;
        iframeRec += run.stabilityMetrics.iframeRecoveryRate;
        asyncInst += run.stabilityMetrics.asyncRenderInstabilityFrequency;
        driftFreq += run.stabilityMetrics.replayDriftFrequency;
        count++;
      }
    }

    return count > 0 ? {
      domStabilizationSuccessRate: domStab / count,
      replayRecoverySuccess: replayRec / count,
      staleRecoverySuccess: staleRec / count,
      iframeRecoveryRate: iframeRec / count,
      asyncRenderInstabilityFrequency: asyncInst / count,
      replayDriftFrequency: driftFreq / count,
    } : {
      domStabilizationSuccessRate: 0,
      replayRecoverySuccess: 0,
      staleRecoverySuccess: 0,
      iframeRecoveryRate: 0,
      asyncRenderInstabilityFrequency: 0,
      replayDriftFrequency: 0,
    };
  }

  private aggregateHealingMetrics(session: ReliabilityExecutionSession): HistoricalReliabilityBaseline['healingMetrics'] {
    let totalAttempts = 0, successful = 0, sandboxSuccess = 0, falseRec = 0, replayDiv = 0, rollback = 0, patchSurv = 0;

    for (const run of session.runs) {
      if (run.healingMetrics) {
        totalAttempts += run.healingMetrics.totalHealingAttempts;
        successful += run.healingMetrics.successfulHealings;
        sandboxSuccess += run.healingMetrics.sandboxReplaySuccesses;
        falseRec += run.healingMetrics.falseRecoveries;
        replayDiv += run.healingMetrics.replayDivergences;
        rollback += run.healingMetrics.rollbackReliability;
        patchSurv += run.healingMetrics.patchSurvivability;
      }
    }

    return {
      healingSuccessRate: totalAttempts > 0 ? successful / totalAttempts : 1,
      sandboxReplaySuccess: totalAttempts > 0 ? sandboxSuccess / totalAttempts : 1,
      falseRecoveryRate: totalAttempts > 0 ? falseRec / totalAttempts : 0,
      replayDivergenceRate: totalAttempts > 0 ? replayDiv / totalAttempts : 0,
      rollbackReliability: totalAttempts > 0 ? rollback / totalAttempts : 1,
      patchSurvivability: totalAttempts > 0 ? patchSurv / totalAttempts : 1,
    };
  }

  private aggregateGovernanceMetrics(session: ReliabilityExecutionSession): HistoricalReliabilityBaseline['governanceMetrics'] {
    let totalRuns = 0, passedRuns = 0, totalGates = 0, passedGates = 0;

    for (const run of session.runs) {
      if (run.executionReport) {
        totalRuns++;
        if (run.executionReport.governanceDecisions.governancePassed) {
          passedRuns++;
        }
        totalGates += run.executionReport.governanceDecisions.gatesPassed + run.executionReport.governanceDecisions.gatesFailed;
        passedGates += run.executionReport.governanceDecisions.gatesPassed;
      }
    }

    return {
      governancePassRate: totalRuns > 0 ? passedRuns / totalRuns : 1,
      averageGatePassRate: totalGates > 0 ? passedGates / totalGates : 1,
    };
  }

  private aggregateReplayMetrics(session: ReliabilityExecutionSession): HistoricalReliabilityBaseline['replayMetrics'] {
    let totalRuns = 0, deterministic = 0, driftCount = 0;

    for (const run of session.runs) {
      if (run.executionReport) {
        totalRuns++;
        if (run.executionReport.replayStability.replayDeterministic) {
          deterministic++;
        }
        if (run.executionReport.replayStability.driftSeverity !== 'none') {
          driftCount++;
        }
      }
    }

    return {
      reproducibilityRate: totalRuns > 0 ? deterministic / totalRuns : 1,
      nondeterministicFrequency: totalRuns > 0 ? (totalRuns - deterministic) / totalRuns : 0,
      navigationDriftFrequency: totalRuns > 0 ? driftCount / totalRuns : 0,
    };
  }

  private aggregatePatchMetrics(session: ReliabilityExecutionSession): HistoricalReliabilityBaseline['patchMetrics'] {
    let totalRuns = 0, compileOk = 0, rollbackOk = 0;

    for (const run of session.runs) {
      if (run.executionReport) {
        totalRuns++;
        if (run.executionReport.sandboxVerification.compileSuccess) {
          compileOk++;
        }
        if (run.executionReport.sandboxVerification.isolationVerified) {
          rollbackOk++;
        }
      }
    }

    return {
      compilePreservationRate: totalRuns > 0 ? compileOk / totalRuns : 1,
      rollbackSuccessRate: totalRuns > 0 ? rollbackOk / totalRuns : 1,
      patchSurvivabilityRate: totalRuns > 0 ? compileOk / totalRuns : 1,
    };
  }
}
