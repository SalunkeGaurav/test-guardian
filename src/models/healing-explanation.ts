/**
 * Healing Explanation schema.
 *
 * Captures deterministic reasoning for each healing proposal:
 * why it was chosen, rejected, what changed structurally,
 * and what evidence supports or contradicts the repair.
 *
 * No AI. No LLM. All reasoning is rule-based.
 */

export interface ConfidenceBreakdown {
  overall: number;
  survivabilityScore: number;
  structuralSimilarity: number;
  attributeMatchScore: number;
  hierarchyStability: number;
  replayContextConfidence: number;
}

export interface ExplanationEvidence {
  staticValidation?: {
    status: string;
    matchedElementCount: number;
    interactionSuccess: boolean;
    replayConfidence: number;
    falsePositives: string[];
  };
  runtimeValidation?: {
    status: string;
    runtimeConfidence: number;
    executedStepCount: number;
    divergences: string[];
    falsePositives: string[];
  };
  domComparison?: {
    structuralSimilarity: number;
    addedNodes: number;
    removedNodes: number;
    changedNodes: number;
  };
  survivability?: {
    exists: boolean;
    moved: boolean;
    hierarchyChanged: boolean;
    attributesChanged: number;
    confidence: number;
  };
}

export interface HealingExplanation {
  proposalId: string;
  locatorId: string;
  strategy: string;
  proposedExpression: string;
  confidenceBreakdown: ConfidenceBreakdown;
  rankingExplanation: string;
  domEvidenceSummary: string;
  structuralChangeExplanation: string;
  evidence: ExplanationEvidence;
  rejectionReasons: string[];
  rejectionReason?: string;
  createdAt: number;
}

export const EXPLANATION_SCHEMA_VERSION = 1;
