/**
 * Playwright AST Parser
 *
 * Walks the TypeScript AST of test files and extracts:
 * - Test definitions (test, describe)
 * - Locator expressions (page.locator, page.getBy*, etc.)
 * - Page object class definitions
 * - Navigation patterns (page.goto)
 *
 * This is a pure, deterministic parser. No runtime execution.
 */

import ts from 'typescript';
import { createHash } from 'node:crypto';
import { debug, warn } from '../../logger/index.js';
import type { LocatorStrategy, Locator } from '../../models/locator.js';
import type {
  PageObjectDefinition,
  NavigationDefinition,
  NavigationMethod,
} from '../../core/analyzer/types.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ExtractedTest {
  name: string;
  line: number;
  /** Full name including describe nesting: "describe > it" */
  fullName: string;
  tags: string[];
}

export interface ParseResult {
  tests: ExtractedTest[];
  locators: Locator[];
  pageObjects: PageObjectDefinition[];
  navigations: NavigationDefinition[];
}

/**
 * Parse a single source file and extract all Playwright test metadata.
 */
export function parseSourceFile(filePath: string, sourceCode: string): ParseResult {
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true,
  );

  const ctx: VisitorContext = {
    filePath,
    sourceFile,
    tests: [],
    locators: [],
    pageObjects: [],
    navigations: [],
    describeStack: [],
    currentPageObject: null,
    pageVariableNames: new Set(),
  };

  // First pass: find import of page from @playwright/test to identify page references
  detectPageImports(sourceFile, ctx);

  // Second pass: walk the entire AST
  visitNode(sourceFile, ctx);

  return {
    tests: ctx.tests,
    locators: ctx.locators,
    pageObjects: ctx.pageObjects,
    navigations: ctx.navigations,
  };
}

// ---------------------------------------------------------------------------
// Visitor Context
// ---------------------------------------------------------------------------

interface VisitorContext {
  filePath: string;
  sourceFile: ts.SourceFile;
  tests: ExtractedTest[];
  locators: Locator[];
  pageObjects: PageObjectDefinition[];
  navigations: NavigationDefinition[];
  describeStack: string[];
  currentPageObject: PageObjectDefinition | null;
  /** Variable names known to be Playwright Page instances. */
  pageVariableNames: Set<string>;
}

// ---------------------------------------------------------------------------
// AST Visitor
// ---------------------------------------------------------------------------

function visitNode(node: ts.Node, ctx: VisitorContext): void {
  // Handle describe stack push/pop around children to prevent double-traversal.
  // The stack must be pushed BEFORE children are visited (so test() calls inside the
  // describe block see the correct stack), and popped AFTER all children are done.
  let isDescribe = false;
  if (ts.isCallExpression(node)) {
    const expr = node.expression;
    isDescribe =
      ts.isPropertyAccessExpression(expr) &&
      ts.isIdentifier(expr.expression) &&
      expr.expression.text === 'test' &&
      ts.isIdentifier(expr.name) &&
      expr.name.text === 'describe';
    if (isDescribe) {
      const nameArg = node.arguments[0];
      if (nameArg && ts.isStringLiteral(nameArg)) {
        ctx.describeStack.push(nameArg.text);
        debug('parser', `Entering describe: ${nameArg.text} (stack: ${ctx.describeStack.join(' > ')})`);
      }
    }
    visitCallExpression(node, ctx);
  }
  if (ts.isClassDeclaration(node)) {
    visitClassDeclaration(node, ctx);
  }
  ts.forEachChild(node, (child) => visitNode(child, ctx));
  if (isDescribe) {
    ctx.describeStack.pop();
  }
}

// ---------------------------------------------------------------------------
// Call Expression Visitor
// ---------------------------------------------------------------------------

const PAGE_METHODS = new Set([
  'locator', 'getByRole', 'getByText', 'getByPlaceholder',
  'getByLabel', 'getByTestId', 'getByAltText', 'getByTitle',
  'goto', 'frameLocator',
]);

