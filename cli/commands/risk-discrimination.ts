/**
 * Risk Discrimination CLI Command
 *
 * Implements Risk Discrimination Hardening v1.
 * Analyzes mutations to detect deceptive patterns, evaluate replay trustworthiness,
 * identify governance blind spots, and classify mutation safety.
 */

import { info, error, warn } from '../../src/logger/index.js';
import { RiskDiscriminationStorage } from '../../src/core/risk-discrimination/storage.js';
import { RiskDiscriminationOrchestrator } from '../../src/core/risk-discrimination/orchestrator.js';
import type { HealingCandidate } from '../../src/models/healing-candidate.js';
import type { ValidationResult } from '../../src/models/validation.js';
import { FileStorage } from '../../src/core/storage/file.js';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface RiskDiscriminationOptions {
  candidateId?: string;
  governanceAnalysis?: boolean;
  simulation?: boolean;
  verbose?: boolean;
}

interface StoredCandidate {
  id: string;
  locatorId: string;
  originalExpression: string;
  proposedExpression: string;
  proposedStrategy: string;
  proposedValue: string;
  strategy: string;
  confidence: number;
  ranking: {
    overall: number;
    survivabilityScore: number;
    structuralSimilarity: number;
    attributeMatchScore: number;
    hierarchyStability: number;
    replayContextConfidence: number;
    stabilityScore?: number;
  };
  explanation: {
    whyMatched: string;
    confidenceBreakdown: Record<string, number>;
  };
  domEvidence: {
    originalPath?: string;
    matchedPath?: string;
    originalTag?: string;
    matchedTag?: string;
  };
  validated: boolean;
  createdAt: number;
}

function loadCandidates(): StoredCandidate[] {
  const healingHistoryPath = join(process.cwd(), '.testguardian', 'healing-history.json');
  
  if (!existsSync(healingHistoryPath)) {
    return [];
  }
  
  try {
    const data = readFileSync(healingHistoryPath, 'utf-8');
    const history = JSON.parse(data);
    
    const candidates: StoredCandidate[] = [];
    
    for (const entry of history) {
      if (entry.proposals) {
        for (const proposal of entry.proposals) {
          candidates.push({
            id: proposal.id,
            locatorId: proposal.locatorId,
            originalExpression: proposal.originalExpression,
            proposedExpression: proposal.proposedExpression,
            proposedStrategy: proposal.strategy || 'css',
            proposedValue: proposal.proposedExpression,
            strategy: proposal.strategy || 'unknown',
            confidence: proposal.confidence,
            ranking: {
              overall: proposal.confidence,
              survivabilityScore: 0.7,
              structuralSimilarity: 0.7,
              attributeMatchScore: 0.7,
              hierarchyStability: 0.7,
              replayContextConfidence: 0.7,
            },
            explanation: {
              whyMatched: proposal.evidence?.join(' ') || '',
              confidenceBreakdown: { confidence: proposal.confidence },
            },
            domEvidence: {},
            validated: proposal.validated || false,
            createdAt: entry.timestamp || Date.now(),
          });
        }
      }
    }
    
    return candidates;
  } catch {
    return [];
  }
}

function loadValidations(): Map<string, ValidationResult> {
  const validations = new Map<string, ValidationResult>();
  
  const analysisPath = join(process.cwd(), '.testguardian', 'analysis-meta.json');
  
  if (existsSync(analysisPath)) {
    try {
      const data = readFileSync(analysisPath, 'utf-8');
      const meta = JSON.parse(data);
      
      if (meta.lastValidation) {
        validations.set(meta.lastValidation.id, meta.lastValidation);
      }
    } catch {
    }
  }
  
  return validations;
}

