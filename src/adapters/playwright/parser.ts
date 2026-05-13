/**
 * Playwright AST Parser — Orchestrator
 *
 * Walks the TypeScript AST of test files by dispatching to focused sub-modules:
 *   - test-discovery.ts   → test() and describe() extraction
 *   - locator-extractor.ts → page.locator(), page.getBy*() extraction
 *   - navigation-extractor.ts → page.goto() extraction
 *   - ast-utils.ts        → shared types, constants, tree helpers
 *
 * This is a pure, deterministic parser. No runtime execution.
 */

import ts from 'typescript';
import { debug } from '../../logger/index.js';
import type { LocatorStrategy } from '../../models/locator.js';
import type { PageObjectDefinition, NavigationMethod } from '../../core/analyzer/types.js';
import type { VisitorContext } from './ast-utils.js';
import {
  PAGE_METHODS, isKnownPage,
  extractPageMethodCall, extractThisMethodCall,
  detectPageImports,
} from './ast-utils.js';
import { extractLocator } from './locator-extractor.js';
import { extractNavigation } from './navigation-extractor.js';
import { visitTestCall, visitDescribeCall } from './test-discovery.js';
import type { ExtractedTest } from './ast-utils.js';

export type { ExtractedTest } from './ast-utils.js';

export interface ParseResult {
  tests: ExtractedTest[];
  locators: import('../../models/locator.js').Locator[];
  pageObjects: PageObjectDefinition[];
  navigations: import('../../core/analyzer/types.js').NavigationDefinition[];
}

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

  detectPageImports(sourceFile, ctx);

  visitNode(sourceFile, ctx);

  return {
    tests: ctx.tests,
    locators: ctx.locators,
    pageObjects: ctx.pageObjects,
    navigations: ctx.navigations,
  };
}

function visitNode(node: ts.Node, ctx: VisitorContext): void {
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

function visitCallExpression(node: ts.CallExpression, ctx: VisitorContext): void {
  const expr = node.expression;

  if (ts.isIdentifier(expr) && expr.text === 'test') {
    visitTestCall(node, ctx);
    return;
  }

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

  const methodInfo = extractPageMethodCall(node);
  if (methodInfo) {
    const { method, objectName } = methodInfo;
    if (PAGE_METHODS.has(method) && isKnownPage(objectName, ctx)) {
      handlePageMethodCall(node, method, ctx);
      return;
    }
  }

  const thisMethodInfo = extractThisMethodCall(node);
  if (thisMethodInfo) {
    const { method, property } = thisMethodInfo;
    if (property === 'page' && PAGE_METHODS.has(method)) {
      handlePageMethodCall(node, method, ctx);
      return;
    }
    if (!property && PAGE_METHODS.has(method) && ctx.currentPageObject) {
      handlePageMethodCall(node, method, ctx);
      return;
    }
  }
}

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

function visitClassDeclaration(node: ts.ClassDeclaration, ctx: VisitorContext): void {
  const name = node.name?.text;
  if (!name) return;

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

    for (const member of node.members) {
      if (ts.isPropertyDeclaration(member) && member.initializer) {
        visitNode(member.initializer, ctx);
      }
      if (ts.isMethodDeclaration(member)) {
        const methodName = member.name && ts.isIdentifier(member.name) ? member.name.text : '<anonymous>';
        const methodLine = ctx.sourceFile.getLineAndCharacterOfPosition(member.getStart()).line + 1;

        const navMethod: NavigationMethod = {
          name: methodName,
          line: methodLine,
          navigations: [],
        };

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

function detectPlaywrightClass(node: ts.ClassDeclaration, ctx: VisitorContext): boolean {
  const text = node.getText(ctx.sourceFile);

  if (ctx.pageVariableNames.size > 0 && text.includes('page.')) {
    return true;
  }

  for (const member of node.members) {
    const memberText = member.getText(ctx.sourceFile);
    for (const method of PAGE_METHODS) {
      if (memberText.includes(`.${method}(`)) {
        if (memberText.includes('page.') || memberText.includes('this.')) {
          return true;
        }
      }
    }
  }

  return false;
}