function visitCallExpression(node: ts.CallExpression, ctx: VisitorContext): void {
  const expr = node.expression;

  // --- Pattern: test('name', ...) or test.describe('name', ...) ---
  if (ts.isIdentifier(expr) && expr.text === 'test') {
    visitTestCall(node, ctx);
    return;
  }

  // --- Pattern: test.describe(...) ---
  if (
    ts.isPropertyAccessExpression(expr) &&
    ts.isIdentifier(expr.expression) &&
    expr.expression.text === 'test' &&
    ts.isIdentifier(expr.name) &&
    expr.name.text === 'describe'
  ) {
    visitDescribeCall(node, ctx);
    return;
  }

  // --- Pattern: page.locator(...), page.getBy*(...), page.goto(...) ---
  const methodInfo = extractPageMethodCall(node);
  if (methodInfo) {
    const { method, objectName } = methodInfo;
    if (PAGE_METHODS.has(method) && isKnownPage(objectName, ctx)) {
      handlePageMethodCall(node, method, ctx);
      return;
    }
  }

  // --- Pattern: this.page.locator(...) or this.locator(...) inside page object ---
  const thisMethodInfo = extractThisMethodCall(node);
  if (thisMethodInfo) {
    const { method, property } = thisMethodInfo;
    if (property === 'page' && PAGE_METHODS.has(method)) {
      handlePageMethodCall(node, method, ctx);
      return;
    }
    // Direct this.locator(...) pattern
    if (!property && PAGE_METHODS.has(method) && ctx.currentPageObject) {
      handlePageMethodCall(node, method, ctx);
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Test / Describe Visitors
// ---------------------------------------------------------------------------

function visitTestCall(node: ts.CallExpression, ctx: VisitorContext): void {
  // First argument should be the test name (string literal)
  const nameArg = node.arguments[0];
  if (!nameArg || !ts.isStringLiteral(nameArg)) return;

  const testName = nameArg.text;
  const line = ctx.sourceFile.getLineAndCharacterOfPosition(nameArg.getStart()).line + 1;
  const fullName = ctx.describeStack.length > 0
    ? `${ctx.describeStack.join(' > ')} > ${testName}`
    : testName;

  // Extract tags from second argument if it's an object with tags property
  const tags = extractTestTags(node.arguments[1]);

  ctx.tests.push({ name: testName, line, fullName, tags });

  // Track page variable from callback destructuring
  const callback = node.arguments[node.arguments.length - 1];
  if (callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
    extractPageFromCallback(callback, ctx);
  }
}

function visitDescribeCall(node: ts.CallExpression, ctx: VisitorContext): void {
  // Stack push/pop and callback traversal are handled in visitNode() to avoid
  // double-traversing children. Only debug logging happens here.
  const nameArg = node.arguments[0];
  if (!nameArg || !ts.isStringLiteral(nameArg)) return;
  debug('parser', `  describe: ${nameArg.text}`);
}

function extractTestTags(secondArg: ts.Expression | undefined): string[] {
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

// ---------------------------------------------------------------------------
// Page Method Call Handler
// ---------------------------------------------------------------------------

function handlePageMethodCall(node: ts.CallExpression, method: string, ctx: VisitorContext): void {
  const line = ctx.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

  switch (method) {
    case 'locator':
      extractLocator(node, 'css', ctx, line);
      break;
    case 'getByRole':
      extractLocator(node, 'role', ctx, line);
      break;
    case 'getByText':
      extractLocator(node, 'text', ctx, line);
      break;
    case 'getByPlaceholder':
      extractLocator(node, 'placeholder', ctx, line);
      break;
    case 'getByLabel':
      extractLocator(node, 'label', ctx, line);
      break;
    case 'getByTestId':
      extractLocator(node, 'testid', ctx, line);
      break;
    case 'getByAltText':
      extractLocator(node, 'alt-text', ctx, line);
      break;
    case 'getByTitle':
      extractLocator(node, 'title', ctx, line);
      break;
    case 'goto':
      extractNavigation(node, ctx, line);
      break;
    case 'frameLocator':
      extractLocator(node, 'css', ctx, line);
      break;
  }
}

// ---------------------------------------------------------------------------
// Locator Extraction
// ---------------------------------------------------------------------------

function extractLocator(
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
    // Template literals like `button-${id}` — capture the head text
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

  // For locator(), detect CSS vs XPath vs text from the value
  if (inferredStrategy === 'css') {
    if (value.startsWith('//') || value.startsWith('..')) {
      strategy = 'xpath';
    } else if (value.startsWith('text=') || value.startsWith('has-text=')) {
      strategy = 'text';
    } else if (value.startsWith('data-testid=')) {
      strategy = 'testid';
    }
  }

  // Build the expression string
  const expression = buildLocatorExpression(strategy, value, node);

  // Determine property name if we're in a page object
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

  // If inside a page object, register locator on it
  if (ctx.currentPageObject) {
    ctx.currentPageObject.locators.push(locator);
  }
}

function buildLocatorExpression(strategy: LocatorStrategy, value: string, node: ts.CallExpression): string {
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

function hashLocator(strategy: string, value: string): string {
  const hash = createHash('sha1').update(`${strategy}:${value}`).digest('hex').slice(0, 12);
  return `loc_${hash}`;
}

// ---------------------------------------------------------------------------
// Navigation Extraction
// ---------------------------------------------------------------------------

function extractNavigation(node: ts.CallExpression, ctx: VisitorContext, line: number): void {
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

// ---------------------------------------------------------------------------
// Class Declaration Visitor (Page Objects)
// ---------------------------------------------------------------------------

function visitClassDeclaration(node: ts.ClassDeclaration, ctx: VisitorContext): void {
  const name = node.name?.text;
  if (!name) return;

  // Check if this class imports from @playwright/test or uses page
  const isPlaywrightClass = detectPlaywrightClass(node, ctx);

  if (isPlaywrightClass) {
    const line = ctx.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

    const pageObject: PageObjectDefinition = {
      name,
      filePath: ctx.filePath,
      line,
      locators: [],
      navigationMethods: [],
    };

    ctx.currentPageObject = pageObject;

    // Visit class members
    for (const member of node.members) {
      if (ts.isPropertyDeclaration(member) && member.initializer) {
        // Visit the initializer itself — it may be a locator call expression
        visitNode(member.initializer, ctx);
      }
      if (ts.isMethodDeclaration(member)) {
        // Method — might contain locator calls and navigation
        const methodName = member.name && ts.isIdentifier(member.name) ? member.name.text : '<anonymous>';
        const methodLine = ctx.sourceFile.getLineAndCharacterOfPosition(member.getStart()).line + 1;

        const navMethod: NavigationMethod = {
          name: methodName,
          line: methodLine,
          navigations: [],
        };

        // Track navigations within this method
        const prevNavigations = ctx.navigations.length;
        ts.forEachChild(member, (child) => visitNode(child, ctx));
        const newNavigations = ctx.navigations.slice(prevNavigations);
        navMethod.navigations = newNavigations;
        pageObject.navigationMethods.push(navMethod);
      }
    }

    ctx.pageObjects.push(pageObject);
    ctx.currentPageObject = null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the object name and method from a PropertyAccessExpression chain. */
interface PageMethodInfo { method: string; objectName: string }

function extractPageMethodCall(node: ts.CallExpression): PageMethodInfo | null {
  const expr = node.expression;
  if (!ts.isPropertyAccessExpression(expr)) return null;
  if (!ts.isIdentifier(expr.name)) return null;

  const method = expr.name.text;
  if (!PAGE_METHODS.has(method)) return null;

  // Get the object — it should be an identifier (e.g. `page`)
  if (ts.isIdentifier(expr.expression)) {
    return { method, objectName: expr.expression.text };
  }

  return null;
}

/** Extract from `this.page.method()` or `this.method()` patterns. */
interface ThisMethodInfo { method: string; property: string | null }

function extractThisMethodCall(node: ts.CallExpression): ThisMethodInfo | null {
  const expr = node.expression;
  if (!ts.isPropertyAccessExpression(expr)) return null;
  if (!ts.isIdentifier(expr.name)) return null;

  const method = expr.name.text;
  if (!PAGE_METHODS.has(method)) return null;

  // Check for this.page.method
  if (ts.isPropertyAccessExpression(expr.expression)) {
    const inner = expr.expression;
    if (inner.expression.kind === ts.SyntaxKind.ThisKeyword && ts.isIdentifier(inner.name)) {
      return { method, property: inner.name.text };
    }
  }

  // Check for this.method
  if (expr.expression.kind === ts.SyntaxKind.ThisKeyword) {
    return { method, property: null };
  }

  return null;
}

/** Check if a variable name is a known Playwright Page instance. */
function isKnownPage(objectName: string, ctx: VisitorContext): boolean {
  return (
    objectName === 'page' ||
    ctx.pageVariableNames.has(objectName) ||
    (ctx.currentPageObject !== null && objectName === 'page')
  );
}

/** Detect imports of `page` and `Page` from @playwright/test. */
function detectPageImports(sourceFile: ts.SourceFile, ctx: VisitorContext): void {
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
      const moduleName = ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : '';
      if (moduleName === '@playwright/test') {
        // Named imports: { test, expect, page }
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

/** Extract `page` from test callback destructuring: ({ page }) => ... */
function extractPageFromCallback(
  fn: ts.ArrowFunction | ts.FunctionExpression,
  ctx: VisitorContext,
): void {
  if (!fn.parameters || fn.parameters.length === 0) return;
  const firstParam = fn.parameters[0];

  // Pattern: ({ page }) or ({ page: page }) destructuring
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

/** Determine if a class is a Playwright page object. */
function detectPlaywrightClass(node: ts.ClassDeclaration, ctx: VisitorContext): boolean {
  const text = node.getText(ctx.sourceFile);

  // Check for Page import usage
  if (ctx.pageVariableNames.size > 0 && text.includes('page.')) {
    return true;
  }

  // Check for locator patterns in the class body
  for (const member of node.members) {
    const memberText = member.getText(ctx.sourceFile);
    for (const method of PAGE_METHODS) {
      if (memberText.includes(`.${method}(`)) {
        // Check if there's a `page.` or `this.page.` reference nearby
        if (memberText.includes('page.') || memberText.includes('this.')) {
          return true;
        }
      }
    }
  }

  return false;
}

/** Find the property name this locator expression is assigned to. */
function findAssignedPropertyName(node: ts.CallExpression, ctx: VisitorContext): string | null {
  let current: ts.Node = node.parent;

  // Walk up to find a PropertyDeclaration or PropertyAssignment
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

/** Extract surrounding code context around a position. */
function extractSurroundingCode(sourceFile: ts.SourceFile, pos: number): string {
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