function generateSummary(analysis: ReturnType<RiskDiscriminationOrchestrator['analyze']>): string {
  const lines: string[] = [];
  
  lines.push('');
  lines.push('═'.repeat(60));
  lines.push('RISK DISCRIMINATION ANALYSIS REPORT');
  lines.push('═'.repeat(60));
  lines.push('');
  
  const safety = analysis.safetyClassification;
  lines.push(`Safety Classification: ${safety.safetyLevel.toUpperCase()}`);
  lines.push(`Confidence: ${(safety.confidence * 100).toFixed(1)}%`);
  lines.push('');
  
  if (analysis.deceptiveMutationReport) {
    const dec = analysis.deceptiveMutationReport;
    lines.push('─'.repeat(40));
    lines.push('DECEPTIVE MUTATION ANALYSIS');
    lines.push('─'.repeat(40));
    lines.push(`Deceptive: ${dec.isDeceptive ? 'YES' : 'NO'}`);
    lines.push(`Deception Score: ${(dec.overallDeceptionScore * 100).toFixed(1)}%`);
    lines.push(`Recommendation: ${dec.recommendation}`);
    
    if (dec.deceptionPatterns.length > 0) {
      lines.push('Patterns Detected:');
      for (const pattern of dec.deceptionPatterns) {
        lines.push(`  - ${pattern}`);
      }
    }
    lines.push('');
  }
  
  if (analysis.replayTrustworthinessReport) {
    const trust = analysis.replayTrustworthinessReport;
    lines.push('─'.repeat(40));
    lines.push('REPLAY TRUSTWORTHINESS');
    lines.push('─'.repeat(40));
    lines.push(`Trustworthy: ${trust.isTrustworthy ? 'YES' : 'NO'}`);
    lines.push(`Trust Score: ${(trust.overallTrustScore * 100).toFixed(1)}%`);
    lines.push(`Timing Risk: ${(trust.timingRisk * 100).toFixed(1)}%`);
    lines.push(`Async Risk: ${(trust.asyncMaskingRisk * 100).toFixed(1)}%`);
    lines.push('');
  }
  
  if (analysis.escalationRecommendations.length > 0) {
    lines.push('─'.repeat(40));
    lines.push('STRUCTURAL RISK ESCALATION');
    lines.push('─'.repeat(40));
    
    for (const rec of analysis.escalationRecommendations) {
      lines.push(`[${rec.severity.toUpperCase()}] ${rec.category}`);
      lines.push(`  ${rec.description}`);
      lines.push(`  Recommendation: ${rec.recommendation}`);
    }
    lines.push('');
  }
  
  lines.push('─'.repeat(40));
  lines.push('EVIDENCE');
  lines.push('─'.repeat(40));
  
  for (const ev of safety.evidence) {
    lines.push(`  • ${ev}`);
  }
  
  if (safety.riskFactors.length > 0) {
    lines.push('');
    lines.push('RISK FACTORS:');
    for (const rf of safety.riskFactors) {
      lines.push(`  ⚠ ${rf}`);
    }
  }
  
  lines.push('');
  lines.push('═'.repeat(60));
  
  return lines.join('\n');
}

