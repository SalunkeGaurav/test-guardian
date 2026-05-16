/**
 * Mutation Safety Classifier
 *
 * Classifies recoveries into safety categories:
 * - safe
 * - conditionally-safe
 * - structurally-risky
 * - replay-risky
 * - governance-ambiguous
 * - unsafe
 *
 * Uses deterministic rules with evidence tracking.
 */

import type { HealingCandidate } from '../../models/healing-candidate.js';
import type { ValidationResult } from '../../models/validation.js';
import type { ReplaySession } from '../../models/replay.js';
import type {
  DeceptiveMutationReport,
  ReplayTrustworthinessReport,
  GovernanceBlindSpotReport,
  RiskEscalationRecommendation,
  MutationSafetyClassification,
  MutationSafetyLevel,
} from './types.js';

export interface ClassificationInput {
  candidate: HealingCandidate;
  validation?: ValidationResult;
  replaySession?: ReplaySession;
  deceptiveReport?: DeceptiveMutationReport;
  replayTrustReport?: ReplayTrustworthinessReport;
  governanceReport?: GovernanceBlindSpotReport;
  escalationRecommendations: RiskEscalationRecommendation[];
}

const CONFIDENCE_WEIGHTS = {
  deceptive: 0.25,
  replayTrust: 0.25,
  governance: 0.25,
  structural: 0.25,
};

export class MutationSafetyClassifier {
  classify(input: ClassificationInput): MutationSafetyClassification {
    const riskFactors: string[] = [];
    const evidence: string[] = [];
    
    let unsafeScore = 0;
    let safeScore = 0;
    
    if (input.deceptiveReport && input.deceptiveReport.isDeceptive) {
      const severity = this.severityToNumeric(input.deceptiveReport.overallDeceptionScore);
      unsafeScore += severity * CONFIDENCE_WEIGHTS.deceptive;
      riskFactors.push(`Deceptive patterns detected: ${input.deceptiveReport.deceptionPatterns.join(', ')}`);
      evidence.push(`Deception score: ${input.deceptiveReport.overallDeceptionScore.toFixed(2)}`);
      
      if (input.deceptiveReport.overallDeceptionScore > 0.7) {
        unsafeScore += 0.2;
      }
    } else {
      safeScore += CONFIDENCE_WEIGHTS.deceptive;
      evidence.push('No deceptive patterns detected');
    }
    
    if (input.replayTrustReport) {
      if (!input.replayTrustReport.isTrustworthy) {
        const risk = Math.max(
          input.replayTrustReport.timingRisk,
          input.replayTrustReport.modalIframeInstability,
          input.replayTrustReport.asyncMaskingRisk
        );
        unsafeScore += risk * CONFIDENCE_WEIGHTS.replayTrust;
        riskFactors.push(`Replay trust issues: ${input.replayTrustReport.falseConfidencePatterns.join('; ')}`);
        evidence.push(`Replay trust score: ${input.replayTrustReport.overallTrustScore.toFixed(2)}`);
      } else {
        safeScore += CONFIDENCE_WEIGHTS.replayTrust;
        evidence.push('Replay validation is trustworthy');
      }
    }
    
    if (input.governanceReport) {
      const isRiskyGovernance = input.governanceReport.riskyMutationsPassingGovernance.includes(
        input.candidate.id
      );
      
      if (isRiskyGovernance) {
        unsafeScore += 0.2 * CONFIDENCE_WEIGHTS.governance;
        riskFactors.push('Mutation passes governance but has structural weakness');
        evidence.push('Flagged in governance blind spot analysis');
      } else {
        safeScore += CONFIDENCE_WEIGHTS.governance * 0.5;
      }
    }
    
    const highSeverityRecs = input.escalationRecommendations.filter(
      r => r.severity === 'high' || r.severity === 'critical'
    );
    
    if (highSeverityRecs.length > 0) {
      unsafeScore += highSeverityRecs.length * 0.1 * CONFIDENCE_WEIGHTS.structural;
      riskFactors.push(...highSeverityRecs.map(r => r.category));
      evidence.push(`Structural risks: ${highSeverityRecs.map(r => r.category).join(', ')}`);
    }
    
    const mediumSeverityRecs = input.escalationRecommendations.filter(
      r => r.severity === 'medium'
    );
    
    if (mediumSeverityRecs.length > 2) {
      unsafeScore += 0.1;
      riskFactors.push('Multiple medium-severity structural risks');
    }
    
    if (input.validation) {
      if (input.validation.falsePositiveIndicators.length > 0) {
        unsafeScore += input.validation.falsePositiveIndicators.length * 0.05;
        evidence.push(`False positive indicators: ${input.validation.falsePositiveIndicators.length}`);
      }
      
      if (input.validation.matchedElementCount > 1 && input.validation.status === 'passed') {
        unsafeScore += 0.15;
        riskFactors.push('Ambiguous match passed validation');
        evidence.push(`Matched ${input.validation.matchedElementCount} elements`);
      }
    }
    
    const safetyLevel = this.determineSafetyLevel(unsafeScore, safeScore, riskFactors);
    const confidence = this.computeConfidence(input);
    
    return {
      id: `safety-${input.candidate.id}-${Date.now()}`,
      candidateId: input.candidate.id,
      safetyLevel,
      confidence,
      evidence,
      riskFactors,
      supportingAnalysis: {
        deceptiveAnalysisRef: input.deceptiveReport?.id,
        replayTrustRef: input.replayTrustReport?.id,
        governanceBlindSpotRef: input.governanceReport?.id,
        escalationRef: input.escalationRecommendations.length > 0 
          ? `escalation-${input.candidate.id}` 
          : undefined,
      },
      createdAt: Date.now(),
    };
  }
  
  private severityToNumeric(score: number): number {
    if (score > 0.75) return 1.0;
    if (score > 0.5) return 0.75;
    if (score > 0.25) return 0.5;
    return 0.25;
  }
  
  private determineSafetyLevel(
    unsafeScore: number,
    safeScore: number,
    riskFactors: string[]
  ): MutationSafetyLevel {
    const total = unsafeScore + safeScore;
    const unsafeRatio = total > 0 ? unsafeScore / total : 0;
    
    if (unsafeScore >= 0.8) {
      return 'unsafe';
    }
    
    if (unsafeScore >= 0.5) {
      if (riskFactors.some(r => r.includes('replay') || r.includes('Deceptive'))) {
        return 'replay-risky';
      }
      return 'structurally-risky';
    }
    
    if (unsafeScore >= 0.3) {
      return 'governance-ambiguous';
    }
    
    if (safeScore >= 0.6 && unsafeRatio < 0.2) {
      return 'safe';
    }
    
    if (safeScore >= 0.4) {
      return 'conditionally-safe';
    }
    
    return 'governance-ambiguous';
  }
  
  private computeConfidence(input: ClassificationInput): number {
    let confidence = 0.5;
    
    if (input.deceptiveReport) {
      confidence += 0.15;
    }
    
    if (input.replayTrustReport) {
      confidence += 0.15;
    }
    
    if (input.validation) {
      confidence += 0.1;
    }
    
    if (input.escalationRecommendations.length > 0) {
      confidence += 0.1;
    }
    
    const hasMultipleInputs = [
      input.deceptiveReport,
      input.replayTrustReport,
      input.validation,
    ].filter(Boolean).length;
    
    if (hasMultipleInputs >= 3) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }
}