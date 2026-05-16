/**
 * Runtime Stability Engine
 *
 * Orchestrator for real browser runtime hardening.
 * Coordinates all hardening sub-engines:
 *   - DOM Settling Detection
 *   - Navigation Synchronization
 *   - Async Render Detection
 *   - Stale Context Recovery
 *   - iframe + Modal Stability
 *   - Replay Drift Detection
 *
 * Reuses: ReplaySession, ValidationEngine, ReplayRuntime
 * No new intelligence. No AI. Deterministic analysis.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Result } from '../../models/result.js';
import type { ElementNode } from '../../models/snapshot.js';
import type { ReplaySession } from '../../models/replay.js';
import type { RuntimeHardeningInput, RuntimeHardeningResult, RuntimeStabilityMetrics } from './types.js';
import { success, failure } from '../../models/result.js';
import { DomSettlingDetector } from './dom-settling.js';
import { NavigationSynchronizer } from './navigation-synchronizer.js';
import { AsyncRenderDetector } from './async-render-detector.js';
import { StaleContextRecovery } from './stale-context-recovery.js';
import { IframeModalHandler } from './iframe-modal-handler.js';
import { ReplayDriftDetector } from './replay-drift-detector.js';

const RUNTIME_HARDENING_STORAGE_DIR = 'runtime-hardening';

export class RuntimeStabilityEngine {
  private readonly domSettling: DomSettlingDetector;
  private readonly navigationSync: NavigationSynchronizer;
  private readonly asyncRender: AsyncRenderDetector;
  private readonly staleContext: StaleContextRecovery;
  private readonly iframeModal: IframeModalHandler;
  private readonly replayDrift: ReplayDriftDetector;

  constructor() {
    this.domSettling = new DomSettlingDetector();
    this.navigationSync = new NavigationSynchronizer();
    this.asyncRender = new AsyncRenderDetector();
    this.staleContext = new StaleContextRecovery();
    this.iframeModal = new IframeModalHandler();
    this.replayDrift = new ReplayDriftDetector();
  }

  /**
   * Execute full runtime hardening analysis on a replay session.
   */
  analyze(input: RuntimeHardeningInput): Result<RuntimeHardeningResult> {
    try {
      const { session, domSnapshots, projectRoot } = input;

      if (domSnapshots.length === 0) {
        return failure('No DOM snapshots provided for hardening analysis');
      }

      const sessionId = session.id;

      const domSettlingReport = this.domSettling.analyze(sessionId, domSnapshots);
      const navigationSyncReport = this.navigationSync.analyze(session);
      const asyncRenderReport = this.asyncRender.analyze(sessionId, domSnapshots);
      const staleContextReport = this.staleContext.analyze(sessionId, session, domSnapshots);
      const frameModalReport = this.iframeModal.analyze(sessionId, session, domSnapshots);
      const replayDriftReport = this.replayDrift.analyze(sessionId, session, domSnapshots);

      const metrics = this.computeMetrics(
        domSettlingReport,
        staleContextReport,
        frameModalReport,
        asyncRenderReport,
        replayDriftReport,
      );

      const overallStable = this.determineOverallStability(
        domSettlingReport,
        navigationSyncReport,
        asyncRenderReport,
        staleContextReport,
        frameModalReport,
        replayDriftReport,
      );

      const result: RuntimeHardeningResult = {
        sessionId,
        domSettling: domSettlingReport,
        navigationSync: navigationSyncReport,
        asyncRender: asyncRenderReport,
        staleContext: staleContextReport,
        frameModal: frameModalReport,
        replayDrift: replayDriftReport,
        metrics,
        overallStable,
        persistedPaths: [],
      };

      const persistedPaths = this.persistResults(result, projectRoot);
      result.persistedPaths = persistedPaths;

      return success(result);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  private computeMetrics(
    domSettling: import('./types.js').DomSettlingReport,
    staleContext: import('./types.js').StaleContextRecoveryReport,
    frameModal: import('./types.js').FrameModalStabilityReport,
    asyncRender: import('./types.js').AsyncRenderReport,
    replayDrift: import('./types.js').ReplayDriftReport,
  ): RuntimeStabilityMetrics {
    const domStabilizationSuccessRate = domSettling.status === 'stable' ? 1 : 0;
    const replayRecoverySuccess = replayDrift.replayDeterministic ? 1 : 0;
    const staleRecoverySuccess = staleContext.totalStaleEvents > 0
      ? staleContext.recoveryRate
      : 1;
    const iframeRecoveryRate = frameModal.stabilityPassed ? 1 : 0;
    const asyncRenderInstabilityFrequency = asyncRender.reRenderChurnDetected ? 1 : 0;
    const replayDriftFrequency = replayDrift.totalDriftEvents;

    return {
      domStabilizationSuccessRate,
      replayRecoverySuccess,
      staleRecoverySuccess,
      iframeRecoveryRate,
      asyncRenderInstabilityFrequency,
      replayDriftFrequency,
      totalSessionsAnalyzed: 1,
      stableSessions: replayDrift.replayDeterministic && domSettling.status === 'stable' ? 1 : 0,
      unstableSessions: replayDrift.replayDeterministic && domSettling.status === 'stable' ? 0 : 1,
    };
  }

  private determineOverallStability(
    domSettling: import('./types.js').DomSettlingReport,
    navigationSync: import('./types.js').NavigationSyncReport,
    asyncRender: import('./types.js').AsyncRenderReport,
    staleContext: import('./types.js').StaleContextRecoveryReport,
    frameModal: import('./types.js').FrameModalStabilityReport,
    replayDrift: import('./types.js').ReplayDriftReport,
  ): boolean {
    if (domSettling.status !== 'stable') return false;
    if (navigationSync.readiness !== 'ready') return false;
    if (asyncRender.incompleteRenders > 0) return false;
    if (staleContext.failedRecoveries > 0) return false;
    if (!frameModal.stabilityPassed) return false;
    if (!replayDrift.replayDeterministic) return false;
    return true;
  }

  private persistResults(
    result: RuntimeHardeningResult,
    projectRoot: string,
  ): string[] {
    const paths: string[] = [];

    try {
      const outputDir = join(projectRoot, '.testguardian', RUNTIME_HARDENING_STORAGE_DIR);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      const mainPath = join(outputDir, `${result.sessionId}-hardening.json`);
      writeFileSync(mainPath, JSON.stringify({
        sessionId: result.sessionId,
        overallStable: result.overallStable,
        domSettling: {
          status: result.domSettling.status,
          mutationCountStabilized: result.domSettling.mutationCountStabilized,
          renderLoopDetected: result.domSettling.renderLoopDetected,
        },
        navigationSync: {
          readiness: result.navigationSync.readiness,
          blockedByUnreadiness: result.navigationSync.blockedByUnreadiness,
        },
        asyncRender: {
          totalAsyncRenders: result.asyncRender.totalAsyncRenders,
          reRenderChurnDetected: result.asyncRender.reRenderChurnDetected,
        },
        staleContext: {
          totalStaleEvents: result.staleContext.totalStaleEvents,
          recoveryRate: result.staleContext.recoveryRate,
        },
        frameModal: {
          stabilityPassed: result.frameModal.stabilityPassed,
          nestedFrameCount: result.frameModal.nestedFrameCount,
        },
        replayDrift: {
          replayDeterministic: result.replayDrift.replayDeterministic,
          driftSeverity: result.replayDrift.driftSeverity,
        },
        metrics: result.metrics,
      }, null, 2), 'utf-8');
      paths.push(mainPath);

      const metricsPath = join(outputDir, `${result.sessionId}-metrics.json`);
      writeFileSync(metricsPath, JSON.stringify(result.metrics, null, 2), 'utf-8');
      paths.push(metricsPath);
    } catch {
    }

    return paths;
  }
}