export async function runRiskDiscrimination(options: RiskDiscriminationOptions): Promise<void> {
  info('CLI', 'Risk Discrimination Hardening v1');
  
  try {
    const storage = new RiskDiscriminationStorage(process.cwd());
    const orchestrator = new RiskDiscriminationOrchestrator();
    
    const candidates = loadCandidates();
    
    if (candidates.length === 0) {
      warn('CLI', 'No healing candidates found. Run heal command first.');
      info('CLI', 'Analyzing with governance-level scan instead...');
    }
    
    if (options.governanceAnalysis) {
      info('CLI', 'Running governance blind spot analysis...');
      
      const validations = loadValidations();
      
      const governanceReport = orchestrator.analyzeGovernance({
        candidates: candidates as unknown as HealingCandidate[],
        validations,
        replaySessions: new Map(),
        patches: [],
        governanceThreshold: 0.7,
        stabilityThreshold: 0.6,
      });
      
      storage.saveGovernanceBlindSpot(governanceReport);
      
      console.log('');
      console.log('═'.repeat(60));
      console.log('GOVERNANCE BLIND SPOT ANALYSIS');
      console.log('═'.repeat(60));
      console.log('');
      console.log(governanceReport.summary);
      console.log(`Recommendation: ${governanceReport.recommendation}`);
      console.log('');
      
      info('CLI', 'Governance analysis complete');
      return;
    }
    
    if (options.simulation) {
      info('CLI', 'Running risk simulation...');
      
      const validations = loadValidations();
      
      const simulationReport = orchestrator.runSimulation({
        candidates: candidates as unknown as HealingCandidate[],
        validations,
        baselineRiskyApprovalRate: 0.15,
        baselineRejectionPrecision: 0.75,
        baselineRecoveryRate: 0.85,
      });
      
      storage.saveSimulation(simulationReport);
      
      console.log('');
      console.log('═'.repeat(60));
      console.log('RISK SIMULATION RESULTS');
      console.log('═'.repeat(60));
      console.log('');
      console.log(`Baseline Risky Approval Rate: ${(simulationReport.baselineRiskyApprovalRate * 100).toFixed(1)}%`);
      console.log(`Projected Risky Approval Rate: ${(simulationReport.projectedRiskyApprovalRate * 100).toFixed(1)}%`);
      console.log(`Risk Approval Reduction: ${(simulationReport.estimatedImprovements.riskyApprovalReduction * 100).toFixed(1)}%`);
      console.log('');
      console.log(`Baseline Rejection Precision: ${(simulationReport.baselineRejectionPrecision * 100).toFixed(1)}%`);
      console.log(`Projected Rejection Precision: ${(simulationReport.projectedRejectionPrecision * 100).toFixed(1)}%`);
      console.log('');
      console.log(`Recovery Rate Impact: ${(simulationReport.estimatedImprovements.recoveryRateImpact * 100).toFixed(1)}%`);
      console.log('');
      
      info('CLI', 'Risk simulation complete');
      return;
    }
    
    if (candidates.length > 0) {
      const candidate = options.candidateId
        ? candidates.find(c => c.id === options.candidateId)
        : candidates[0];
      
      if (!candidate) {
        error('CLI', `Candidate ${options.candidateId} not found`);
        return;
      }
      
      info('CLI', `Analyzing candidate: ${candidate.id}`);
      
      const analysis = orchestrator.analyze({
        candidate: candidate as unknown as HealingCandidate,
        relatedLocators: [],
        navigationContext: {},
      });
      
      storage.saveAnalysis(analysis);
      
      console.log(generateSummary(analysis));
      
      info('CLI', 'Risk discrimination analysis complete');
    } else {
      info('CLI', 'No candidates to analyze. Generating sample report...');
      
      const sampleCandidate: HealingCandidate = {
        id: 'sample-candidate-001',
        locatorId: 'sample-locator-001',
        originalExpression: '#login-button',
        proposedExpression: 'button.submit',
        proposedStrategy: 'css',
        proposedValue: 'button.submit',
        strategy: 'attribute-similarity',
        confidence: 0.75,
        ranking: {
          overall: 0.75,
          survivabilityScore: 0.7,
          structuralSimilarity: 0.8,
          attributeMatchScore: 0.6,
          hierarchyStability: 0.75,
          replayContextConfidence: 0.8,
        },
        explanation: {
          whyMatched: 'Attribute similarity detected',
          structuralChanges: [],
          confidenceBreakdown: {
            overall: 0.75,
            survivabilityScore: 0.7,
            structuralSimilarity: 0.8,
            attributeMatchScore: 0.6,
            hierarchyStability: 0.75,
            replayContextConfidence: 0.8,
          },
          survivabilityReasoning: 'High survivability expected',
          attributeChanges: [],
          strategyApplied: 'attribute-similarity',
        },
        domEvidence: {
          originalTag: 'button',
          matchedTag: 'button',
          stableAttributeMatches: ['id', 'class'],
        },
        validated: true,
        createdAt: Date.now(),
      };
      
      const analysis = orchestrator.analyze({
        candidate: sampleCandidate,
        relatedLocators: [],
        navigationContext: {},
      });
      
      storage.saveAnalysis(analysis);
      
      console.log(generateSummary(analysis));
      
      info('CLI', 'Sample analysis complete');
    }
  } catch (err) {
    error('CLI', `Risk discrimination failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}