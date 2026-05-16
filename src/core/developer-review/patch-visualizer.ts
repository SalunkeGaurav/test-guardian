/**
 * Patch Visualizer
 *
 * Renders before/after diffs, affected files, selectors, patch scope,
 * and structural impact for developer review.
 *
 * Reuses: PatchDiff, PatchProposal, PatchDiffEngine
 */

import type { PatchVisualization } from './types.js';
import type { PatchDiff, PatchProposal } from '../../models/patch.js';

export class PatchVisualizer {
  visualize(proposal: PatchProposal): PatchVisualization {
    const diff = proposal.patchDiff;
    const linesChanged = diff.addedLines + diff.removedLines;

    const impactLevel = this.computeImpactLevel(diff, proposal.astNodeMetadata);

    const renderedDiff = this.renderUnifiedDiff(diff, proposal.targetFile);
    const renderedSummary = this.renderSummary(proposal, diff);

    return {
      patchId: proposal.patchId,
      targetFile: proposal.targetFile,
      diff,
      affectedSelectors: [proposal.targetLocator.expression],
      patchScope: {
        linesChanged,
        filesAffected: 1,
        strategiesModified: [proposal.targetLocator.strategy],
      },
      structuralImpact: {
        astNodeType: proposal.astNodeMetadata.nodeType,
        parentType: proposal.astNodeMetadata.parentType ?? 'unknown',
        expressionType: proposal.astNodeMetadata.expressionType,
        impactLevel,
      },
      renderedDiff,
      renderedSummary,
    };
  }

  private computeImpactLevel(diff: PatchDiff, astMeta: PatchProposal['astNodeMetadata']): 'minimal' | 'moderate' | 'significant' {
    if (diff.addedLines + diff.removedLines <= 1) return 'minimal';
    if (diff.addedLines + diff.removedLines <= 3) return 'moderate';
    return 'significant';
  }

  private renderUnifiedDiff(diff: PatchDiff, filePath: string): string {
    const lines: string[] = [];
    lines.push(`--- a/${filePath}`);
    lines.push(`+++ b/${filePath}`);
    lines.push(diff.unifiedDiff);
    return lines.join('\n');
  }

  private renderSummary(proposal: PatchProposal, diff: PatchDiff): string {
    const lines: string[] = [];
    lines.push(`File: ${proposal.targetFile}`);
    lines.push(`Line: ${proposal.astNodeMetadata.startLine + 1}`);
    lines.push(`Strategy: ${proposal.targetLocator.strategy}`);
    lines.push(`Lines changed: ${diff.addedLines} added, ${diff.removedLines} removed`);
    lines.push('');
    lines.push('Before:');
    lines.push(diff.beforeSnippet);
    lines.push('');
    lines.push('After:');
    lines.push(diff.afterSnippet);
    return lines.join('\n');
  }
}
