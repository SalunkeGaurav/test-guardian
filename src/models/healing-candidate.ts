/**
 * Healing Candidate schemas.
 *
 * These models extend the base healing types with rich explanation,
 * ranking metadata, and deterministic evidence tracking.
 * No AI. No embeddings. No patch generation.
 */

import type { AttributeChange } from './dom-intelligence.js';

export type CandidateStrategy =
  | 'attribute-similarity'
  | 'structural-proximity'
  | 'hierarchy-matching'
  | 'sibling-relationship'
  | 'text-proximity'
  | 'accessibility-metadata'
  | 'historical-selector-evolution';

export interface CandidateRanking {
  overall: number;
  survivabilityScore: number;
  structuralSimilarity: number;
  attributeMatchScore: number;
  hierarchyStability: number;
  replayContextConfidence: number;
}

export interface ChangeExplanation {
  whatChanged: string;
  type: string;
  before?: string;
  after?: string;
}

export interface CandidateExplanation {
  whyMatched: string;
  structuralChanges: ChangeExplanation[];
  confidenceBreakdown: CandidateRanking;
  survivabilityReasoning: string;
  attributeChanges: AttributeChange[];
  strategyApplied: CandidateStrategy;
}

export interface DomEvidence {
  originalPath?: string;
  matchedPath?: string;
  originalTag?: string;
  matchedTag?: string;
  stableAttributeMatches: string[];
  textContentMatch?: string;
}

export interface HealingCandidate {
  id: string;
  locatorId: string;
  originalExpression: string;
  proposedExpression: string;
  proposedStrategy: string;
  proposedValue: string;
  strategy: CandidateStrategy;
  confidence: number;
  ranking: CandidateRanking;
  explanation: CandidateExplanation;
  domEvidence: DomEvidence;
  replayContextRef?: string;
  validated: boolean;
  createdAt: number;
}

export interface HealingStrategyDefinition {
  name: CandidateStrategy;
  description: string;
  priority: number;
  minConfidence: number;
}
