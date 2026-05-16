/**
 * Risk Discrimination Orchestrator
 *
 * Coordinates all risk discrimination components to produce
 * comprehensive safety analysis for healing candidates.
 */

import type { HealingCandidate } from '../../models/healing-candidate.js';
import type { ValidationResult } from '../../models/validation.js';
import type { ReplaySession } from '../../models/replay.js';
import type { Patch } from '../../models/patch.js';
import type { Locator } from '../../models/locator.js';
import type {
  RiskDiscriminationAnalysis,
  DeceptiveMutationReport,
  ReplayTrustworthinessReport,
  GovernanceBlindSpotReport,
  RiskEscalationRecommendation,
  MutationSafetyClassification,
  RiskSimulationReport,
} from './types.js';

import { DeceptiveMutationAnalyzer } from './deceptive-mutation-analyzer.js';
import { ReplayTrustworthinessAnalyzer } from './replay-trustworthiness-analyzer.js';
import { GovernanceBlindSpotAnalyzer, type GovernanceAnalysisInput } from './governance-blind-spot-analyzer.js';
import { StructuralRiskEscalation, type StructuralRiskInput } from './structural-risk-escalation.js';
import { RiskSimulationEngine, type SimulationInput } from './risk-simulation.js';
import { MutationSafetyClassifier, type ClassificationInput } from './mutation-safety-classifier.js';

export interface OrchestratorInput {
  candidate: HealingCandidate;
  validation?: ValidationResult;
  replaySession?: ReplaySession;
  relatedLocators: Locator[];
  navigationContext?: {
    originalUrl?: string;
    finalUrl?: string;
  };
  allCandidates?: HealingCandidate[];
  allValidations?: Map<string, ValidationResult>;
  allPatches?: Patch[];
  governanceThreshold?: number;
  stabilityThreshold?: number;
}

export interface BatchAnalysisInput {
  candidates: HealingCandidate[];
  validations: Map<string, ValidationResult>;
  replaySessions: Map<string, ReplaySession>;
  patches: Patch[];
  governanceThreshold: number;
  stabilityThreshold: number;
}

export class RiskDiscriminationOrchestrator {
  private deceptiveAnalyzer: DeceptiveMutationAnalyzer;
  private replayTrustAnalyzer: ReplayTrustworthinessAnalyzer;
  private governanceAnalyzer: GovernanceBlindSpotAnalyzer;
  private escalationAnalyzer: StructuralRiskEscalation;
  private simulationEngine: RiskSimulationEngine;
  private classifier: MutationSafetyClassifier;
  
  constructor() {
    this.deceptiveAnalyzer = new DeceptiveMutationAnalyzer();
    this.replayTrustAnalyzer = new ReplayTrustworthinessAnalyzer();
    this.governanceAnalyzer = new GovernanceBlindSpotAnalyzer();
    this.escalationAnalyzer = new StructuralRiskEscalation();
    this.simulationEngine = new RiskSimulationEngine();
    this.classifier = new MutationSafetyClassifier();
  }
  
  analyze(input: OrchestratorInput): RiskDiscriminationAnalysis {
    const { candidate, validation, replaySession, relatedLocators, navigationContext } = input;
    
    const deceptiveReport = this.deceptiveAnalyzer.analyze(
      candidate,
      relatedLocators.map(l => l.value),
      navigationContext
    );
    
    const replayTrustReport = this.replayTrustAnalyzer.analyze(
      candidate,
      replaySession,
      validation
    );
    
    const structuralInput: StructuralRiskInput = {
      locator: {
        id: candidate.locatorId,
        strategy: candidate.proposedStrategy as Locator['strategy'],
        value: candidate.proposedValue,
        expression: candidate.proposedExpression,
        sourceFile: candidate.domEvidence.originalPath ?? '',
        sourceLine: 0,
        propertyName: null,
        verified: false,
      },
      relatedLocators,
      replaySession,
    };
    
    const escalationRecommendations = this.escalationAnalyzer.analyze(structuralInput);
    
    const classificationInput: ClassificationInput = {
      candidate,
      validation,
      replaySession,
      deceptiveReport,
      replayTrustReport,
      escalationRecommendations,
    };
    
    const safetyClassification = this.classifier.classify(classificationInput);
    
    return {
      deceptiveMutationReport: deceptiveReport,
      replayTrustworthinessReport: replayTrustReport,
      governanceBlindSpotReport: undefined,
      escalationRecommendations,
      safetyClassification,
      createdAt: Date.now(),
    };
  }
  
  analyzeGovernance(input: BatchAnalysisInput): GovernanceBlindSpotReport {
    const governanceInput: GovernanceAnalysisInput = {
      candidates: input.candidates,
      validations: input.validations,
      patches: input.patches,
      governanceThreshold: input.governanceThreshold,
      stabilityThreshold: input.stabilityThreshold,
    };
    
    return this.governanceAnalyzer.analyze(governanceInput);
  }
  
  runSimulation(input: SimulationInput): RiskSimulationReport {
    return this.simulationEngine.simulate(input);
  }
  
  setSimulationConfig(config: Partial<RiskSimulationEngine extends { setConfig(c: infer T): void } ? T : never>): void {
    this.simulationEngine.setConfig(config);
  }
}