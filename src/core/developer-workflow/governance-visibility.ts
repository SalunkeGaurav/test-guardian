/**
 * Governance Visibility Simulation
 *
 * Simulates developer-facing visibility for governance warnings:
 * - risky recovery warnings
 * - replay divergence warnings
 * - structural instability warnings
 * - unsupported pattern warnings
 * - confidence uncertainty indicators
 */

import type {
  HealingReviewSession,
  GovernanceWarningType,
  GovernanceWarning,
  GovernanceVisibilityReport,
} from './types.js';

export class GovernanceVisibilitySimulator {
  simulate(sessions: HealingReviewSession[]): GovernanceVisibilityReport {
    const warnings = {
      riskyRecovery: 0,
      replayDivergence: 0,
      structuralInstability: 0,
      unsupportedPattern: 0,
      confidenceUncertainty: 0,
    };

    const warningPresentation: string[] = [];
    let totalComprehensionScore = 0;

    for (const session of sessions) {
      const sessionWarnings = this.extractWarnings(session);
      
      for (const warning of sessionWarnings) {
        switch (warning.type) {
          case 'risky-recovery':
            warnings.riskyRecovery++;
            break;
          case 'replay-divergence':
            warnings.replayDivergence++;
            break;
          case 'structural-instability':
            warnings.structuralInstability++;
            break;
          case 'unsupported-pattern':
            warnings.unsupportedPattern++;
            break;
          case 'confidence-uncertainty':
            warnings.confidenceUncertainty++;
            break;
        }

        warningPresentation.push(this.formatWarning(warning));
      }

      const comprehensionScore = this.evaluateWarningComprehension(session);
      totalComprehensionScore += comprehensionScore;
    }

    const comprehensionRate = sessions.length > 0 
      ? totalComprehensionScore / sessions.length 
      : 0;

    return {
      id: `governance-visibility-${Date.now()}`,
      sessionCount: sessions.length,
      warnings,
      warningPresentation,
      developerComprehensionScore: comprehensionRate,
      createdAt: Date.now(),
    };
  }

  private extractWarnings(session: HealingReviewSession): GovernanceWarning[] {
    const warnings: GovernanceWarning[] = [];

    const gov = session.governance;

    if (gov.riskLevel === 'high' || gov.riskLevel === 'critical') {
      warnings.push({
        type: 'risky-recovery',
        severity: gov.riskLevel,
        message: `High risk recovery (${gov.riskLevel}) detected`,
        evidence: gov.riskFactors,
      });
    }

    const failedReplays = session.replayEvidence.filter(e => !e.matched);
    if (failedReplays.length > 0) {
      warnings.push({
        type: 'replay-divergence',
        severity: failedReplays.length > session.replayEvidence.length / 2 ? 'high' : 'medium',
        message: `${failedReplays.length} replay validations failed`,
        evidence: failedReplays.map(e => `Session: ${e.sessionId}`),
      });
    }

    const hasStructuralRisk = session.diff.hunks.length > 3;
    if (hasStructuralRisk) {
      warnings.push({
        type: 'structural-instability',
        severity: 'medium',
        message: 'Complex structural changes detected',
        evidence: [`${session.diff.hunks.length} diff hunks`],
      });
    }

    const isUnsupportedPattern = this.isUnsupportedPattern(session.proposal.strategy);
    if (isUnsupportedPattern) {
      warnings.push({
        type: 'unsupported-pattern',
        severity: 'medium',
        message: `Strategy "${session.proposal.strategy}" has limited support`,
        evidence: ['Review documentation for strategy limitations'],
      });
    }

    if (gov.confidenceScore < 0.6 && gov.confidenceScore >= 0.4) {
      warnings.push({
        type: 'confidence-uncertainty',
        severity: 'low',
        message: `Moderate confidence (${(gov.confidenceScore * 100).toFixed(0)}%)`,
        evidence: ['More validation recommended'],
      });
    }

    return warnings;
  }

  private isUnsupportedPattern(strategy: string): boolean {
    const unsupportedStrategies = [
      'xpath-axis',
      'css-math',
      'dynamic-regex',
    ];
    return unsupportedStrategies.some(s => strategy.toLowerCase().includes(s));
  }

  private formatWarning(warning: GovernanceWarning): string {
    const icon = this.getSeverityIcon(warning.severity);
    return `${icon} [${warning.type.toUpperCase()}] ${warning.message}`;
  }

  private getSeverityIcon(severity: 'low' | 'medium' | 'high' | 'critical'): string {
    switch (severity) {
      case 'critical':
        return '⛔';
      case 'high':
        return '⚠️';
      case 'medium':
        return '⚡';
      case 'low':
        return 'ℹ️';
    }
  }

  private evaluateWarningComprehension(session: HealingReviewSession): number {
    let score = 0;
    let maxScore = 0;

    maxScore += 1;
    if (session.governance.riskLevel) {
      score += 1;
    }

    maxScore += 1;
    if (session.governance.warnings.length > 0) {
      score += 1;
    }

    maxScore += 1;
    if (session.governance.riskFactors.length > 0) {
      score += 1;
    }

    maxScore += 1;
    const hasViewGovernance = session.actions.some(a => a.action === 'view-governance');
    if (hasViewGovernance) {
      score += 1;
    }

    return maxScore > 0 ? score / maxScore : 0;
  }
}