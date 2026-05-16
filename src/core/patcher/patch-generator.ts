/**
 * PatchGenerator
 *
 * AST-based deterministic patch proposal generator.
 *
 * For each validated healing proposal:
 * 1. Parse the source file using TypeScript compiler API
 * 2. Locate the exact AST node for the target locator expression
 * 3. Verify node uniqueness (reject ambiguous/multiple matches)
 * 4. Generate replacement preserving formatting, comments, surrounding code
 * 5. Build a PatchProposal with full metadata (diff, rollback, audit linkage)
 *
 * Patch generation does NOT apply patches. All output is review-only.
 * No regex-based replacement. No AI. No autonomous modification.
 */

import ts from 'typescript';
import { readFileSync, existsSync } from 'node:fs';
import type { HealingCandidate } from '../../models/healing-candidate.js';
import type { ValidationResult } from '../../models/validation.js';
import type { RuntimeValidationResult } from '../../models/runtime.js';
import type { StabilityReport } from '../../models/stability.js';
import type { Result } from '../../models/result.js';
import type {
  PatchProposal,
  PatchDiff,
  ASTNodeMetadata,
  ConfidenceMetadata,
  ValidationReference,
  AuditReference,
  RollbackMetadata,
  PatchReviewStatus,
} from '../../models/patch.js';
import { PATCH_SCHEMA_VERSION } from '../../models/patch.js';
import { success, failure } from '../../models/result.js';
import { PatchDiffEngine } from './patch-diff-engine.js';
import { PatchSafetyValidator } from './patch-safety-validator.js';
import type { SafetyValidationInput, SafetyValidationOutput } from './patch-safety-validator.js';

let counter = 0;
function nextPatchId(): string {
  counter++;
  return `patch-${Date.now()}-${counter}`;
}

export interface LocatorAstMatch {
  node: ts.CallExpression;
  sourceFile: ts.SourceFile;
  expressionText: string;
}

export interface PatchGeneratorInput {
  candidate: HealingCandidate;
  targetFile: string;
  targetLine: number;
  targetColumn?: number;
  validation?: ValidationResult;
  runtimeValidation?: RuntimeValidationResult;
  stabilityReport?: StabilityReport;
  auditTrailId?: string;
  pipelineRunId?: string;
  governanceThreshold?: number;
}

export class PatchGenerator {
  private readonly diffEngine: PatchDiffEngine;
  private readonly safetyValidator: PatchSafetyValidator;

  constructor() {
    this.diffEngine = new PatchDiffEngine();
    this.safetyValidator = new PatchSafetyValidator();
  }

