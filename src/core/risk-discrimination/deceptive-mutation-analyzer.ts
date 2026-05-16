/**
 * Deceptive Mutation Analyzer
 *
 * Detects mutations that appear successful but are structurally risky.
 * Identifies patterns like:
 * - Structurally similar wrong targets
 * - Duplicated selector collisions
 * - Replay-consistent but semantically incorrect flows
 * - Dynamic selector drift
 * - Hidden navigation divergence
 * - Async timing deception
 * - Wrapper abstraction masking
 */

import type {
  HealingCandidate,
  CandidateExplanation,
} from '../../models/healing-candidate.js';
import type {
  DeceptiveMutationReport,
  DeceptiveMutationEvidence,
  MutationDeceptionPattern,
} from './types.js';

function computeSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2[i - 1] === str1[j - 1]) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1,
          matrix[i]![j - 1]! + 1,
          matrix[i - 1]![j]! + 1
        );
      }
    }
  }
  
  return matrix[str2.length]![str1.length]!;
}

function extractSelectorParts(selector: string): string[] {
  return selector
    .replace(/[.#\[\]:]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function hasDuplicatedSelectors(selector: string, otherSelectors: string[]): boolean {
  const parts = extractSelectorParts(selector);
  return parts.some(part => 
    part.length > 2 && otherSelectors.some(other => 
      other.includes(part) && other !== selector
    )
  );
}

function detectDynamicSelectorDrift(original: string, proposed: string): boolean {
  const originalParts = original.split(/[>+~\s]/).filter(Boolean);
  const proposedParts = proposed.split(/[>+~\s]/).filter(Boolean);
  
  if (originalParts.length !== proposedParts.length) return false;
  
  let differentCount = 0;
  for (let i = 0; i < originalParts.length; i++) {
    if (originalParts[i] !== proposedParts[i]) {
      differentCount++;
    }
  }
  
  return differentCount > 0 && differentCount <= originalParts.length * 0.5;
}

function detectAsyncTimingRisk(strategy: string, value: string): boolean {
  const asyncIndicators = ['waitFor', 'wait', 'timeout', 'delay', 'debounce', 'throttle'];
  return asyncIndicators.some(indicator => 
    value.toLowerCase().includes(indicator) || 
    strategy.toLowerCase().includes(indicator)
  );
}

function detectWrapperAbstractionMasking(
  originalExpression: string,
  proposedExpression: string
): boolean {
  const wrapperPatterns = [
    /page\.\w+\(/i,
    /locator\.\w+\(/i,
    /\.\w+\(.*\)\s*\./i,
  ];
  
  const originalWrapped = wrapperPatterns.some(p => p.test(originalExpression));
  const proposedWrapped = wrapperPatterns.some(p => p.test(proposedExpression));
  
  return !originalWrapped && proposedWrapped;
}

export class DeceptiveMutationAnalyzer {
  analyze(
    candidate: HealingCandidate,
    otherLocators: string[] = [],
    navigationContext?: { originalUrl?: string; finalUrl?: string }
  ): DeceptiveMutationReport {
    const evidence: DeceptiveMutationEvidence[] = [];
    const patterns: MutationDeceptionPattern[] = [];
    
    const similarity = computeSimilarity(
      candidate.originalExpression,
      candidate.proposedExpression
    );
    
    if (similarity > 0.7 && candidate.originalExpression !== candidate.proposedExpression) {
      const originalParts = extractSelectorParts(candidate.originalExpression);
      const proposedParts = extractSelectorParts(candidate.proposedExpression);
      
      const commonParts = originalParts.filter(p => proposedParts.includes(p));
      
      if (commonParts.length > 0) {
        evidence.push({
          pattern: 'structurally-similar-wrong-target',
          severity: 'high',
          description: `Locator shares ${commonParts.length} structural elements but targets different element`,
          originalLocator: candidate.originalExpression,
          proposedLocator: candidate.proposedExpression,
          similarityScore: similarity,
          structuralEvidence: [
            `Shared elements: ${commonParts.join(', ')}`,
            `Original selector: ${candidate.originalExpression}`,
            `Proposed selector: ${candidate.proposedExpression}`,
          ],
        });
        patterns.push('structurally-similar-wrong-target');
      }
    }
    
    if (hasDuplicatedSelectors(candidate.proposedExpression, otherLocators)) {
      const duplicatedPart = extractSelectorParts(candidate.proposedExpression)
        .find(part => part.length > 2 && otherLocators.some(o => 
          o.includes(part) && o !== candidate.proposedExpression
        ));
      
      evidence.push({
        pattern: 'duplicated-selector-collision',
        severity: 'medium',
        description: `Selector contains "${duplicatedPart}" which appears in multiple locators`,
        originalLocator: candidate.originalExpression,
        proposedLocator: candidate.proposedExpression,
        similarityScore: 1,
        structuralEvidence: [
          `Duplicated identifier: ${duplicatedPart}`,
          `Collision risk: selector may match unintended element`,
        ],
      });
      patterns.push('duplicated-selector-collision');
    }
    
    if (detectDynamicSelectorDrift(candidate.originalExpression, candidate.proposedExpression)) {
      evidence.push({
        pattern: 'dynamic-selector-drift',
        severity: 'medium',
        description: 'Selector structure changed while preserving partial similarity',
        originalLocator: candidate.originalExpression,
        proposedLocator: candidate.proposedExpression,
        similarityScore: similarity,
        structuralEvidence: [
          'Selector drift detected: partial changes may indicate unstable targeting',
          'Original and proposed share structural elements but differ in key parts',
        ],
      });
      patterns.push('dynamic-selector-drift');
    }
    
    if (navigationContext?.originalUrl && navigationContext?.finalUrl) {
      const urlChanged = navigationContext.originalUrl !== navigationContext.finalUrl;
      const pathChanged = this.extractPath(navigationContext.originalUrl) !== 
                         this.extractPath(navigationContext.finalUrl);
      
      if (urlChanged && pathChanged) {
        evidence.push({
          pattern: 'hidden-navigation-divergence',
          severity: 'high',
          description: 'Navigation URL changed between original and proposed',
          originalLocator: candidate.originalExpression,
          proposedLocator: candidate.proposedExpression,
          similarityScore: 1,
          structuralEvidence: [],
          navigationEvidence: [
            `Original URL: ${navigationContext.originalUrl}`,
            `Final URL: ${navigationContext.finalUrl}`,
            'Hidden navigation divergence may cause incorrect element targeting',
          ],
        });
        patterns.push('hidden-navigation-divergence');
      }
    }
    
    if (detectAsyncTimingRisk(candidate.proposedStrategy, candidate.proposedValue)) {
      evidence.push({
        pattern: 'async-timing-deception',
        severity: 'medium',
        description: 'Proposed locator includes async/timing elements that may cause flaky behavior',
        originalLocator: candidate.originalExpression,
        proposedLocator: candidate.proposedExpression,
        similarityScore: 1,
        structuralEvidence: [],
        timingEvidence: [
          'Async timing dependencies detected',
          'May pass replay but fail in production due to timing variations',
        ],
      });
      patterns.push('async-timing-deception');
    }
    
    if (detectWrapperAbstractionMasking(candidate.originalExpression, candidate.proposedExpression)) {
      evidence.push({
        pattern: 'wrapper-abstraction-masking',
        severity: 'low',
        description: 'Proposed locator adds wrapper abstraction layer',
        originalLocator: candidate.originalExpression,
        proposedLocator: candidate.proposedExpression,
        similarityScore: 1,
        structuralEvidence: [
          'Original: direct locator',
          'Proposed: wrapper-based locator',
          'Abstraction may mask underlying instability',
        ],
      });
      patterns.push('wrapper-abstraction-masking');
    }
    
    const overallScore = this.computeDeceptionScore(evidence);
    const recommendation = this.determineRecommendation(patterns, overallScore, similarity);
    
    return {
      id: `deceptive-${candidate.id}-${Date.now()}`,
      candidateId: candidate.id,
      locatorId: candidate.locatorId,
      isDeceptive: patterns.length > 0,
      deceptionPatterns: patterns,
      evidence,
      overallDeceptionScore: overallScore,
      recommendation,
      createdAt: Date.now(),
    };
  }
  
  private extractPath(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.pathname;
    } catch {
      return url;
    }
  }
  
  private computeDeceptionScore(evidence: DeceptiveMutationEvidence[]): number {
    if (evidence.length === 0) return 0;
    
    const severityWeights: Record<string, number> = {
      'critical': 1.0,
      'high': 0.75,
      'medium': 0.5,
      'low': 0.25,
    };
    
    const totalWeight = evidence.reduce((sum, e) => 
      sum + (severityWeights[e.severity] ?? 0), 0
    );
    
    return Math.min(totalWeight / evidence.length, 1.0);
  }
  
  private determineRecommendation(
    patterns: MutationDeceptionPattern[],
    overallScore: number,
    similarity: number
  ): 'approve' | 'reject' | 'review-manually' | 'escalate' {
    const criticalPatterns = patterns.filter(p => 
      ['structurally-similar-wrong-target', 'hidden-navigation-divergence'].includes(p)
    );
    
    if (criticalPatterns.length > 0 || overallScore > 0.75) {
      return 'reject';
    }
    
    if (patterns.length > 0 || overallScore > 0.4) {
      return 'review-manually';
    }
    
    if (similarity > 0.85) {
      return 'approve';
    }
    
    return 'review-manually';
  }
}