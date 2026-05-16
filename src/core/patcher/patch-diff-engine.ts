/**
 * PatchDiffEngine
 *
 * Generates deterministic unified diffs from original/replacement code snippets.
 * Produces before/after snippets with exact line references.
 * No file I/O. No external diff library. Pure string-based line diff.
 */

import type { PatchDiff } from '../../models/patch.js';

/**
 * Compute a line-level diff between two strings.
 * Returns added/removed line counts.
 */
function computeLineDiff(
  original: string,
  replacement: string,
): { addedLines: number; removedLines: number; hunks: DiffHunk[] } {
  const origLines = original.split('\n');
  const replLines = replacement.split('\n');

  const origLen = origLines.length;
  const replLen = replLines.length;

  const maxLen = Math.max(origLen, replLen);
  let addedLines = 0;
  let removedLines = 0;
  const hunks: DiffHunk[] = [];

  let i = 0;
  while (i < maxLen) {
    if (i >= origLen) {
      addedLines += replLen - i;
      hunks.push({
        type: 'add',
        origStart: i,
        origLines: [],
        replStart: i,
        replLines: replLines.slice(i),
      });
      break;
    }
    if (i >= replLen) {
      removedLines += origLen - i;
      hunks.push({
        type: 'remove',
        origStart: i,
        origLines: origLines.slice(i),
        replStart: i,
        replLines: [],
      });
      break;
    }

    if (origLines[i] !== replLines[i]) {
      removedLines++;
      addedLines++;
      hunks.push({
        type: 'change',
        origStart: i,
        origLines: origLines[i] !== undefined ? [origLines[i] as string] : [],
        replStart: i,
        replLines: replLines[i] !== undefined ? [replLines[i] as string] : [],
      });
    }
    i++;
  }

  return { addedLines, removedLines, hunks };
}

interface DiffHunk {
  type: 'change' | 'add' | 'remove';
  origStart: number;
  origLines: string[];
  replStart: number;
  replLines: string[];
}

/**
 * Format hunks into a unified diff string.
 */
function formatUnifiedDiff(
  hunks: DiffHunk[],
  filePath: string,
): string {
  const lines: string[] = [];

  for (const hunk of hunks) {
    if (hunk.origLines.length === 0 && hunk.replLines.length === 0) continue;

    if (hunk.type === 'add') {
      lines.push(`@@ -${hunk.origStart},0 +${hunk.replStart + 1},${hunk.replLines.length} @@`);
      for (const rl of hunk.replLines) {
        lines.push(`+${rl}`);
      }
    } else if (hunk.type === 'remove') {
      lines.push(`@@ -${hunk.origStart + 1},${hunk.origLines.length} +${hunk.replStart},0 @@`);
      for (const ol of hunk.origLines) {
        lines.push(`-${ol}`);
      }
    } else {
      const ctxLen = Math.max(hunk.origLines.length, hunk.replLines.length);
      lines.push(`@@ -${hunk.origStart + 1},${ctxLen} +${hunk.replStart + 1},${ctxLen} @@`);
      for (const ol of hunk.origLines) {
        lines.push(`-${ol}`);
      }
      for (const rl of hunk.replLines) {
        lines.push(`+${rl}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Extract a snippet of lines around a target line.
 */
function extractSnippet(
  content: string,
  targetLine: number,
  contextLines: number = 3,
): { snippet: string; startLine: number; endLine: number } {
  const lines = content.split('\n');
  const startLine = Math.max(0, targetLine - contextLines);
  const endLine = Math.min(lines.length - 1, targetLine + contextLines);
  const snippet = lines.slice(startLine, endLine + 1).join('\n');
  return { snippet, startLine, endLine };
}

export class PatchDiffEngine {
  /**
   * Generate a unified diff between original and replacement code.
   *
   * @param originalFileContent — Full source file content (for context extraction)
   * @param originalCode — The exact original code to replace
   * @param replacementCode — The replacement code
   * @param targetLine — 0-indexed line number of the original code
   * @param filePath — Source file path (for diff header)
   */
  generateDiff(
    originalFileContent: string,
    originalCode: string,
    replacementCode: string,
    targetLine: number,
    filePath: string,
  ): PatchDiff {
    const { addedLines, removedLines, hunks } = computeLineDiff(originalCode, replacementCode);
    const unifiedDiff = formatUnifiedDiff(hunks, filePath);

    const before = extractSnippet(originalFileContent, targetLine, 3);
    const replacedContent = this.applyReplacement(originalFileContent, originalCode, replacementCode, targetLine);
    const after = extractSnippet(replacedContent, targetLine, 3);

    return {
      unifiedDiff,
      beforeSnippet: before.snippet,
      afterSnippet: after.snippet,
      beforeStartLine: before.startLine,
      beforeEndLine: before.endLine,
      afterStartLine: after.startLine,
      afterEndLine: after.endLine,
      addedLines,
      removedLines,
    };
  }

  /**
   * Apply a single replacement to file content (used for after-snippet generation only).
   * Does NOT write to disk.
   */
  applyReplacement(
    content: string,
    originalCode: string,
    replacementCode: string,
    targetLine: number,
  ): string {
    const lines = content.split('\n');
    const startOffset = targetLine;
    const originalLines = originalCode.split('\n');
    const replLines = replacementCode.split('\n');

    const before = lines.slice(0, startOffset);
    const after = lines.slice(startOffset + originalLines.length);

    return [...before, ...replLines, ...after].join('\n');
  }

  /**
   * Generate a minimal unified diff string (header + hunks).
   */
  generateUnifiedDiffString(
    originalCode: string,
    replacementCode: string,
    filePath: string,
  ): string {
    const { hunks } = computeLineDiff(originalCode, replacementCode);
    return formatUnifiedDiff(hunks, filePath);
  }
}
