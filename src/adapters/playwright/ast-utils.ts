import ts from 'typescript';
import type { Locator } from '../../models/locator.js';
import type { PageObjectDefinition, NavigationDefinition } from '../../core/analyzer/types.js';

export interface ExtractedTest {
  name: string;
  line: number;
  fullName: string;
  tags: string[];
}

export interface VisitorContext {
  filePath: string;
  sourceFile: ts.SourceFile;
  tests: ExtractedTest[];
  locators: Locator[];
  pageObjects: PageObjectDefinition[];
  navigations: NavigationDefinition[];
  describeStack: string[];
  currentPageObject: PageObjectDefinition | null;
  pageVariableNames: Set<string>;
}

export interface PageMethodInfo {
  method: string;
  objectName: string;
}

export interface ThisMethodInfo {
  method: string;
  property: string | null;
}

export const PAGE_METHODS = new Set([
  'locator', 'getByRole', 'getByText', 'getByPlaceholder',
  'getByLabel', 'getByTestId', 'getByAltText', 'getByTitle',
  'goto', 'frameLocator',
]);

export function extractSurroundingCode(sourceFile: ts.SourceFile, pos: number): string {
  const lines: string[] = [];
  const startLine = Math.max(0, sourceFile.getLineAndCharacterOfPosition(pos).line - 2);
  const endLine = Math.min(
    sourceFile.getLineAndCharacterOfPosition(sourceFile.getEnd()).line,
    sourceFile.getLineAndCharacterOfPosition(pos).line + 2,
  );

  for (let i = startLine; i <= endLine; i++) {
    const lineStart = sourceFile.getPositionOfLineAndCharacter(i, 0);
    const lineEnd = i < sourceFile.getLineAndCharacterOfPosition(sourceFile.getEnd()).line
      ? sourceFile.getPositionOfLineAndCharacter(i + 1, 0) - 1
      : sourceFile.getEnd();
    lines.push(sourceFile.text.slice(lineStart, lineEnd));
  }

  return lines.join('\n');
}

export function findAssignedPropertyName(node: ts.CallExpression, ctx: VisitorContext): string | null {
  let current: ts.Node = node.parent;

  while (current) {
    if (ts.isPropertyDeclaration(current)) {
      const name = current.name;
      return ts.isIdentifier(name) ? name.text : null;
    }
    if (ts.isPropertyAssignment(current)) {
      const name = current.name;
      if (ts.isIdentifier(name)) return name.text;
      if (ts.isStringLiteral(name)) return name.text;
      return null;
    }
    if (ts.isSourceFile(current)) break;
    current = current.parent;
  }
  return null;
}

export function detectPageImports(sourceFile: ts.SourceFile, ctx: VisitorContext): void {
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
      const moduleName = ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : '';
      if (moduleName === '@playwright/test') {
        if (node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
          for (const spec of node.importClause.namedBindings.elements) {
            const importedName = spec.propertyName?.text ?? spec.name.text;
            if (importedName === 'Page' || importedName === 'page') {
              ctx.pageVariableNames.add(spec.name.text);
            }
          }
        }
      }
    }
  });
}

export function extractPageFromCallback(
  fn: ts.ArrowFunction | ts.FunctionExpression,
  ctx: VisitorContext,
): void {
  if (!fn.parameters || fn.parameters.length === 0) return;
  const firstParam = fn.parameters[0];

  if (firstParam && ts.isObjectBindingPattern(firstParam.name)) {
    for (const elem of firstParam.name.elements) {
      const propertyName = elem.propertyName && ts.isIdentifier(elem.propertyName) ? elem.propertyName.text : null;
      const elementName = ts.isIdentifier(elem.name) ? elem.name.text : null;
      const name = propertyName ?? elementName;
      if (name === 'page') {
        ctx.pageVariableNames.add(elementName ?? 'page');
      }
    }
  }
}

export function isKnownPage(objectName: string, ctx: VisitorContext): boolean {
  return (
    objectName === 'page' ||
    ctx.pageVariableNames.has(objectName) ||
    (ctx.currentPageObject !== null && objectName === 'page')
  );
}

export function extractPageMethodCall(node: ts.CallExpression): PageMethodInfo | null {
  const expr = node.expression;
  if (!ts.isPropertyAccessExpression(expr)) return null;
  if (!ts.isIdentifier(expr.name)) return null;

  const method = expr.name.text;
  if (!PAGE_METHODS.has(method)) return null;

  if (ts.isIdentifier(expr.expression)) {
    return { method, objectName: expr.expression.text };
  }

  return null;
}

export function extractThisMethodCall(node: ts.CallExpression): ThisMethodInfo | null {
  const expr = node.expression;
  if (!ts.isPropertyAccessExpression(expr)) return null;
  if (!ts.isIdentifier(expr.name)) return null;

  const method = expr.name.text;
  if (!PAGE_METHODS.has(method)) return null;

  if (ts.isPropertyAccessExpression(expr.expression)) {
    const inner = expr.expression;
    if (inner.expression.kind === ts.SyntaxKind.ThisKeyword && ts.isIdentifier(inner.name)) {
      return { method, property: inner.name.text };
    }
  }

  if (expr.expression.kind === ts.SyntaxKind.ThisKeyword) {
    return { method, property: null };
  }

  return null;
}
