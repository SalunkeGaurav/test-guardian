/**
 * Risk Simulation Module
 *
 * Simulates stricter validation penalties to project impact on:
 * - Risky approval rate
 * - Rejection precision
 * - Recovery rate
 *
 * Does NOT auto-apply - produces recommendations only.
 */

import type { HealingCandidate } from '../../models/healing-candidate.js';
import type { ValidationResult } from '../../models/validation.js';
import type {
  RiskSimulationConfig,
  RiskSimulationReport,
} from './types.js';

export interface SimulationInput {
  candidates: HealingCandidate[];
  validations: Map<string, ValidationResult>;
  baselineRiskyApprovalRate: number;
  baselineRejectionPrecision: number;
  baselineRecoveryRate: number;
}

const DEFAULT_CONFIG: RiskSimulationConfig = {
  replayPenaltyMultiplier: 1.5,
  structuralInstabilityAmplifier: 2.0,
  ambiguityPenaltyMultiplier: 1.8,
  dynamicSelectorRiskMultiplier: 1.7,
  duplicateSelectorPenaltyMultiplier: 1.6,
};

export class RiskSimulationEngine {
  private config: RiskSimulationConfig;
  
  constructor(config: Partial<RiskSimulationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  simulate(input: SimulationInput): RiskSimulationReport {
    const appliedPenalties: string[] = [];
    let adjustedPassCount = 0;
    let adjustedRejectCount = 0;
    let unchangedCount = 0;
    
    for (const candidate of input.candidates) {
      const validation = input.validations.get(candidate.id);
      
      if (!validation) {
        unchangedCount++;
        continue;
      }
      
      const penalty = this.calculatePenalty(candidate, validation);
      
      if (penalty > 0.3) {
        adjustedRejectCount++;
        appliedPenalties.push(`Candidate ${candidate.id}: penalty ${penalty.toFixed(2)}`);
      } else if (penalty > 0.1) {
        unchangedCount++;
      } else {
        adjustedPassCount++;
      }
    }
    
    const totalCandidates = input.candidates.length;
    const projectedRiskyApprovalRate = this.projectRiskyApprovalRate(
      input.baselineRiskyApprovalRate,
      adjustedRejectCount,
      totalCandidates
    );
    
    const projectedRejectionPrecision = this.projectRejectionPrecision(
      input.baselineRejectionPrecision,
      adjustedRejectCount,
      totalCandidates
    );
    
    const projectedRecoveryRate = this.projectRecoveryRate(
      input.baselineRecoveryRate,
      adjustedPassCount,
      totalCandidates
    );
    
    const improvements = {
      riskyApprovalReduction: input.baselineRiskyApprovalRate - projectedRiskyApprovalRate,
      rejectionPrecisionImprovement: projectedRejectionPrecision - input.baselineRejectionPrecision,
      recoveryRateImpact: projectedRecoveryRate - input.baselineRecoveryRate,
    };
    
    return {
      id: `risk-simulation-${Date.now()}`,
      baselineRiskyApprovalRate: input.baselineRiskyApprovalRate,
      projectedRiskyApprovalRate,
      baselineRejectionPrecision: input.baselineRejectionPrecision,
      projectedRejectionPrecision,
      baselineRecoveryRate: input.baselineRecoveryRate,
      projectedRecoveryRate,
      simulationConfig: this.config,
      appliedPenalties,
      estimatedImprovements: improvements,
      createdAt: Date.now(),
    };
  }
  
  private calculatePenalty(
    candidate: HealingCandidate,
    validation: ValidationResult
  ): number {
    let penalty = 0;
    
    if (validation.falsePositiveIndicators.length > 0) {
      penalty += 0.15 * validation.falsePositiveIndicators.length;
    }
    
    if (validation.matchedElementCount > 1) {
      penalty += (validation.matchedElementCount - 1) * 0.1 * this.config.ambiguityPenaltyMultiplier;
    }
    
    if (candidate.ranking.structuralSimilarity < 0.6) {
      penalty += (0.6 - candidate.ranking.structuralSimilarity) * this.config.structuralInstabilityAmplifier;
    }
    
    if (candidate.ranking.attributeMatchScore < 0.5) {
      penalty += (0.5 - candidate.ranking.attributeMatchScore) * 0.15;
    }
    
    if (candidate.ranking.replayContextConfidence < 0.6) {
      penalty += (0.6 - candidate.ranking.replayContextConfidence) * this.config.replayPenaltyMultiplier;
    }
    
    const hasDynamicSelector = /\$\{|\$\(|\[.*\$\{/;
    if (hasDynamicSelector.test(candidate.proposedValue)) {
      penalty += 0.2 * this.config.dynamicSelectorRiskMultiplier;
    }
    
    const duplicateIndicators = this.detectDuplicatePattern(candidate);
    if (duplicateIndicators) {
      penalty += 0.15 * this.config.duplicateSelectorPenaltyMultiplier;
    }
    
    return Math.min(penalty, 1.0);
  }
  
  private detectDuplicatePattern(candidate: HealingCandidate): boolean {
    const parts = candidate.proposedValue.split(/[#.\[\]:]/).filter(Boolean);
    return parts.length > 3;
  }
  
  private projectRiskyApprovalRate(
    baseline: number,
    rejectCount: number,
    total: number
  ): number {
    if (total === 0) return baseline;
    
    const rejectionIncrease = rejectCount / total;
    return Math.max(0, baseline - rejectionIncrease * 0.8);
  }
  
  private projectRejectionPrecision(
    baseline: number,
    rejectCount: number,
    total: number
  ): number {
    if (total === 0) return baseline;
    
    const precisionImprovement = (rejectCount / total) * 0.3;
    return Math.min(1, baseline + precisionImprovement);
  }
  
  private projectRecoveryRate(
    baseline: number,
    passCount: number,
    total: number
  ): number {
    if (total === 0) return baseline;
    
    const passRate = passCount / total;
    const recoveryImpact = (passRate - baseline) * 0.5;
    return Math.max(0, baseline + recoveryImpact);
  }
  
  setConfig(config: Partial<RiskSimulationConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  getConfig(): RiskSimulationConfig {
    return { ...this.config };
  }
}