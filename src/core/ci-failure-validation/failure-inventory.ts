/**
 * Real-World Failure Inventory
 *
 * Generates deterministic inventory of:
 * - unsupported patterns
 * - unstable replay behaviors
 * - deceptive recovery structures
 * - governance blind spots
 * - replay false-confidence patterns
 * - healing instability clusters
 *
 * No silent failures allowed.
 */

import type {
  HistoricalFailure,
  FailureCategory,
  FailureSeverity,
  FailureReplaySession,
  RealFailureClassification,
  FailureInventoryEntry,
  RealWorldFailureInventory,
} from './types.js';

export class RealWorldFailureInventoryGenerator {
  generate(
    failures: HistoricalFailure[],
    replaySessions: Map<string, FailureReplaySession>,
    classifications: RealFailureClassification[]
  ): RealWorldFailureInventory {
    const inventory: FailureInventoryEntry[] = [];

    for (const failure of failures) {
      const entry = this.createInventoryEntry(failure, replaySessions.get(failure.id), classifications);
      inventory.push(entry);
    }

    const unsupportedPatterns = this.extractUnsupportedPatterns(inventory);
    const unstableReplayBehaviors = this.extractUnstableReplayBehaviors(inventory);
    const deceptiveRecoveryStructures = this.extractDeceptiveRecoveryStructures(inventory);
    const governanceBlindSpots = this.extractGovernanceBlindSpots(inventory);
    const replayFalseConfidencePatterns = this.extractReplayFalseConfidencePatterns(inventory);
    const healingInstabilityClusters = this.extractHealingInstabilityClusters(inventory);
    const summary = this.generateSummary(inventory);

    return {
      id: `failure-inventory-${Date.now()}`,
      totalFailures: failures.length,
      inventory,
      unsupportedPatterns,
      unstableReplayBehaviors,
      deceptiveRecoveryStructures,
      governanceBlindSpots,
      replayFalseConfidencePatterns,
      healingInstabilityClusters,
      summary,
      createdAt: Date.now(),
    };
  }

  private createInventoryEntry(
    failure: HistoricalFailure,
    replaySession?: FailureReplaySession,
    classifications?: RealFailureClassification[]
  ): FailureInventoryEntry {
    const classification = classifications?.find(c => c.failureId === failure.id);

    const pattern = this.describePattern(failure);
    const frequency = this.estimateFrequency(failure, replaySession);
    const supportedByPlatform = this.isSupportedByPlatform(failure);
    const deceptiveStructure = classification?.isDeceptive ?? false;
    const governanceBlindSpot = classification?.governanceAmbiguous ?? false;
    const evidence = this.gatherEvidence(failure, replaySession, classification);

    return {
      id: failure.id,
      category: failure.category,
      pattern,
      frequency,
      severity: failure.severity,
      reproducible: replaySession?.reproducible ?? false,
      supportedByPlatform,
      deceptiveStructure,
      governanceBlindSpot,
      evidence,
    };
  }

  private describePattern(failure: HistoricalFailure): string {
    return `${failure.category}: ${failure.failureReason.substring(0, 100)}`;
  }

  private estimateFrequency(
    failure: HistoricalFailure,
    replaySession?: FailureReplaySession
  ): number {
    if (failure.flakyHistory) {
      return failure.flakyHistory.failureCount;
    }

    if (replaySession) {
      const successCount = replaySession.replayResults.filter(r => r.success).length;
      return replaySession.replayAttempts - successCount;
    }

    return 1;
  }

  private isSupportedByPlatform(failure: HistoricalFailure): boolean {
    const unsupportedCategories: FailureCategory[] = ['unsupported-structure'];
    return !unsupportedCategories.includes(failure.category);
  }

  private gatherEvidence(
    failure: HistoricalFailure,
    replaySession?: FailureReplaySession,
    classification?: RealFailureClassification
  ): string[] {
    const evidence: string[] = [];

    evidence.push(`Source: ${failure.sourceRepository}`);
    evidence.push(`Test: ${failure.testName} (${failure.testFile})`);
    evidence.push(`Selector: ${failure.originalSelector}`);

    if (classification) {
      evidence.push(`Confidence: ${(classification.confidence * 100).toFixed(0)}%`);
    }

    if (replaySession) {
      evidence.push(`Reproducible: ${replaySession.reproducible}`);
    }

    return evidence;
  }

  private extractUnsupportedPatterns(inventory: FailureInventoryEntry[]): string[] {
    return inventory
      .filter(e => !e.supportedByPlatform)
      .map(e => e.pattern);
  }

  private extractUnstableReplayBehaviors(inventory: FailureInventoryEntry[]): string[] {
    return inventory
      .filter(e => !e.reproducible)
      .map(e => e.pattern);
  }

  private extractDeceptiveRecoveryStructures(inventory: FailureInventoryEntry[]): string[] {
    return inventory
      .filter(e => e.deceptiveStructure)
      .map(e => e.pattern);
  }

  private extractGovernanceBlindSpots(inventory: FailureInventoryEntry[]): string[] {
    return inventory
      .filter(e => e.governanceBlindSpot)
      .map(e => e.pattern);
  }

  private extractReplayFalseConfidencePatterns(inventory: FailureInventoryEntry[]): string[] {
    return inventory
      .filter(e => e.deceptiveStructure && e.reproducible)
      .map(e => e.pattern);
  }

  private extractHealingInstabilityClusters(inventory: FailureInventoryEntry[]): string[] {
    const clusters = new Map<string, number>();

    for (const entry of inventory) {
      if (!entry.reproducible || entry.deceptiveStructure) {
        const category = entry.category;
        clusters.set(category, (clusters.get(category) ?? 0) + 1);
      }
    }

    const result: string[] = [];
    for (const [category, count] of clusters.entries()) {
      if (count >= 2) {
        result.push(`${category} (${count} failures)`);
      }
    }

    return result;
  }

  private generateSummary(inventory: FailureInventoryEntry[]): string {
    const total = inventory.length;
    const unsupported = inventory.filter(e => !e.supportedByPlatform).length;
    const unstable = inventory.filter(e => !e.reproducible).length;
    const deceptive = inventory.filter(e => e.deceptiveStructure).length;
    const blindSpots = inventory.filter(e => e.governanceBlindSpot).length;

    return `Inventory: ${total} failures, ${unsupported} unsupported, ${unstable} unstable, ${deceptive} deceptive, ${blindSpots} governance blind spots.`;
  }
}