/**
 * Deterministic Locator Resolver
 *
 * Resolves healing proposal expressions against ElementNode DOM trees.
 * Supports all locator strategies produced by the healing engine.
 *
 * Pure functions. No I/O. No browser. No AI.
 */

import type { ElementNode } from '../../models/snapshot.js';

export interface ResolvedElement {
  node: ElementNode;
  path: string;
}

function flattenTree(nodes: ElementNode[], parentPath = ''): ResolvedElement[] {
  const result: ResolvedElement[] = [];
  for (const node of nodes) {
    const tag = node.tagName.toLowerCase();
    const path = parentPath ? `${parentPath} > ${tag}` : tag;
    result.push({ node, path });
    result.push(...flattenTree(node.children, path));
  }
  return result;
}

function findById(nodes: ElementNode[], id: string): ElementNode[] {
  return flattenTree(nodes).filter(
    r => (r.node.attributes?.id ?? '').toLowerCase() === id.toLowerCase(),
  ).map(r => r.node);
}

function findByAttr(nodes: ElementNode[], attrName: string, value: string): ElementNode[] {
  const key = attrName.toLowerCase();
  return flattenTree(nodes).filter(
    r => (r.node.attributes ?? {})[key] === value,
  ).map(r => r.node);
}

function findByTag(nodes: ElementNode[], tagName: string): ElementNode[] {
  return flattenTree(nodes).filter(
    r => r.node.tagName.toLowerCase() === tagName.toLowerCase(),
  ).map(r => r.node);
}

function findByText(nodes: ElementNode[], text: string): ElementNode[] {
  return flattenTree(nodes).filter(
    r => (r.node.textContent ?? '').trim() === text.trim(),
  ).map(r => r.node);
}

function findByClass(nodes: ElementNode[], className: string): ElementNode[] {
  return flattenTree(nodes).filter(r => {
    const cls = (r.node.attributes ?? {})['class'] ?? '';
    return cls.split(/\s+/).includes(className);
  }).map(r => r.node);
}

/**
 * Resolve a healing candidate's locator expression against a DOM tree.
 *
 * @param dom - The DOM tree (array of root ElementNodes)
 * @param strategy - The locator strategy ('id', 'testid', 'css', 'text', etc.)
 * @param value - The bare value to look up
 * @returns Array of matching ElementNodes (may be empty or multiple)
 */
export function resolveLocatorExpression(
  dom: ElementNode[],
  strategy: string,
  value: string,
): ElementNode[] {
  if (!dom || dom.length === 0) return [];

  switch (strategy) {
    case 'id':
      return findById(dom, value);
    case 'testid':
      return findByAttr(dom, 'data-testid', value);
    case 'aria-label':
      return findByAttr(dom, 'aria-label', value);
    case 'role':
      return findByAttr(dom, 'role', value);
    case 'name':
      return findByAttr(dom, 'name', value);
    case 'placeholder':
      return findByAttr(dom, 'placeholder', value);
    case 'text':
      return findByText(dom, value);
    case 'class-name':
      return findByClass(dom, value);
    case 'tag':
      return findByTag(dom, value);
    case 'css':
      return resolveCssExpression(dom, value);
    default:
      return resolveCssExpression(dom, value);
  }
}

/**
 * Resolve a CSS expression against a DOM tree.
 *
 * Supports: #id, .class, tag, [attr="val"], tag#id, tag.class, tag[attr="val"]
 */
function resolveCssExpression(dom: ElementNode[], expression: string): ElementNode[] {
  const expr = expression.trim();

  // #id selector
  if (expr.startsWith('#')) {
    const id = expr.slice(1);
    return findById(dom, id);
  }

  // .class selector
  if (expr.startsWith('.')) {
    const className = expr.slice(1);
    return findByClass(dom, className);
  }

  // [attr="val"] or [attr='val']
  const attrMatch = expr.match(/^(\w+)?\s*\[(\w[\w-]*)\s*=\s*"([^"]*)"\]\s*$/);
  if (attrMatch && attrMatch[2] && attrMatch[3]) {
    const tagFilter = attrMatch[1];
    const attrName = attrMatch[2];
    const attrVal = attrMatch[3];
    let all = findByAttr(dom, attrName, attrVal);
    if (tagFilter) {
      all = all.filter(n => n.tagName.toLowerCase() === tagFilter.toLowerCase());
    }
    return all;
  }

  // Single attribute selector without tag: [attr="val']
  const bareAttrMatch = expr.match(/^\[(\w[\w-]*)\s*=\s*"([^"]*)"\]\s*$/);
  if (bareAttrMatch && bareAttrMatch[1] && bareAttrMatch[2]) {
    return findByAttr(dom, bareAttrMatch[1], bareAttrMatch[2]);
  }

  // tag selector (possibly with #id or .class)
  const tagPattern = /^(\w[\w-]*)(?:#(\w[\w-]+))?(?:\.([\w-]+))?(?:\[(\w[\w-]*)=\s*"([^"]*)"\])?$/i;
  const tagMatch = expr.match(tagPattern);
  if (tagMatch) {
    const tagFilter = tagMatch[1];
    const idFilter = tagMatch[2];
    const classFilter = tagMatch[3];
    const attrN = tagMatch[4];
    const attrV = tagMatch[5];

    let results = tagFilter ? findByTag(dom, tagFilter) : [];
    if (idFilter) results = results.filter(n => (n.attributes?.id ?? '') === idFilter);
    if (classFilter) {
      results = results.filter(n => {
        const cls = (n.attributes ?? {})['class'] ?? '';
        return cls.split(/\s+/).includes(classFilter);
      });
    }
    if (attrN && attrV !== undefined) {
      results = results.filter(n => (n.attributes ?? {})[attrN] === attrV);
    }
    return results;
  }

  // Fallback: treat as id, then tag
  if (expression.startsWith('#')) return findById(dom, expression.slice(1));
  return findByTag(dom, expression);
}

/**
 * Get the path string for a node within a DOM tree.
 */
export function getNodePath(node: ElementNode, dom: ElementNode[]): string | undefined {
  const flat = flattenTree(dom);
  const found = flat.find(r => r.node === node);
  return found?.path;
}
