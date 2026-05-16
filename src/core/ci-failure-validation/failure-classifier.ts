/**
 * Real Failure Classifier
 *
 * Classifies real historical failures into categories:
 * - selector drift
 * - semantic mismatch
 * - replay instability
 * - async timing failure
 * - framework abstraction failure
 * - governance ambiguity
 * - unsupported structure
 * - deceptive successful replay
 */

import type {
  HistoricalFailure,
  FailureCategory,
  FailureSeverity,
  RealFailureClassification,
  RealFailureClassificationReport,
  FailureReplaySession,
} from './types.js';

export class RealFailureClassifier {
  classify(
    failure: HistoricalFailure,
    replaySession?: FailureReplaySession
  ): RealFailureClassification {
    const category = this.determineCategory(failure);
    const severity = this.determineSeverity(failure);
    const confidence = this.computeConfidence(failure, replaySession);
    const evidence = this.gatherEvidence(failure, replaySession);
    const isDeceptive = this.detectDeception(failure, replaySession);
    const deceptiveIndicators = this.getDeceptiveIndicators(failure, replaySession);
    const replayStable = this.isReplayStable(replaySession);
    const governanceAmbiguous = this.isGovernanceAmbiguous(failure, replaySession);

    return {
      failureId: failure.id,
      category,
      severity,
      confidence,
      evidence,
      isDeceptive,
      deceptiveIndicators,
      replayStable,
      governanceAmbiguous,
      classificationTimestamp: Date.now(),
    };
  }

  classifyBatch(
    failures: HistoricalFailure[],
    replaySessions: Map<string, FailureReplaySession>
  ): RealFailureClassificationReport {
    const classifications = failures.map(f =>
      this.classify(f, replaySessions.get(f.id))
    );

    const categoryDistribution = this.computeCategoryDistribution(classifications);
    const severityDistribution = this.computeSeverityDistribution(classifications);
    const deceptiveCount = classifications.filter(c => c.isDeceptive).length;
    const governanceAmbiguousCount = classifications.filter(c => c.governanceAmbiguous).length;
    const summary = this.generateSummary(classifications);

    return {
      id: `failure-classification-${Date.now()}`,
      totalFailures: failures.length,
      classifications,
      categoryDistribution,
      severityDistribution,
      deceptiveCount,
      governanceAmbiguousCount,
      summary,
      createdAt: Date.now(),
    };
  }

  private determineCategory(failure: HistoricalFailure): FailureCategory {
    if (failure.category) return failure.category;

    const selector = failure.originalSelector;

    if (this.isSelectorDrift(failure)) return 'selector-drift';
    if (this.isSemanticMismatch(failure)) return 'semantic-mismatch';
    if (this.isReplayInstability(failure)) return 'replay-instability';
    if (this.isAsyncTimingFailure(failure)) return 'async-timing-failure';
    if (this.isFrameworkAbstractionFailure(failure)) return 'framework-abstraction-failure';
    if (this.isGovernanceAmbiguity(failure)) return 'governance-ambiguity';
    if (this.isUnsupportedStructure(failure)) return 'unsupported-structure';
    if (this.isDeceptiveSuccessfulReplay(failure)) return 'deceptive-successful-replay';

    return 'selector-drift';
  }

  private isSelectorDrift(failure: HistoricalFailure): boolean {
    const driftIndicators = ['not found', 'no such element', 'element not visible'];
    return driftIndicators.some(ind =>
      failure.failureReason.toLowerCase().includes(ind)
    );
  }

  private isSemanticMismatch(failure: HistoricalFailure): boolean {
    const semanticIndicators = ['wrong element', 'unexpected', 'incorrect'];
    return semanticIndicators.some(ind =>
      failure.failureReason.toLowerCase().includes(ind)
    );
  }

  private isReplayInstability(failure: HistoricalFailure): boolean {
    return failure.flakyHistory !== undefined &&
      failure.flakyHistory.failureCount > 0 &&
      failure.flakyHistory.passCount > 0;
  }

  private isAsyncTimingFailure(failure: HistoricalFailure): boolean {
    const asyncIndicators = ['timeout', 'waiting', 'not rendered', 'not loaded'];
    return asyncIndicators.some(ind =>
      failure.failureReason.toLowerCase().includes(ind)
    );
  }

  private isFrameworkAbstractionFailure(failure: HistoricalFailure): boolean {
    const frameworkIndicators = ['page object', 'wrapper', 'abstraction', 'method'];
    return frameworkIndicators.some(ind =>
      failure.failureReason.toLowerCase().includes(ind)
    );
  }

  private isGovernanceAmbiguity(failure: HistoricalFailure): boolean {
    const ambiguityIndicators = ['multiple', 'ambiguous', 'unclear', 'uncertain'];
    return ambiguityIndicators.some(ind =>
      failure.failureReason.toLowerCase().includes(ind)
    );
  }

  private isUnsupportedStructure(failure: HistoricalFailure): boolean {
    const unsupportedIndicators = ['iframe', 'shadow', 'modal', 'dialog', 'canvas'];
    return unsupportedIndicators.some(ind =>
      failure.originalSelector.toLowerCase().includes(ind) ||
      failure.failureReason.toLowerCase().includes(ind)
    );
  }

