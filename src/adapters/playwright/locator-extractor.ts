import ts from 'typescript';
import { createHash } from 'node:crypto';
import type { LocatorStrategy, Locator } from '../../models/locator.js';
import type { VisitorContext } from './ast-utils.js';
import { findAssignedPropertyName, extractSurroundingCode } from './ast-utils.js';

export function hashLocator(strategy: string, value: string): string {
  const hash = createHash('sha1').update(`${strategy}:${value}`).digest('hex').slice(0, 12);
  return `loc_${hash}`;
}

export function buildLocatorExpression(strategy: LocatorStrategy, value: string): string {
  switch (strategy) {
    case 'role':
      return `page.getByRole('${value}')`;
    case 'text':
      return `page.getByText('${value}')`;
    case 'placeholder':
      return `page.getByPlaceholder('${value}')`;
    case 'label':
      return `page.getByLabel('${value}')`;
    case 'testid':
      return `page.getByTestId('${value}')`;
    case 'alt-text':
      return `page.getByAltText('${value}')`;
    case 'title':
      return `page.getByTitle('${value}')`;
    case 'xpath':
      return `page.locator('${value}')`;
    default:
      return `page.locator('${value}')`;
  }
}

export function extractLocator(
  node: ts.CallExpression,
  inferredStrategy: LocatorStrategy,
  ctx: VisitorContext,
  line: number,
): void {
  const firstArg = node.arguments[0];
  if (!firstArg) return;

  let value: string;
  let strategy: LocatorStrategy = inferredStrategy;

  if (ts.isStringLiteral(firstArg)) {
    value = firstArg.text;
  } else if (ts.isTemplateExpression(firstArg) && firstArg.templateSpans.length === 1) {
    const head = firstArg.head.text;
    if (head) {
      value = `template:${head}...`;
    } else {
      value = '<dynamic>';
    }
  } else if (ts.isIdentifier(firstArg)) {
    value = `<var:${firstArg.text}>`;
  } else {
    value = '<expression>';
  }

  if (inferredStrategy === 'css') {
    if (value.startsWith('//') || value.startsWith('..')) {
      strategy = 'xpath';
    } else if (value.startsWith('text=') || value.startsWith('has-text=')) {
      strategy = 'text';
    } else if (value.startsWith('data-testid=')) {
      strategy = 'testid';
    }
  }

  const expression = buildLocatorExpression(strategy, value);

  let propertyName: string | null = null;
  if (ctx.currentPageObject) {
    propertyName = findAssignedPropertyName(node, ctx);
  }

  const locator: Locator = {
    id: hashLocator(strategy, value),
    strategy,
    value,
    expression,
    sourceFile: ctx.filePath,
    sourceLine: line,
    context: extractSurroundingCode(ctx.sourceFile, node.getStart()),
    propertyName,
    verified: false,
  };

  ctx.locators.push(locator);

  if (ctx.currentPageObject) {
    ctx.currentPageObject.locators.push(locator);
  }
}