  /**
   * Generate a patch proposal from a validated healing candidate.
   * Returns failure if safety gates are not passed or AST node cannot be located.
   */
  generate(input: PatchGeneratorInput): Result<PatchProposal> {
    try {
      // 1. Run safety validation
      const safetyInput: SafetyValidationInput = {
        candidate: input.candidate,
        validation: input.validation,
        runtimeValidation: input.runtimeValidation,
        stabilityReport: input.stabilityReport,
        governanceThreshold: input.governanceThreshold ?? 0.5,
      };

      const safetyResult = this.safetyValidator.validate(safetyInput);
      if (!safetyResult.ok) {
        return failure(`Safety validation error: ${safetyResult.error}`);
      }

      if (!safetyResult.value.passed) {
        return failure(safetyResult.value.rejectionReason ?? 'Safety gates rejected patch generation');
      }

      // 2. Read and parse source file
      const fileContent = this.readSourceFile(input.targetFile);
      if (!fileContent.ok) return fileContent;
      const sourceText = fileContent.value;

      const sourceFile = ts.createSourceFile(
        input.targetFile,
        sourceText,
        ts.ScriptTarget.Latest,
        true,
      );

      // 3. Locate the AST node for the original locator expression
      const matchResult = this.locateLocatorNode(
        sourceFile,
        input.candidate.originalExpression,
        input.targetLine,
        input.targetColumn,
      );

      if (!matchResult.ok) return matchResult;
      const match = matchResult.value;

      // 4. Generate replacement text preserving formatting
      const replacementResult = this.generateReplacementText(
        match.node,
        input.candidate.proposedExpression,
      );
      if (!replacementResult.ok) return replacementResult;
      const { originalText, replacementText } = replacementResult.value;

      // 5. Generate patch diff
      const patchDiff = this.diffEngine.generateDiff(
        sourceText,
        originalText,
        replacementText,
        input.targetLine,
        input.targetFile,
      );

      // 6. Build AST node metadata
      const astMeta = this.buildAstMetadata(match.node, match.sourceFile);

      // 7. Build rollback metadata
      const rollbackMeta = this.buildRollbackMetadata(
        input.candidate,
        input.targetLine,
        astMeta.startColumn,
        replacementText,
        input.validation,
        input.runtimeValidation,
      );

      // 8. Build confidence metadata
      const confidenceMeta = this.buildConfidenceMetadata(
        input.validation,
        input.runtimeValidation,
        input.stabilityReport,
      );

      // 9. Build validation references
      const validationRefs = this.buildValidationReferences(input.validation, input.runtimeValidation);

      // 10. Build audit references
      const auditRefs: AuditReference[] = [];
      if (input.auditTrailId || input.pipelineRunId) {
        auditRefs.push({
          auditTrailId: input.auditTrailId,
          pipelineRunId: input.pipelineRunId,
        });
      }

      // 11. Build patch summary
      const patchId = nextPatchId();
      const patchSummary = this.buildPatchSummary(
        input.candidate,
        patchDiff,
      );

      const proposal: PatchProposal = {
        patchId,
        proposalId: input.candidate.id,
        targetFile: input.targetFile,
        targetLocator: {
          expression: input.candidate.originalExpression,
          strategy: input.candidate.proposedStrategy,
          value: input.candidate.proposedValue,
          sourceLine: input.targetLine,
          sourceColumn: astMeta.startColumn,
        },
        originalCodeSnippet: originalText,
        replacementCodeSnippet: replacementText,
        astNodeMetadata: astMeta,
        confidenceMetadata: confidenceMeta,
        rollbackMetadata: rollbackMeta,
        patchSummary,
        validationRefs,
        auditRefs,
        patchDiff,
        status: 'proposed',
        schemaVersion: PATCH_SCHEMA_VERSION,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      return success(proposal);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Read a source file from disk.
   */
  private readSourceFile(filePath: string): Result<string> {
    try {
      if (!existsSync(filePath)) {
        return failure(`Source file not found: ${filePath}`);
      }
      const content = readFileSync(filePath, 'utf-8');
      return success(content);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Locate a CallExpression node in the AST that matches the original locator expression.
   * Walks the AST recursively, finds all CallExpression nodes on the target line,
   * and verifies a single unique match.
   *
   * Handles chained expressions like page.getByTestId('submit').click() by
   * preferring the node whose text exactly matches originalExpression.
   */
  locateLocatorNode(
    sourceFile: ts.SourceFile,
    originalExpression: string,
    targetLine: number,
    targetColumn?: number,
  ): Result<LocatorAstMatch> {
    const matches: LocatorAstMatch[] = [];

    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        const startPos = node.getStart(sourceFile);
        const line = sourceFile.getLineAndCharacterOfPosition(startPos).line;
        const col = sourceFile.getLineAndCharacterOfPosition(startPos).character;
        const endPos = node.getEnd();
        const exprText = sourceFile.text.slice(startPos, endPos);

        if (line === targetLine) {
          if (targetColumn === undefined || col === targetColumn) {
            matches.push({ node, sourceFile, expressionText: exprText });
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    ts.forEachChild(sourceFile, visit);

    if (matches.length === 0) {
      return failure(`No CallExpression found at line ${targetLine} matching original expression`);
    }

    // For chained expressions (e.g. page.getByTestId('submit').click()), nested
    // CallExpressions share the same start position. Try to find one whose text
    // exactly matches the original expression.
    const trimmedOriginal = originalExpression.trim();
    const exactMatch = matches.find(m => m.expressionText.trim() === trimmedOriginal);

    if (exactMatch) {
      return success(exactMatch);
    }

    // If no exact match, but only one match exists, use it
    if (matches.length === 1) {
      const match = matches[0]!;
      return failure(
        `Expression mismatch at line ${targetLine}: expected "${trimmedOriginal}", found "${match.expressionText.trim()}"`,
      );
    }

    // Multiple matches exist but none match exactly - prefer innermost (shortest text)
    const sorted = [...matches].sort((a, b) => a.expressionText.length - b.expressionText.length);
    const candidate = sorted[0]!;

    if (candidate.expressionText.trim() === trimmedOriginal) {
      return success(candidate);
    }

    return failure(
      `Ambiguous AST match: ${matches.length} CallExpression nodes at line ${targetLine}. ` +
      `Expected "${trimmedOriginal}", found candidates: [${matches.map(m => `"${m.expressionText.trim()}"`).join(', ')}]`,
    );
  }

  /**
   * Generate the replacement text for a CallExpression, preserving formatting.
   * Returns the original text and the replacement text.
   */
  private generateReplacementText(
    node: ts.CallExpression,
    proposedExpression: string,
  ): Result<{ originalText: string; replacementText: string }> {
    try {
      const sf = node.getSourceFile();
      const start = node.getStart(sf);
      const end = node.getEnd();
      const originalText = sf.text.slice(start, end);

      return success({ originalText, replacementText: proposedExpression });
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Build ASTNodeMetadata from a CallExpression node.
   */
  private buildAstMetadata(
    node: ts.CallExpression,
    sourceFile: ts.SourceFile,
  ): ASTNodeMetadata {
    const startPos = node.getStart(sourceFile);
    const endPos = node.getEnd();
    const startLine = sourceFile.getLineAndCharacterOfPosition(startPos).line;
    const endLine = sourceFile.getLineAndCharacterOfPosition(endPos).line;
    const startCol = sourceFile.getLineAndCharacterOfPosition(startPos).character;
    const endCol = sourceFile.getLineAndCharacterOfPosition(endPos).character;

    let parentType: string | undefined;
    if (node.parent) {
      parentType = ts.SyntaxKind[node.parent.kind];
    }

    const expr = node.expression;
    let expressionType: string;
    if (ts.isPropertyAccessExpression(expr)) {
      expressionType = 'PropertyAccessExpression';
    } else if (ts.isIdentifier(expr)) {
      expressionType = 'Identifier';
    } else {
      expressionType = ts.SyntaxKind[expr.kind];
    }

    return {
      nodeType: 'CallExpression',
      startLine,
      endLine,
      startColumn: startCol,
      endColumn: endCol,
      parentType,
      expressionType,
    };
  }

  /**
   * Build rollback metadata for the patch proposal.
   */
  private buildRollbackMetadata(
    candidate: HealingCandidate,
    targetLine: number,
    targetColumn: number,
    replacementCode: string,
    validation?: ValidationResult,
    runtimeValidation?: RuntimeValidationResult,
  ): RollbackMetadata {
    const validationIds: string[] = [];
    if (validation) validationIds.push(validation.id);
    if (runtimeValidation) validationIds.push(runtimeValidation.id);

    const replayIds: string[] = [];
    if (validation?.replaySessionId) replayIds.push(validation.replaySessionId);
    if (runtimeValidation?.replaySessionId) replayIds.push(runtimeValidation.replaySessionId);

    return {
      originalLocatorExpression: candidate.originalExpression,
      originalStrategy: candidate.strategy,
      originalValue: candidate.proposedValue,
      originalSourceFile: '',
      originalLine: targetLine,
      originalColumn: targetColumn,
      patchReversalCode: candidate.originalExpression,
      validationIds,
      replaySessionIds: replayIds,
      createdAt: Date.now(),
    };
  }

  /**
   * Build confidence metadata from validation results.
   */
  private buildConfidenceMetadata(
    validation?: ValidationResult,
    runtimeValidation?: RuntimeValidationResult,
    stabilityReport?: StabilityReport,
  ): ConfidenceMetadata {
    return {
      staticValidationConfidence: validation?.replayConfidence ?? 0,
      runtimeConfidence: runtimeValidation?.runtimeConfidence,
      governanceConfidence: validation?.replayConfidence ?? 0,
      stabilityScore: stabilityReport?.reproducibilityScore,
    };
  }

  /**
   * Build validation references.
   */
  private buildValidationReferences(
    validation?: ValidationResult,
    runtimeValidation?: RuntimeValidationResult,
  ): ValidationReference[] {
    const refs: ValidationReference[] = [];

    if (validation) {
      refs.push({
        validationId: validation.id,
        validationStatus: validation.status,
        matchedElementCount: validation.matchedElementCount,
        falsePositiveCount: validation.falsePositiveIndicators.length,
      });
    }

    if (runtimeValidation) {
      refs.push({
        validationId: runtimeValidation.id,
        validationStatus: runtimeValidation.status,
        matchedElementCount: runtimeValidation.executedStepCount,
        falsePositiveCount: runtimeValidation.falsePositiveIndicators.length,
      });
    }

    return refs;
  }

  /**
   * Build a human-readable patch summary.
   */
  private buildPatchSummary(
    candidate: HealingCandidate,
    diff: PatchDiff,
  ): string {
    const lines = [];
    lines.push(`Replace locator in ${candidate.originalExpression}`);
    lines.push(`Strategy: ${candidate.proposedStrategy}`);
    lines.push(`Original: ${candidate.originalExpression}`);
    lines.push(`Replacement: ${candidate.proposedExpression}`);
    lines.push(`Diff: ${diff.removedLines} line(s) removed, ${diff.addedLines} line(s) added`);
    return lines.join('\n');
  }
}
