import ts from 'typescript';
import type { NavigationDefinition } from '../../core/analyzer/types.js';
import type { VisitorContext } from './ast-utils.js';

export function extractNavigation(node: ts.CallExpression, ctx: VisitorContext, line: number): void {
  const firstArg = node.arguments[0];
  if (!firstArg) return;

  let url: string | null;
  let urlPattern: NavigationDefinition['urlPattern'];

  if (ts.isStringLiteral(firstArg)) {
    url = firstArg.text;
    urlPattern = firstArg.text.startsWith('http://') || firstArg.text.startsWith('https://')
      ? 'absolute'
      : firstArg.text.startsWith('/')
        ? 'relative'
        : 'unknown';
  } else if (ts.isIdentifier(firstArg)) {
    url = `<var:${firstArg.text}>`;
    urlPattern = 'variable';
  } else {
    url = '<expression>';
    urlPattern = 'unknown';
  }

  const contextName = ctx.describeStack.length > 0
    ? ctx.describeStack[ctx.describeStack.length - 1]!
    : '<top-level>';

  ctx.navigations.push({
    url,
    urlPattern,
    filePath: ctx.filePath,
    line,
    contextName,
  });
}