  private isDeceptiveSuccessfulReplay(failure: HistoricalFailure): boolean {
    const deceptiveIndicators = ['passed but', 'incorrect element', 'wrong target'];
    return deceptiveIndicators.some(ind =>
      failure.failureReason.toLowerCase().includes(ind)
    );
  }

  private determineSeverity(failure: HistoricalFailure): FailureSeverity {
    if (failure.severity) return failure.severity;

    if (failure.flakyHistory && failure.flakyHistory.failureCount > 10) {
      return 'critical';
    }

    if (failure.flakyHistory && failure.flakyHistory.failureCount > 5) {
      return 'high';
    }

    if (this.isDeceptiveSuccessfulReplay(failure)) {
      return 'high';
    }

    if (this.isUnsupportedStructure(failure)) {
      return 'medium';
    }

    return 'low';
  }

  private computeConfidence(
    failure: HistoricalFailure,
    replaySession?: FailureReplaySession
  ): number {
    let confidence = 0.6;

    if (replaySession) {
      const reproducible = replaySession.reproducible;
      confidence += reproducible ? 0.2 : -0.1;

      const successRate = replaySession.replayResults.filter(r => r.success).length /
        replaySession.replayResults.length;
      confidence += successRate * 0.1;
    }

    if (failure.flakyHistory) {
      const totalRuns = failure.flakyHistory.failureCount + failure.flakyHistory.passCount;
      const failureRate = failure.flakyHistory.failureCount / totalRuns;
      confidence += failureRate > 0.7 ? 0.1 : -0.05;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  private gatherEvidence(
    failure: HistoricalFailure,
    replaySession?: FailureReplaySession
  ): string[] {
    const evidence: string[] = [];

    evidence.push(`Failure reason: ${failure.failureReason}`);
    evidence.push(`Selector: ${failure.originalSelector}`);

    if (failure.flakyHistory) {
      evidence.push(
        `Flaky history: ${failure.flakyHistory.failureCount} failures, ${failure.flakyHistory.passCount} passes`
      );
    }

    if (replaySession) {
      const successCount = replaySession.replayResults.filter(r => r.success).length;
      evidence.push(
        `Replay: ${successCount}/${replaySession.replayAttempts} attempts succeeded`
      );
      evidence.push(`Reproducible: ${replaySession.reproducible}`);
    }

    return evidence;
  }

  private detectDeception(
    failure: HistoricalFailure,
    replaySession?: FailureReplaySession
  ): boolean {
    if (this.isDeceptiveSuccessfulReplay(failure)) return true;

    if (replaySession) {
      const hasFalsePositives = replaySession.replayResults.some(
        r => r.falsePositiveIndicators.length > 0
      );
      if (hasFalsePositives) return true;
    }

    return false;
  }

  private getDeceptiveIndicators(
    failure: HistoricalFailure,
    replaySession?: FailureReplaySession
  ): string[] {
    const indicators: string[] = [];

    if (this.isDeceptiveSuccessfulReplay(failure)) {
      indicators.push('Deceptive successful replay pattern detected');
    }

    if (replaySession) {
      for (const result of replaySession.replayResults) {
        for (const indicator of result.falsePositiveIndicators) {
          if (!indicators.includes(indicator)) {
            indicators.push(indicator);
          }
        }
      }
    }

    return indicators;
  }

  private isReplayStable(replaySession?: FailureReplaySession): boolean {
    if (!replaySession) return false;
    return replaySession.reproducible;
  }

  private isGovernanceAmbiguous(
    failure: HistoricalFailure,
    replaySession?: FailureReplaySession
  ): boolean {
    if (this.isGovernanceAmbiguity(failure)) return true;

    if (replaySession) {
      const hasMultipleMatches = replaySession.replayResults.some(
        r => r.matchedElementCount > 1
      );
      if (hasMultipleMatches) return true;
    }

    return false;
  }

  private computeCategoryDistribution(
    classifications: RealFailureClassification[]
  ): Record<string, number> {
    const distribution: Record<string, number> = {
      'selector-drift': 0,
      'semantic-mismatch': 0,
      'replay-instability': 0,
      'async-timing-failure': 0,
      'framework-abstraction-failure': 0,
      'governance-ambiguity': 0,
      'unsupported-structure': 0,
      'deceptive-successful-replay': 0,
    };

    for (const c of classifications) {
      distribution[c.category] = (distribution[c.category] ?? 0) + 1;
    }

    return distribution;
  }

  private computeSeverityDistribution(
    classifications: RealFailureClassification[]
  ): Record<string, number> {
    const distribution: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    for (const c of classifications) {
      distribution[c.severity] = (distribution[c.severity] ?? 0) + 1;
    }

    return distribution;
  }

  private generateSummary(classifications: RealFailureClassification[]): string {
    const total = classifications.length;
    const deceptive = classifications.filter(c => c.isDeceptive).length;
    const ambiguous = classifications.filter(c => c.governanceAmbiguous).length;
    const unstable = classifications.filter(c => !c.replayStable).length;

    return `Classified ${total} failures: ${deceptive} deceptive, ${ambiguous} governance-ambiguous, ${unstable} replay-unstable.`;
  }
}