/**
 * Replay Trustworthiness Analyzer
 *
 * Evaluates the reliability of replay-based validation results.
 * Detects:
 * - Replay consistency reliability
 * - Replay false-confidence patterns
 * - Timing-based false validation
 * - Modal/iframe replay instability
 * - Async replay masking
 */

import type { ReplaySession, ReplayStep } from '../../models/replay.js';
import type { HealingCandidate } from '../../models/healing-candidate.js';
import type { ValidationResult } from '../../models/validation.js';
import type {
  ReplayTrustworthinessReport,
  ReplayTrustIndicator,
} from './types.js';

export class ReplayTrustworthinessAnalyzer {
  analyze(
    candidate: HealingCandidate,
    replaySession?: ReplaySession,
    validationResult?: ValidationResult
  ): ReplayTrustworthinessReport {
    const indicators: ReplayTrustIndicator[] = [];
    const falseConfidencePatterns: string[] = [];
    
    let timingRisk = 0;
    let modalIframeInstability = 0;
    let asyncMaskingRisk = 0;
    
    if (!replaySession) {
      indicators.push({
        type: 'no-replay-data',
        reliability: 0,
        detail: 'No replay session available for validation',
      });
      falseConfidencePatterns.push('Validation based on stale or missing replay data');
      
      return {
        id: `replay-trust-${candidate.id}-${Date.now()}`,
        candidateId: candidate.id,
        replaySessionId: 'none',
        overallTrustScore: 0,
        isTrustworthy: false,
        indicators,
        falseConfidencePatterns,
        timingRisk: 1,
        modalIframeInstability: 1,
        asyncMaskingRisk: 1,
        recommendation: 'verify-additionally',
        createdAt: Date.now(),
      };
    }
    
    const { steps } = replaySession;
    
    const successCount = steps.filter(s => s.result.success).length;
    const totalSteps = steps.length;
    const successRate = totalSteps > 0 ? successCount / totalSteps : 0;
    
    if (successRate === 1) {
      indicators.push({
        type: 'perfect-success-rate',
        reliability: 0.3,
        detail: 'All replay steps passed - may indicate test is not properly exercising the failure',
      });
      falseConfidencePatterns.push(
        'Perfect success rate in replay may mask actual flaky behavior in production'
      );
      timingRisk += 0.3;
    }
    
    const inconsistentSteps = this.detectInconsistentSteps(steps);
    if (inconsistentSteps.length > 0) {
      indicators.push({
        type: 'inconsistent-step-results',
        reliability: 0.2,
        detail: `${inconsistentSteps.length} steps show inconsistent results`,
      });
      falseConfidencePatterns.push(
        `Inconsistent results in steps: ${inconsistentSteps.join(', ')}`
      );
    }
    
    const timingVariation = this.computeTimingVariation(steps);
    if (timingVariation > 0.5) {
      indicators.push({
        type: 'high-timing-variance',
        reliability: 0.4,
        detail: `High timing variance (${timingVariation.toFixed(2)}) detected`,
      });
      falseConfidencePatterns.push(
        'High timing variance may cause intermittent failures in production'
      );
      timingRisk = Math.min(timingVariation, 1);
    }
    
    if (replaySession.modalDialogContext.length > 0) {
      indicators.push({
        type: 'modal-dialog-context',
        reliability: 0.3,
        detail: `Replay included ${replaySession.modalDialogContext.length} modal dialog interactions`,
      });
      falseConfidencePatterns.push(
        'Modal dialog handling may differ between replay and production'
      );
      modalIframeInstability = 0.7;
    }
    
    if (replaySession.frameContext.length > 1) {
      indicators.push({
        type: 'multi-frame-context',
        reliability: 0.3,
        detail: `Replay crossed ${replaySession.frameContext.length} frames`,
      });
      falseConfidencePatterns.push(
        'Cross-frame navigation may behave differently in replay vs production'
      );
      modalIframeInstability = Math.max(modalIframeInstability, 0.5);
    }
    
    const asyncSteps = steps.filter(s => 
      s.actionType === 'wait' || 
      (s.inputPayload && typeof s.inputPayload === 'object' && 
       'key' in s.inputPayload && (s.inputPayload as { key: string }).key === 'Enter')
    );
    
    if (asyncSteps.length > totalSteps * 0.3) {
      indicators.push({
        type: 'high-async-dependency',
        reliability: 0.3,
        detail: `${asyncSteps.length} steps depend on async behavior`,
      });
      falseConfidencePatterns.push(
        'High async dependency may cause timing-sensitive failures'
      );
      asyncMaskingRisk = 0.6;
    }
    
    const urlTransitions = replaySession.urlTransitions.length;
    if (urlTransitions > 3) {
      indicators.push({
        type: 'frequent-navigation',
        reliability: 0.2,
        detail: `${urlTransitions} URL transitions in replay`,
      });
      falseConfidencePatterns.push(
        'Frequent navigation changes may cause element targeting issues'
      );
    }
    
    const duplicateActions = this.detectDuplicateActions(steps);
    if (duplicateActions.length > 0) {
      indicators.push({
        type: 'duplicate-actions',
        reliability: 0.3,
        detail: `${duplicateActions.length} duplicate action patterns detected`,
      });
      falseConfidencePatterns.push(
        'Duplicate actions may indicateflaky test logic'
      );
    }
    
    const overallTrust = this.computeOverallTrustScore(indicators);
    const isTrustworthy = overallTrust >= 0.6;
    const recommendation = this.determineRecommendation(
      overallTrust,
      timingRisk,
      modalIframeInstability,
      asyncMaskingRisk
    );
    
    return {
      id: `replay-trust-${candidate.id}-${Date.now()}`,
      candidateId: candidate.id,
      replaySessionId: replaySession.id,
      overallTrustScore: overallTrust,
      isTrustworthy,
      indicators,
      falseConfidencePatterns,
      timingRisk: Math.min(timingRisk, 1),
      modalIframeInstability: Math.min(modalIframeInstability, 1),
      asyncMaskingRisk: Math.min(asyncMaskingRisk, 1),
      recommendation,
      createdAt: Date.now(),
    };
  }
  
