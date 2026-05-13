import ts from 'typescript';
import { debug } from '../../logger/index.js';
import type { VisitorContext } from './ast-utils.js';
import { extractPageFromCallback } from './ast-utils.js';

export function extractTestTags(secondArg: ts.Expression | undefined): string[] {
  if (!secondArg || !ts.isObjectLiteralExpression(secondArg)) return [];

  for (const prop of secondArg.properties) {
    if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name) && prop.name.text === 'tags') {
      if (ts.isArrayLiteralExpression(prop.initializer)) {
        return prop.initializer.elements
          .filter((e): e is ts.StringLiteral => ts.isStringLiteral(e))
          .map((e) => e.text);
      }
    }
  }
  return [];
}

export function visitTestCall(node: ts.CallExpression, ctx: VisitorContext): void {
  const nameArg = node.arguments[0];
  if (!nameArg || !ts.isStringLiteral(nameArg)) return;

  const testName = nameArg.text;
  const line = ctx.sourceFile.getLineAndCharacterOfPosition(nameArg.getStart()).line + 1;
  const fullName = ctx.describeStack.length > 0
    ? `${ctx.describeStack.join(' > ')} > ${testName}`
    : testName;

  const tags = extractTestTags(node.arguments[1]);

  ctx.tests.push({ name: testName, line, fullName, tags });

  const callback = node.arguments[node.arguments.length - 1];
  if (callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
    extractPageFromCallback(callback, ctx);
  }
}

export function visitDescribeCall(node: ts.CallExpression, ctx: VisitorContext): void {
  const nameArg = node.arguments[0];
  if (!nameArg || !ts.isStringLiteral(nameArg)) return;
  debug('parser', `  describe: ${nameArg.text}`);
}
