/**
 * False-Positive Detection for Healing Proposal Validation.
 *
 * Deterministic checks that reject invalid or ambiguous locator matches.
 *
 * No AI. No heuristics. Pure rule-based detection.
 */

import type { ElementNode } from '../../models/snapshot.js';
import type { FalsePositiveIndicator } from '../../models/validation.js';

// Patterns for auto-generated IDs (mirrors normalizer.ts)
const AUTO_ID_PATTERNS: RegExp[] = [
  /^[a-z]+-\d+(-\d+)+$/,
  /^[a-f0-9]{8,}$/i,
  /^[a-z]{2,4}_[a-f0-9]{6,}$/i,
];

// Patterns for randomized class names (mirrors normalizer.ts)
const RANDOMIZED_CLASS_PATTERNS: RegExp[] = [
  /^css-/,
  /^sc-/,
  /^scoped-/,
  /^_[-a-z0-9]{6,}$/i,
  /^[a-z]{1,2}[-_][a-z0-9]{4,}$/i,
];

// Interactive tag names that can receive click events
const CLICKABLE_TAGS = new Set([
  'button', 'a', 'input', 'select', 'textarea', 'label', 'option',
]);

// Tags that support text input (fill)
const FILLABLE_TAGS = new Set([
  'input', 'textarea',
]);

// Tags that are keyboard-focusable
const FOCUSABLE_TAGS = new Set([
  'input', 'button', 'select', 'textarea', 'a',
]);

/**
 * Detect false-positive indicators for a set of matched elements.
 *
 * @param matches - Elements that matched the proposed locator
 * @param actionType - The intended action ('click', 'fill', 'press', 'wait')
 * @param allDom - The full DOM tree (for hierarchy / structure checks)
 * @param expectedTag - Optional expected tag name from original element
 * @returns Array of false-positive indicators
 */
export function detectFalsePositives(
  matches: ElementNode[],
  actionType: string = 'click',
  allDom?: ElementNode[],
  expectedTag?: string,
): FalsePositiveIndicator[] {
  const indicators: FalsePositiveIndicator[] = [];

  if (matches.length === 0) {
    indicators.push({ type: 'no-match', detail: 'Locator matched zero elements in the DOM' });
    return indicators;
  }

  if (matches.length > 1) {
    indicators.push({
      type: 'multiple-matches',
      detail: `Locator matched ${matches.length} elements; expected exactly 1`,
    });
  }

  for (const node of matches) {
    if (isHidden(node)) {
      indicators.push({
        type: 'hidden-element',
        detail: `Element <${node.tagName}> is hidden (visible: false or display:none)`,
      });
    }

    if (isDetached(node)) {
      indicators.push({
        type: 'detached-element',
        detail: `Element <${node.tagName}> appears detached from the document`,
      });
    }

    if (hasWrongRole(node, actionType)) {
      indicators.push({
        type: 'wrong-role',
        detail: `Element <${node.tagName}> cannot receive ${actionType} interaction`,
      });
    }

    if (expectedTag && node.tagName.toLowerCase() !== expectedTag.toLowerCase()) {
      indicators.push({
        type: 'hierarchy-mismatch',
        detail: `Expected tag ${expectedTag} but matched <${node.tagName}>`,
      });
    }

    if (hasUnstableDynamicAttrs(node)) {
      indicators.push({
        type: 'unstable-dynamic',
        detail: `Element <${node.tagName}> has auto-generated or randomized attributes`,
      });
    }

    if (!isInteractable(node, actionType)) {
      indicators.push({
        type: 'not-interactable',
        detail: `Element <${node.tagName}> is not interactable with ${actionType}`,
      });
    }
  }

  return indicators;
}

function isHidden(node: ElementNode): boolean {
  if (node.visible === false) return true;

  const attrs = node.attributes ?? {};
  const style = (attrs['style'] ?? '').toLowerCase();
  if (style.includes('display: none') || style.includes('visibility: hidden')) {
    return true;
  }
  if (attrs['hidden'] !== undefined) return true;
  if (attrs['aria-hidden'] === 'true') return true;

  return false;
}

function isDetached(_node: ElementNode): boolean {
  // In a tree-based representation, all nodes reachable from the root
  // are non-detached. This check is a placeholder for runtime scenarios
  // where the DOM may contain orphaned references.
  return false;
}

function hasWrongRole(node: ElementNode, actionType: string): boolean {
  const tag = node.tagName.toLowerCase();
  const attrs = node.attributes ?? {};
  const role = (attrs['role'] ?? '').toLowerCase();

  switch (actionType) {
    case 'click':
      if (role === 'button' || role === 'link' || role === 'checkbox' || role === 'radio' ||
          role === 'tab' || role === 'menuitem') {
        return false;
      }
      if (CLICKABLE_TAGS.has(tag)) return false;
      if (tag.startsWith('input')) {
        const inputType = (attrs['type'] ?? 'text').toLowerCase();
        if (['submit', 'button', 'checkbox', 'radio', 'image', 'reset'].includes(inputType)) {
          return false;
        }
        return !FILLABLE_TAGS.has(tag);
      }
      return !CLICKABLE_TAGS.has(tag) && !role;

    case 'fill':
      if (role === 'textbox' || role === 'searchbox' || role === 'combobox') return false;
      if (FILLABLE_TAGS.has(tag)) {
        if (tag === 'input') {
          const inputType = (attrs['type'] ?? 'text').toLowerCase();
          return !['text', 'email', 'password', 'search', 'tel', 'url', 'number'].includes(inputType);
        }
        return false;
      }
      if ((node as unknown as Record<string, unknown>)['contenteditable'] === 'true') return false;
      return true;

    case 'press':
    case 'wait':
      return false;

    default:
      return false;
  }
}

function hasUnstableDynamicAttrs(node: ElementNode): boolean {
  const attrs = node.attributes ?? {};
  const id = attrs['id'] ?? '';
  const cls = attrs['class'] ?? '';

  if (id && AUTO_ID_PATTERNS.some(p => p.test(id))) return true;
  if (cls) {
    const classes = cls.split(/\s+/);
    if (classes.some(c => RANDOMIZED_CLASS_PATTERNS.some(p => p.test(c)))) return true;
  }
  return false;
}

function isInteractable(node: ElementNode, actionType: string): boolean {
  if (isHidden(node)) return false;

  const tag = node.tagName.toLowerCase();
  const attrs = node.attributes ?? {};

  if (attrs['disabled'] !== undefined) return false;
  if (attrs['aria-disabled'] === 'true') return false;

  switch (actionType) {
    case 'click':
      return true;
    case 'fill':
      return FILLABLE_TAGS.has(tag) || (attrs['contenteditable'] === 'true');
    case 'press':
      return FOCUSABLE_TAGS.has(tag) || attrs['tabindex'] !== undefined;
    case 'wait':
      return true;
    default:
      return true;
  }
}
