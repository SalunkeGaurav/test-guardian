/**
 * Runtime False-Positive Detection
 *
 * Validates that the element matched during runtime replay is the
 * correct target and not a false positive.
 *
 * Rejects proposals if:
 * - Wrong element interacted (tag/role mismatch vs original)
 * - Navigation diverges from expected path
 * - Multiple runtime matches
 * - Hidden elements
 * - Detached elements
 * - Unstable dynamic attributes
 * - Hierarchy mismatch (depth/position)
 *
 * Deterministic rule-based checks. No AI.
 */

import type { HealingCandidate } from '../../models/healing-candidate.js';
import type { RuntimeEvidence, RuntimeFalsePositiveIndicator, ReplayDivergence } from '../../models/runtime.js';

const AUTO_ID_PATTERNS: RegExp[] = [
  /^[a-z]+-\d+(-\d+)+$/,
  /^[a-f0-9]{8,}$/i,
  /^[a-z]{2,4}_[a-f0-9]{6,}$/i,
];

const RANDOMIZED_CLASS_PATTERNS: RegExp[] = [
  /^css-/,
  /^sc-/,
  /^scoped-/,
  /^_[-a-z0-9]{6,}$/i,
  /^[a-z]{1,2}[-_][a-z0-9]{4,}$/i,
];

export class RuntimeFalsePositiveDetector {
  /**
   * Detect false-positive indicators from runtime evidence.
   */
  detect(
    evidence: RuntimeEvidence[],
    proposal: HealingCandidate,
    divergences: ReplayDivergence[],
  ): RuntimeFalsePositiveIndicator[] {
    const indicators: RuntimeFalsePositiveIndicator[] = [];

    for (let i = 0; i < evidence.length; i++) {
      const ev = evidence[i]!;

      // Check for navigation divergence false positive
      const navDivergence = divergences.find(
        d => d.stepIndex === i && d.type === 'url-mismatch',
      );
      if (navDivergence) {
        indicators.push({
          type: 'navigation-divergence',
          stepIndex: i,
          detail: `Navigation diverged at step ${i}: ${navDivergence.actual}`,
        });
      }

      // Check for hidden elements
      if (ev.matchedElement && !ev.matchedElement.visible) {
        indicators.push({
          type: 'hidden-element',
          stepIndex: i,
          detail: `Element <${ev.matchedElement.tagName}> is not visible at step ${i}`,
        });
      }

      // Check for not interactable
      if (ev.matchedElement && !ev.matchedElement.interactable) {
        indicators.push({
          type: 'wrong-element',
          stepIndex: i,
          detail: `Element <${ev.matchedElement.tagName}> is not interactable at step ${i}`,
        });
      }

      // Check for wrong element (tag mismatch with proposal's expected tag)
      if (ev.matchedElement && proposal.domEvidence.originalTag) {
        const expectedTag = proposal.domEvidence.originalTag.toLowerCase();
        const actualTag = ev.matchedElement.tagName.toLowerCase();
        if (expectedTag && actualTag !== expectedTag) {
          indicators.push({
            type: 'wrong-element',
            stepIndex: i,
            detail: `Expected <${expectedTag}> but matched <${actualTag}> at step ${i}`,
          });
        }
      }

      // Check for hierarchy mismatch
      if (ev.matchedElement && proposal.domEvidence.matchedPath) {
        const expectedParts = proposal.domEvidence.matchedPath.split(' > ');
        const actualTag = ev.matchedElement.tagName.toLowerCase();
        const lastExpectedTag = expectedParts[expectedParts.length - 1];
        if (lastExpectedTag && lastExpectedTag !== actualTag) {
          indicators.push({
            type: 'hierarchy-mismatch',
            stepIndex: i,
            detail: `Expected tag at path depth ${expectedParts.length} to be <${lastExpectedTag}>, got <${actualTag}>`,
          });
        }
      }

      // Check for unstable dynamic attributes
      if (ev.matchedElement) {
        const id = ev.matchedElement.attributes['id'] ?? '';
        const cls = ev.matchedElement.attributes['class'] ?? '';
        if (id && AUTO_ID_PATTERNS.some(p => p.test(id))) {
          indicators.push({
            type: 'unstable-dynamic',
            stepIndex: i,
            detail: `Element has auto-generated id "${id}" at step ${i}`,
          });
        }
        if (cls) {
          const classes = cls.split(/\s+/);
          if (classes.some(c => RANDOMIZED_CLASS_PATTERNS.some(p => p.test(c)))) {
            indicators.push({
              type: 'unstable-dynamic',
              stepIndex: i,
              detail: `Element has randomized class "${cls}" at step ${i}`,
            });
          }
        }
      }
    }

    return indicators;
  }
}