  private detectInconsistentSteps(steps: ReplayStep[]): number[] {
    const inconsistent: number[] = [];
    
    for (let i = 1; i < steps.length; i++) {
      const prev = steps[i - 1];
      const curr = steps[i];
      
      if (prev && curr && prev.result.success !== curr.result.success) {
        inconsistent.push(i);
      }
    }
    
    return inconsistent;
  }
  
  private computeTimingVariation(steps: ReplayStep[]): number {
    if (steps.length < 2) return 0;
    
    const durations = steps.map(s => s.result.duration);
    const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
    
    if (mean === 0) return 0;
    
    const squaredDiffs = durations.map(d => Math.pow(d - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / durations.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev / mean;
  }
  
  private detectDuplicateActions(steps: ReplayStep[]): { index: number; action: string }[] {
    const duplicates: { index: number; action: string }[] = [];
    
    const actionCounts = new Map<string, number>();
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step) continue;
      
      const action = step.actionType;
      const key = `${action}-${step.locatorRef?.value ?? ''}`;
      const count = (actionCounts.get(key) ?? 0) + 1;
      actionCounts.set(key, count);
      
      if (count > 2) {
        duplicates.push({ index: i, action });
      }
    }
    
    return duplicates;
  }
  
  private computeOverallTrustScore(indicators: ReplayTrustIndicator[]): number {
    if (indicators.length === 0) return 0.5;
    
    const avgReliability = indicators.reduce((sum, i) => 
      sum + (1 - i.reliability), 0
    ) / indicators.length;
    
    return Math.max(0, Math.min(1, avgReliability));
  }
  
  private determineRecommendation(
    trustScore: number,
    timingRisk: number,
    modalRisk: number,
    asyncRisk: number
  ): 'trust' | 'distrust' | 'verify-additionally' {
    const maxRisk = Math.max(timingRisk, modalRisk, asyncRisk);
    
    if (trustScore >= 0.8 && maxRisk < 0.3) {
      return 'trust';
    }
    
    if (trustScore < 0.4 || maxRisk > 0.7) {
      return 'distrust';
    }
    
    return 'verify-additionally';
  }
}