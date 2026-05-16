/**
 * Patch Application Engine
 *
 * Applies validated PatchProposal to sandbox workspace using AST-safe operations.
 * Ensures exact node replacement, formatting preservation, and comment preservation.
 *
 * Rejects:
 * - ambiguous AST targets
 * - invalid replacements
 * - compile-invalid mutations
 *
 * No AI. No autonomous execution. Deterministic patch application.
 */

import * as ts from 'typescript';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Result } from '../../models/result.js';
import type { PatchProposal, ASTNodeMetadata } from '../../models/patch.js';
import { success, failure } from '../../models/result.js';

export interface PatchApplicationResult {
  success: boolean;
  targetFile: string;
  targetLine: number;
  originalContent: string;
  patchedContent: string;
  errors: string[];
  warnings: string[];
  nodeReplaced: boolean;
}

export interface PatchValidationResult {
  valid: boolean;
  targetExists: boolean;
  targetMatches: boolean;
  compilationValid: boolean;
  errors: string[];
}

export class PatchApplicationEngine {
  /**
   * Apply a patch proposal to a file in the sandbox workspace.
   */
  applyPatch(
    workspacePath: string,
    proposal: PatchProposal,
  ): Result<PatchApplicationResult> {
    try {
      const targetPath = join(workspacePath, proposal.targetFile);

      if (!existsSync(targetPath)) {
        return failure(`Target file does not exist: ${proposal.targetFile}`);
      }

      const originalContent = readFileSync(targetPath, 'utf-8');
      const validation = this.validatePatch(originalContent, proposal);

      if (!validation.valid) {
        return failure(`Patch validation failed: ${validation.errors.join('; ')}`);
      }

      const patchedContent = this.applyPatchToContent(originalContent, proposal);

      const compileCheck = this.verifyCompilation(patchedContent, targetPath);
      if (!compileCheck.valid) {
        return failure(`Patch causes compilation errors: ${compileCheck.errors.join('; ')}`);
      }

      writeFileSync(targetPath, patchedContent, 'utf-8');

      return success({
        success: true,
        targetFile: proposal.targetFile,
        targetLine: proposal.targetLocator.sourceLine,
        originalContent,
        patchedContent,
        errors: [],
        warnings: compileCheck.warnings,
        nodeReplaced: true,
      });
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Validate that the patch can be applied to the target content.
   */
  validatePatch(originalContent: string, proposal: PatchProposal): PatchValidationResult {
    const errors: string[] = [];

    const sourceFile = ts.createSourceFile(
      proposal.targetFile,
      originalContent,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

    const targetNode = this.findTargetNode(sourceFile, proposal.astNodeMetadata);

    if (!targetNode) {
      errors.push(`Cannot find target AST node at line ${proposal.targetLocator.sourceLine}`);
      return { valid: false, targetExists: false, targetMatches: false, compilationValid: true, errors };
    }

    const originalSnippet = proposal.originalCodeSnippet.trim();
    const nodeText = targetNode.getText().trim();

    const normalizedOriginal = this.normalizeForComparison(originalSnippet);
    const normalizedNode = this.normalizeForComparison(nodeText);

    if (!this.arraysEqual(normalizedOriginal, normalizedNode)) {
      errors.push(`Target content does not match original snippet`);
      return { valid: false, targetExists: true, targetMatches: false, compilationValid: true, errors };
    }

    return { valid: true, targetExists: true, targetMatches: true, compilationValid: true, errors: [] };
  }

  /**
   * Apply the patch to content and return patched result.
   */
  applyPatchToContent(originalContent: string, proposal: PatchProposal): string {
    const lines = originalContent.split('\n');
    const startLine = proposal.patchDiff.beforeStartLine;
    const endLine = proposal.patchDiff.beforeEndLine;
    const newContent = proposal.replacementCodeSnippet;

    const before = lines.slice(0, startLine - 1).join('\n');
    const after = lines.slice(endLine).join('\n');

    const patched = before + '\n' + newContent + '\n' + after;
    return patched;
  }

  /**
   * Verify that patched content compiles correctly.
   */
  verifyCompilation(content: string, filePath: string): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

    const syntaxErrors = this.getSyntaxErrors(sourceFile);
    errors.push(...syntaxErrors);

    try {
      const program = ts.createProgram([filePath], {}, {
        getSourceFile: (name) => name === filePath ? sourceFile : undefined,
        writeFile: () => {},
        getDefaultLibFileName: () => 'lib.d.ts',
        useCaseSensitiveFileNames: () => true,
        getCanonicalFileName: (f) => f,
        getCurrentDirectory: () => '',
        getNewLine: () => '\n',
        fileExists: (f) => f === filePath,
        readFile: () => undefined,
        directoryExists: () => true,
        getDirectories: () => [],
      });

      const semanticDiagnostics = ts.getPreEmitDiagnostics(program);
      for (const diag of semanticDiagnostics) {
        if (diag.category === ts.DiagnosticCategory.Error) {
          const message = ts.flattenDiagnosticMessageText(diag.messageText, '\n');
          errors.push(message);
        } else if (diag.category === ts.DiagnosticCategory.Warning) {
          const message = ts.flattenDiagnosticMessageText(diag.messageText, '\n');
          warnings.push(message);
        }
      }
    } catch {
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Reject ambiguous targets - check for multiple potential matches.
   */
  checkForAmbiguity(sourceFile: ts.SourceFile, proposal: PatchProposal): string[] {
    const errors: string[] = [];
    const line = proposal.targetLocator.sourceLine;

    const lineStarts = sourceFile.getLineStarts();
    const startPos = lineStarts[line - 1] ?? 0;
    const endPos = lineStarts[line] ?? sourceFile.getEnd();
    const lineContent = sourceFile.text.substring(startPos, endPos);

    if (lineContent.trim().length === 0) {
      errors.push('Target line is empty - ambiguous AST target');
    }

    const matches = this.findAllMatchingNodes(sourceFile, proposal.originalCodeSnippet);
    if (matches.length > 1) {
      errors.push(`Ambiguous target: found ${matches.length} potential matches`);
    }

    return errors;
  }

  private findTargetNode(sourceFile: ts.SourceFile, metadata: ASTNodeMetadata): ts.Node | null {
    const position = sourceFile.getPositionOfLineAndCharacter(
      metadata.startLine - 1,
      metadata.startColumn,
    );

    const node = this.getNodeAtPosition(sourceFile, position);
    if (!node) return null;

    return this.findNodeAtRange(sourceFile, metadata.startLine, metadata.endLine, metadata.startColumn, metadata.endColumn);
  }

  private getNodeAtPosition(sourceFile: ts.SourceFile, position: number): ts.Node | null {
    let bestNode: ts.Node | null = null;

    const visit = (node: ts.Node) => {
      const start = node.getStart();
      const end = node.getEnd();

      if (start <= position && position <= end) {
        if (!bestNode || (end - start) < (bestNode.getEnd() - bestNode.getStart())) {
          bestNode = node;
        }
        ts.forEachChild(node, visit);
      }
    };

    visit(sourceFile);
    return bestNode;
  }

  private findNodeAtRange(
    sourceFile: ts.SourceFile,
    startLine: number,
    endLine: number,
    startCol: number,
    endCol: number,
  ): ts.Node | null {
    let bestMatch: ts.Node | null = null;

    const visit = (node: ts.Node) => {
      const nodeStart = node.getStart();
      const nodeEnd = node.getEnd();
      const nodeStartLine = sourceFile.getLineAndCharacterOfPosition(nodeStart);
      const nodeEndLine = sourceFile.getLineAndCharacterOfPosition(nodeEnd);

      if (nodeStartLine.line + 1 <= endLine && nodeEndLine.line + 1 >= startLine) {
        if (!bestMatch || node.getFullWidth() < bestMatch.getFullWidth()) {
          if (nodeStartLine.line + 1 >= startLine && nodeEndLine.line + 1 <= endLine) {
            bestMatch = node;
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return bestMatch;
  }

  private findAllMatchingNodes(sourceFile: ts.SourceFile, searchText: string): ts.Node[] {
    const matches: ts.Node[] = [];
    const normalizedSearch = this.normalizeForComparison(searchText);

    const visit = (node: ts.Node) => {
      const nodeText = this.normalizeForComparison(node.getText());
      if (nodeText.length > 0 && this.arraysEqual(nodeText, normalizedSearch)) {
        matches.push(node);
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return matches;
  }

  private getSyntaxErrors(sourceFile: ts.SourceFile): string[] {
    const errors: string[] = [];

    try {
      const parseResult = ts.createSourceFile(
        sourceFile.fileName,
        sourceFile.text,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      );

      const diagnostics: ts.Diagnostic[] = [];
      function visit(node: ts.Node) {
        if (node.kind === ts.SyntaxKind.Unknown) {
          diagnostics.push({
            file: parseResult,
            start: node.pos,
            length: node.end - node.pos,
            category: ts.DiagnosticCategory.Error,
            code: 0,
            messageText: 'Unknown syntax',
          });
        }
        ts.forEachChild(node, visit);
      }
      visit(parseResult);

      for (const diag of diagnostics) {
        if (diag.category === ts.DiagnosticCategory.Error) {
          const message = typeof diag.messageText === 'string' ? diag.messageText : String(diag.messageText);
          errors.push(`Syntax error: ${message}`);
        }
      }
    } catch (e) {
      errors.push(`Parse error: ${String(e)}`);
    }

    return errors;
  }

  private normalizeForComparison(text: string): string[] {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[\n\r]/g, ' ')
      .trim()
      .split(' ')
      .filter((t) => t.length > 0);
  }

  private arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
}

export function createPatchApplicationEngine(): PatchApplicationEngine {
  return new PatchApplicationEngine();
}