/**
 * Governance Blind Spot Analyzer
 *
 * Identifies patterns where governance may be missing risky mutations.
 * Detects:
 * - Risky mutations passing governance thresholds
 * - Low-confidence mutations appearing stable
 * - Structurally weak approvals
 * - Insufficient penalty weighting
 * - Ambiguity under-detection
 */

import type { HealingCandidate } from '../../models/healing-candidate.js';
import type { ValidationResult } from '../../models/validation.js';
import type { Patch } from '../../models/patch.js';
import type {
  GovernanceBlindSpotReport,
  GovernanceBlindSpot,
} from './types.js';

export interface GovernanceAnalysisInput {
  candidates: HealingCandidate[];
  validations: Map<string, ValidationResult>;
  patches: Patch[];
  governanceThreshold: number;
  stabilityThreshold: number;
}

export class GovernanceBlindSpotAnalyzer {
  analyze(input: GovernanceAnalysisInput): GovernanceBlindSpotReport {
    const riskyMutationsPassingGovernance: string[] = [];
    const lowConfidenceStableMutations: string[] = [];
    const structurallyWeakApprovals: string[] = [];
    const insufficientPenaltyWeighting: string[] = [];
    const ambiguityUnderDetection: GovernanceBlindSpot[] = [];
    
    for (const candidate of input.candidates) {
      const validation = input.validations.get(candidate.id);
      
      if (candidate.confidence >= input.governanceThreshold) {
        if (this.hasStructuralWeakness(candidate)) {
          riskyMutationsPassingGovernance.push(candidate.id);
          structurallyWeakApprovals.push(candidate.id);
        }
        
        const structuralStability = candidate.ranking.structuralSimilarity * 
          candidate.ranking.hierarchyStability;
        if (structuralStability < input.stabilityThreshold) {
          insufficientPenaltyWeighting.push(candidate.id);
        }
      }
      
      if (candidate.confidence < 0.5 && 
          (validation?.status === 'passed' || !validation)) {
        lowConfidenceStableMutations.push(candidate.id);
      }
      
      if (validation?.matchedElementCount && 
          validation.matchedElementCount > 1 &&
          validation.status === 'passed') {
        ambiguityUnderDetection.push({
          type: 'ambiguous-match-passed',
          description: `Locator matched ${validation.matchedElementCount} elements but passed validation`,
          affectedCandidates: [candidate.id],
          severity: 'high',
          missingChecks: ['element count uniqueness', 'best match selection'],
          suggestedImprovements: ['Add multi-match penalty', 'Implement best-match scoring'],
        });
      }
      
      if (validation?.falsePositiveIndicators && 
          validation.falsePositiveIndicators.length > 0 &&
          validation.status === 'passed') {
        ambiguityUnderDetection.push({
          type: 'false-positive-indicators-ignored',
          description: `False positive indicators present but marked as passed`,
          affectedCandidates: [candidate.id],
          severity: 'medium',
          missingChecks: ['false positive penalty application'],
          suggestedImprovements: ['Apply false positive severity to confidence'],
        });
      }
    }
    
    for (const patch of input.patches) {
      if (patch.status === 'applied' && patch.confidence < 0.6) {
        riskyMutationsPassingGovernance.push(patch.proposalId);
      }
    }
    
    const summary = this.generateSummary(
      riskyMutationsPassingGovernance.length,
      lowConfidenceStableMutations.length,
      structurallyWeakApprovals.length,
      insufficientPenaltyWeighting.length,
      ambiguityUnderDetection.length
    );
    
    const recommendation = this.determineRecommendation(
      riskyMutationsPassingGovernance.length,
      structurallyWeakApprovals.length,
      ambiguityUnderDetection.length,
      input.candidates.length
    );
    
    return {
      id: `governance-blindspot-${Date.now()}`,
      analysisTimestamp: Date.now(),
      riskyMutationsPassingGovernance,
      lowConfidenceStableAppearingMutations: lowConfidenceStableMutations,
      structurallyWeakApprovals,
      insufficientPenaltyWeighting,
      ambiguityUnderDetection,
      summary,
      recommendation,
      createdAt: Date.now(),
    };
  }
  
  private hasStructuralWeakness(candidate: HealingCandidate): boolean {
    const weaknessIndicators = [
      candidate.ranking.structuralSimilarity < 0.5,
      candidate.ranking.attributeMatchScore < 0.5,
      candidate.ranking.hierarchyStability < 0.5,
      candidate.ranking.replayContextConfidence < 0.5,
    ];
    
    return weaknessIndicators.filter(Boolean).length >= 3;
  }
  
  private generateSummary(
    riskyCount: number,
    lowConfStableCount: number,
    weakApprovalCount: number,
    insufficientPenaltyCount: number,
    ambiguityCount: number
  ): string {
    const issues: string[] = [];
    
    if (riskyCount > 0) {
      issues.push(`${riskyCount} high-risk mutations passing governance`);
    }
    
    if (lowConfStableCount > 0) {
      issues.push(`${lowConfStableCount} low-confidence mutations appearing stable`);
    }
    
    if (weakApprovalCount > 0) {
      issues.push(`${weakApprovalCount} structurally weak approvals identified`);
    }
    
    if (insufficientPenaltyCount > 0) {
      issues.push(`${insufficientPenaltyCount} cases with insufficient penalty weighting`);
    }
    
    if (ambiguityCount > 0) {
      issues.push(`${ambiguityCount} ambiguity under-detection cases found`);
    }
    
    return issues.length > 0 
      ? `Identified ${issues.join('; ')}. Governance thresholds may need adjustment.`
      : 'No significant governance blind spots identified.';
  }
  
  private determineRecommendation(
    riskyCount: number,
    weakApprovalCount: number,
    ambiguityCount: number,
    totalCandidates: number
  ): 'approve-all' | 'reject-all' | 'selective-review' | 'threshold-adjustment' {
    const riskRatio = (riskyCount + weakApprovalCount + ambiguityCount) / totalCandidates;
    
    if (riskRatio > 0.5) {
      return 'threshold-adjustment';
    }
    
    if (riskRatio > 0.2) {
      return 'selective-review';
    }
    
    if (riskyCount === 0 && weakApprovalCount === 0) {
      return 'approve-all';
    }
    
    return 'selective-review';
  }
}