/**
 * DOM Normalization Pipeline
 *
 * Normalizes raw ElementNode trees into stable, comparable form.
 *
 * Normalization rules:
 * - Whitespace: collapse, trim text content and attribute values
 * - Dynamic attributes: remove known unstable patterns (data-v-*, ng-*, _nghost, etc.)
 * - Unstable IDs: detect and strip auto-generated IDs (contains hash patterns)
 * - Timestamps: detect and normalize timestamp-like attribute values
 * - Randomized classes: strip classes matching known randomization patterns (css-xxx, sc-xxx)
 *
 * Preserves: structure, hierarchy, semantic attributes, accessibility metadata,
 * stable class names, data-testid, aria-*, role.
 *
 * Pure functions — no I/O, no side effects.
 */

import type { ElementNode } from '../../models/snapshot.js';
import type { NormalizedElement } from '../../models/dom-intelligence.js';

// Patterns for dynamic/unstable attribute names
const DYNAMIC_ATTR_PATTERNS: RegExp[] = [
  /^data-v-/i,
  /^ng-/i,
  /^_nghost/i,
  /^_ngcontent/i,
  /^v-/i,
  /^: /,
  /^\[/, // react-* synthetic events stored as attributes
  /^__/,
];

// Patterns for randomized class names (css-modules, styled-components, etc.)
const RANDOMIZED_CLASS_PATTERNS: RegExp[] = [
  /^css-/,
  /^sc-/,
  /^scoped-/,
  /^_[-a-z0-9]{6,}$/i,
  /^[a-z]{1,2}[-_][a-z0-9]{4,}$/i,
];

// Patterns for auto-generated IDs
const AUTO_ID_PATTERNS: RegExp[] = [
  /^[a-z]+-\d+(-\d+)+$/,
  /^[a-f0-9]{8,}$/i,
  /^[a-z]{2,4}_[a-f0-9]{6,}$/i,
];

// Patterns for timestamp-like values
const TIMESTAMP_PATTERNS: RegExp[] = [
  /^\d{10,}$/,
  /^\d{4}-\d{2}-\d{2}T/,
  /^\d{4}-\d{2}-\d{2}$/,
];

// Stable semantic attributes preserved during normalization
const STABLE_ATTRIBUTES = new Set([
  'data-testid', 'data-test-id', 'data-test', 'test-id',
  'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-role',
  'role', 'type', 'name', 'for', 'href', 'src', 'alt', 'title',
  'value', 'placeholder', 'disabled', 'readonly', 'required',
  'checked', 'selected', 'multiple', 'accept', 'target',
  'rel', 'download', 'tabindex',
]);

const ACCESSIBILITY_PREFIXES = ['aria-'];

function isStableAttribute(name: string): boolean {
  if (STABLE_ATTRIBUTES.has(name)) return true;
  if (ACCESSIBILITY_PREFIXES.some(p => name.startsWith(p))) return true;
  return false;
}

function isDynamicAttribute(name: string): boolean {
  return DYNAMIC_ATTR_PATTERNS.some(p => p.test(name));
}

function isUnstableId(value: string): boolean {
  return AUTO_ID_PATTERNS.some(p => p.test(value));
}

function isTimestampValue(value: string): boolean {
  return TIMESTAMP_PATTERNS.some(p => p.test(value));
}

export function isRandomizedClass(className: string): boolean {
  return RANDOMIZED_CLASS_PATTERNS.some(p => p.test(className));
}

function isRandomizedClassPattern(className: string): boolean {
  return isRandomizedClass(className);
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeAttributeValue(name: string, value: string): string {
  if (name === 'class') {
    const classes = value.split(/\s+/).filter(c => !isRandomizedClass(c));
    return classes.sort().join(' ');
  }
  if (name === 'id' && isUnstableId(value)) {
    return '';
  }
  if (isTimestampValue(value)) {
    return '__timestamp__';
  }
  return collapseWhitespace(value);
}

function isStableValue(name: string, value: string): boolean {
  if (!value) return false;
  if (name === 'id' && isUnstableId(value)) return false;
  if (isTimestampValue(value)) return false;
  if (name === 'class') {
    const stable = value.split(/\s+/).filter(c => !isRandomizedClass(c));
    return stable.length > 0;
  }
  return true;
}

export function normalizeElementNode(
  node: ElementNode,
  depth: number = 0,
  path: string = '',
): NormalizedElement {
  const tagName = node.tagName.toLowerCase();
  const currentPath = path ? `${path} > ${tagName}` : tagName;

  const normalizedAttributes: Record<string, string> = {};
  const stableAttributes: Record<string, string> = {};
  const dynamicAttributes: Record<string, string> = {};
  const attrs = node.attributes ?? {};

  for (const [key, value] of Object.entries(attrs)) {
    const normalizedKey = key.toLowerCase();
    if (isDynamicAttribute(normalizedKey)) {
      dynamicAttributes[normalizedKey] = value;
      continue;
    }
    const normalizedValue = normalizeAttributeValue(normalizedKey, value);
    if (normalizedValue) {
      normalizedAttributes[normalizedKey] = normalizedValue;
    }
    if (isStableAttribute(normalizedKey) || value.length > 0) {
      stableAttributes[normalizedKey] = value;
    }
  }

  const normalizedText = node.textContent ? collapseWhitespace(node.textContent) : '';

  return {
    original: node,
    tagName,
    normalizedAttributes,
    stableAttributes,
    dynamicAttributes,
    normalizedText,
    depth,
    path: currentPath,
    childCount: node.children.length,
  };
}

export function normalizeElementTree(
  nodes: ElementNode[],
  depth: number = 0,
  parentPath: string = '',
): NormalizedElement[] {
  const result: NormalizedElement[] = [];
  for (const node of nodes) {
    const normalized = normalizeElementNode(node, depth, parentPath);
    result.push(normalized);
    if (node.children.length > 0) {
      const children = normalizeElementTree(node.children, depth + 1, normalized.path);
      result.push(...children);
    }
  }
  return result;
}

export function flattenToStableMap(
  nodes: ElementNode[],
): Map<string, NormalizedElement> {
  const normalized = normalizeElementTree(nodes);
  const map = new Map<string, NormalizedElement>();
  for (const el of normalized) {
    map.set(el.path, el);
  }
  return map;
}
