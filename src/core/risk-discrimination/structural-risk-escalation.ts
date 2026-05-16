/**
 * Structural Risk Escalation Rules
 *
 * Deterministic escalation recommendations based on structural risk factors:
 * - Chained locator depth
 * - Dynamic selector presence
 * - Duplicate selector density
 * - Oversized page objects
 * - Async-heavy flows
 * - BDD abstraction layers
 *
 * Recommendations only - no autonomous governance.
 */

import type { Locator } from '../../models/locator.js';
import type { ReplaySession, ReplayStep } from '../../models/replay.js';
import type {
  RiskEscalationCategory,
  RiskEscalationRecommendation,
} from './types.js';

export interface StructuralRiskInput {
  locator: Locator;
  relatedLocators: Locator[];
  replaySession?: ReplaySession;
  pageObjectSize?: number;
  isBDDTest?: boolean;
}

const CHAINED_DEPTH_THRESHOLD = 4;
const DYNAMIC_SELECTOR_PATTERNS = [
  /\$\{/,
  /\$\(/,
  /\[.*\$\{/,
  /\.\w+\$\{/,
  /getByRole.*\${/,
];
const DUPLICATE_SELECTOR_DENSITY_THRESHOLD = 0.3;
const OVERSIZED_PAGE_OBJECT_LOCATORS = 50;
const ASYNC_HEAVY_THRESHOLD = 0.4;
const BDD_ABSTRACTION_LAYERS = 2;

export class StructuralRiskEscalation {
  analyze(input: StructuralRiskInput): RiskEscalationRecommendation[] {
    const recommendations: RiskEscalationRecommendation[] = [];
    
    const chainedDepthRec = this.checkChainedLocatorDepth(input.locator);
    if (chainedDepthRec) recommendations.push(chainedDepthRec);
    
    const dynamicRec = this.checkDynamicSelectorPresence(input.locator);
    if (dynamicRec) recommendations.push(dynamicRec);
    
    const duplicateRec = this.checkDuplicateSelectorDensity(
      input.locator,
      input.relatedLocators
    );
    if (duplicateRec) recommendations.push(duplicateRec);
    
    if (input.pageObjectSize !== undefined) {
      const sizeRec = this.checkOversizedPageObject(input.pageObjectSize);
      if (sizeRec) recommendations.push(sizeRec);
    }
    
    if (input.replaySession) {
      const asyncRec = this.checkAsyncHeavyFlow(input.replaySession);
      if (asyncRec) recommendations.push(asyncRec);
      
      const bddRec = this.checkBDDAbstractionLayers(input.replaySession, input.isBDDTest);
      if (bddRec) recommendations.push(bddRec);
    }
    
    return recommendations.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }
  
  private checkChainedLocatorDepth(locator: Locator): RiskEscalationRecommendation | null {
    const chainDepth = this.countChainedDepth(locator.value);
    
    if (chainDepth >= CHAINED_DEPTH_THRESHOLD) {
      const severity = chainDepth > CHAINED_DEPTH_THRESHOLD + 2 ? 'critical' : 'high';
      
      return {
        category: 'chained-locator-depth',
        currentValue: chainDepth,
        threshold: CHAINED_DEPTH_THRESHOLD,
        severity,
        description: `Locator has ${chainDepth} chained selectors (threshold: ${CHAINED_DEPTH_THRESHOLD})`,
        recommendation: `Reduce locator depth. Consider using stable attributes or combining chains.`,
        confidence: 0.9,
      };
    }
    
    if (chainDepth >= CHAINED_DEPTH_THRESHOLD - 1) {
      return {
        category: 'chained-locator-depth',
        currentValue: chainDepth,
        threshold: CHAINED_DEPTH_THRESHOLD,
        severity: 'medium',
        description: `Locator approaching depth threshold (${chainDepth}/${CHAINED_DEPTH_THRESHOLD})`,
        recommendation: 'Monitor for stability degradation. Consider simplifying.',
        confidence: 0.7,
      };
    }
    
    return null;
  }
  
  private countChainedDepth(selector: string): number {
    const chainMarkers = ['>', '+', '~', '/following-sibling::', '/preceding-sibling::'];
    let maxDepth = 1;
    let currentDepth = 1;
    
    for (const marker of chainMarkers) {
      const count = (selector.match(new RegExp(marker, 'g')) ?? []).length;
      currentDepth += count;
      maxDepth = Math.max(maxDepth, currentDepth);
    }
    
    const spaceDepth = (selector.match(/\s+/g) ?? []).length;
    maxDepth = Math.max(maxDepth, spaceDepth + 1);
    
    return maxDepth;
  }
  
  private checkDynamicSelectorPresence(locator: Locator): RiskEscalationRecommendation | null {
    const hasDynamicPattern = DYNAMIC_SELECTOR_PATTERNS.some(pattern => 
      pattern.test(locator.value)
    );
    
    if (hasDynamicPattern) {
      const severity = this.calculateDynamicSeverity(locator.value);
      
      return {
        category: 'dynamic-selector-presence',
        currentValue: 1,
        threshold: 0,
        severity,
        description: `Locator contains dynamic selector patterns`,
        recommendation: 'Replace dynamic placeholders with stable attribute-based selectors',
        confidence: 0.85,
      };
    }
    
    const dynamicIndicators = ['index', 'nth', 'eq', 'nth-child'];
    const hasDynamicIndicator = dynamicIndicators.some(ind => 
      locator.value.toLowerCase().includes(ind)
    );
    
    if (hasDynamicIndicator) {
      return {
        category: 'dynamic-selector-presence',
        currentValue: 1,
        threshold: 0,
        severity: 'medium',
        description: `Locator uses index-based selection`,
        recommendation: 'Use more stable selectors when possible',
        confidence: 0.7,
      };
    }
    
    return null;
  }
  
  private calculateDynamicSeverity(selector: string): 'high' | 'medium' | 'low' {
    const criticalPatterns = [/\$\{.*\$\{/, /\$\(.*\$\(/];
    const highPatterns = [/\$\{\w+\}/];
    
    if (criticalPatterns.some(p => p.test(selector))) {
      return 'high';
    }
    
    if (highPatterns.some(p => p.test(selector))) {
      return 'medium';
    }
    
    return 'low';
  }
  
  private checkDuplicateSelectorDensity(
    locator: Locator,
    relatedLocators: Locator[]
  ): RiskEscalationRecommendation | null {
    if (relatedLocators.length === 0) return null;
    
    const locatorParts = this.extractSelectorParts(locator.value);
    let duplicateCount = 0;
    
    for (const related of relatedLocators) {
      if (related.id === locator.id) continue;
      
      const relatedParts = this.extractSelectorParts(related.value);
      const overlap = locatorParts.filter(p => 
        relatedParts.includes(p) && p.length > 2
      );
      
      if (overlap.length > 0) {
        duplicateCount++;
      }
    }
    
    const density = duplicateCount / relatedLocators.length;
    
    if (density >= DUPLICATE_SELECTOR_DENSITY_THRESHOLD) {
      return {
        category: 'duplicate-selector-density',
        currentValue: density,
        threshold: DUPLICATE_SELECTOR_DENSITY_THRESHOLD,
        severity: density > 0.6 ? 'high' : 'medium',
        description: `${(density * 100).toFixed(0)}% of related locators share structural elements`,
        recommendation: 'Differentiate selectors with unique attributes or IDs',
        confidence: 0.8,
      };
    }
    
    return null;
  }
  
  private extractSelectorParts(selector: string): string[] {
    return selector
      .replace(/[#.\[\]:()]/g, ' ')
      .split(/\s+/)
      .filter(p => p.length > 0)
      .map(p => p.toLowerCase());
  }
  
  private checkOversizedPageObject(locatorCount: number): RiskEscalationRecommendation | null {
    if (locatorCount >= OVERSIZED_PAGE_OBJECT_LOCATORS) {
      return {
        category: 'oversized-page-object',
        currentValue: locatorCount,
        threshold: OVERSIZED_PAGE_OBJECT_LOCATORS,
        severity: locatorCount > OVERSIZED_PAGE_OBJECT_LOCATORS * 1.5 ? 'high' : 'medium',
        description: `Page object contains ${locatorCount} locators (threshold: ${OVERSIZED_PAGE_OBJECT_LOCATORS})`,
        recommendation: 'Consider splitting into smaller page object components',
        confidence: 0.75,
      };
    }
    
    return null;
  }
  
  private checkAsyncHeavyFlow(session: ReplaySession): RiskEscalationRecommendation | null {
    const { steps } = session;
    
    if (steps.length === 0) return null;
    
    const asyncActions = steps.filter(s => 
      s.actionType === 'wait' ||
      this.hasAsyncPayload(s)
    ).length;
    
    const asyncRatio = asyncActions / steps.length;
    
    if (asyncRatio >= ASYNC_HEAVY_THRESHOLD) {
      return {
        category: 'async-heavy-flow',
        currentValue: asyncRatio,
        threshold: ASYNC_HEAVY_THRESHOLD,
        severity: asyncRatio > 0.6 ? 'high' : 'medium',
        description: `${(asyncRatio * 100).toFixed(0)}% of steps involve async operations`,
        recommendation: 'Add explicit waits and reduce implicit timing dependencies',
        confidence: 0.8,
      };
    }
    
    return null;
  }
  
  private hasAsyncPayload(step: ReplayStep): boolean {
    if (!step.inputPayload) return false;
    
    const asyncKeys = ['timeout', 'delay', 'waitFor', 'debounce'];
    
    if (typeof step.inputPayload === 'string') {
      return asyncKeys.some(k => step.inputPayload === k);
    }
    
    if (typeof step.inputPayload === 'object') {
      return Object.keys(step.inputPayload).some(k => 
        asyncKeys.some(ak => k.toLowerCase().includes(ak))
      );
    }
    
    return false;
  }
  
  private checkBDDAbstractionLayers(
    session: ReplaySession,
    isBDDTest?: boolean
  ): RiskEscalationRecommendation | null {
    if (!isBDDTest && session.steps.length < 10) {
      return null;
    }
    
    const gherkinKeywords = ['given', 'when', 'then', 'and', 'but'];
    const stepKeywords = session.steps.filter(s => 
      s.actionType === 'assertion' ||
      (typeof s.inputPayload === 'string' && 
       gherkinKeywords.some(k => s.inputPayload!.toLowerCase().includes(k)))
    ).length;
    
    const abstractionLayers = stepKeywords / Math.max(session.steps.length, 1);
    
    if (abstractionLayers >= BDD_ABSTRACTION_LAYERS / 10) {
      return {
        category: 'bdd-abstraction-layers',
        currentValue: abstractionLayers * 10,
        threshold: BDD_ABSTRACTION_LAYERS,
        severity: abstractionLayers * 10 > BDD_ABSTRACTION_LAYERS + 1 ? 'medium' : 'low',
        description: `${(abstractionLayers * 10).toFixed(1)} BDD abstraction layers detected`,
        recommendation: 'Test steps may be too abstracted. Verify element targeting at each layer.',
        confidence: 0.65,
      };
    }
    
    return null;
  }
}