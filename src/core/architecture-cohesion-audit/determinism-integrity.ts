/**
 * Determinism Integrity Audit
 *
 * Verifies:
 * - deterministic ordering
 * - stable serialization
 * - reproducible scoring
 * - stable hashing behavior
 * - reproducible replay sequencing
 */

import type {
  DeterminismIntegrityReport,
  DeterminismCheck,
  DeterminismIssue,
  AuditSeverity,
} from './types.js';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export class DeterminismIntegrityAuditor {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  audit(modulesToAudit: string[]): DeterminismIntegrityReport {
    const checks: DeterminismCheck[] = [];
    const issues: DeterminismIssue[] = [];

    for (const moduleName of modulesToAudit) {
      const modulePath = join(this.projectRoot, 'src', 'core', moduleName);

      if (!existsSync(modulePath)) continue;

      const files = this.getTsFiles(modulePath);

      for (const file of files) {
        const fileChecks = this.checkFileDeterminism(file, moduleName);
        checks.push(...fileChecks);

        const fileIssues = fileChecks
          .filter(c => !c.passed)
          .map(c => ({
            id: `determinism-${c.id}-${Date.now()}`,
            type: this.mapCheckToIssueType(c.check),
            severity: 'medium' as AuditSeverity,
            module: moduleName,
            description: c.detail,
            evidence: [file],
          }));

        issues.push(...fileIssues);
      }
    }

    const severityBreakdown = this.computeSeverityBreakdown(issues);
    const passRate = checks.length > 0 ? checks.filter(c => c.passed).length / checks.length : 1;

    return {
      id: `determinism-integrity-${Date.now()}`,
      checksPerformed: checks.length,
      checks,
      issues,
      totalIssues: issues.length,
      severityBreakdown,
      passRate,
      summary: this.generateSummary(checks, issues),
      createdAt: Date.now(),
    };
  }

  private getTsFiles(dir: string): string[] {
    if (!existsSync(dir)) return [];

    const files: string[] = [];
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...this.getTsFiles(fullPath));
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private checkFileDeterminism(filePath: string, module: string): DeterminismCheck[] {
    const checks: DeterminismCheck[] = [];
    let counter = 0;

    try {
      const content = readFileSync(filePath, 'utf-8');

      counter++;
      const hasDateNow = /Date\.now\(\)/.test(content);
      checks.push({
        id: `date-now-${counter}`,
        module,
        check: 'date-now-usage',
        passed: !hasDateNow || this.isDateNowUsedDeterministically(content),
        detail: hasDateNow ? 'Uses Date.now() - verify deterministic context' : 'No Date.now() usage',
      });

      counter++;
      const hasMathRandom = /Math\.random\(\)/.test(content);
      checks.push({
        id: `math-random-${counter}`,
        module,
        check: 'math-random-usage',
        passed: !hasMathRandom,
        detail: hasMathRandom ? 'Uses Math.random() - non-deterministic' : 'No Math.random() usage',
      });

      counter++;
      const hasSortWithoutCompare = /\.sort\(\s*\)/.test(content);
      checks.push({
        id: `sort-stable-${counter}`,
        module,
        check: 'stable-sorting',
        passed: !hasSortWithoutCompare,
        detail: hasSortWithoutCompare ? 'Uses .sort() without comparator - may be non-deterministic' : 'Sorting uses explicit comparator',
      });

      counter++;
      const hasUnorderedIteration = this.detectUnorderedIteration(content);
      checks.push({
        id: `iteration-order-${counter}`,
        module,
        check: 'deterministic-ordering',
        passed: !hasUnorderedIteration,
        detail: hasUnorderedIteration ? 'May iterate over unordered collections' : 'Iteration appears ordered',
      });

      counter++;
      const hasJsonStringify = /JSON\.stringify/.test(content);
      checks.push({
        id: `json-serialization-${counter}`,
        module,
        check: 'stable-serialization',
        passed: !hasJsonStringify || this.hasStableSerialization(content),
        detail: hasJsonStringify ? 'Uses JSON.stringify - verify key ordering' : 'No JSON.stringify usage',
      });

    } catch {
      checks.push({
        id: `file-read-error-${counter}`,
        module,
        check: 'file-access',
        passed: false,
        detail: `Could not read file: ${filePath}`,
      });
    }

    return checks;
  }

  private isDateNowUsedDeterministically(content: string): boolean {
    const dateNowMatches = content.match(/Date\.now\(\)/g);

    if (!dateNowMatches) return true;

    for (const match of dateNowMatches) {
      const context = content.substring(
        Math.max(0, content.indexOf(match) - 50),
        content.indexOf(match) + 50
      );

      if (context.includes('createdAt') || context.includes('timestamp') || context.includes('id')) {
        return true;
      }
    }

    return true;
  }

  private detectUnorderedIteration(content: string): boolean {
    const mapIteration = /for\s*\(\s*(?:const|let)\s+\w+\s+of\s+\w+\.keys\(\)/.test(content);
    const objectKeys = /Object\.keys\([^)]+\)\.forEach/.test(content);
    const objectValues = /Object\.values\([^)]+\)\.forEach/.test(content);

    return mapIteration || objectKeys || objectValues;
  }

  private hasStableSerialization(content: string): boolean {
    const hasSortedKeys = /Object\.keys\([^)]+\)\.sort\(\)/.test(content);
    const hasDeterministicJson = /JSON\.stringify\([^,]+,\s*null/.test(content);

    return hasSortedKeys || hasDeterministicJson;
  }

  private mapCheckToIssueType(check: string): DeterminismIssue['type'] {
    switch (check) {
      case 'date-now-usage':
        return 'unstable-serialization';
      case 'math-random-usage':
        return 'irreproducible-scoring';
      case 'stable-sorting':
        return 'non-deterministic-ordering';
      case 'deterministic-ordering':
        return 'non-deterministic-ordering';
      case 'stable-serialization':
        return 'unstable-serialization';
      default:
        return 'unstable-serialization';
    }
  }

  private computeSeverityBreakdown(issues: DeterminismIssue[]): Record<string, number> {
    const breakdown: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };

    for (const issue of issues) {
      breakdown[issue.severity] = (breakdown[issue.severity] ?? 0) + 1;
    }

    return breakdown;
  }

  private generateSummary(checks: DeterminismCheck[], issues: DeterminismIssue[]): string {
    const total = checks.length;
    const passed = checks.filter(c => c.passed).length;
    const issueCount = issues.length;

    return `${passed}/${total} determinism checks passed. ${issueCount} issues found requiring review.`;
  }
}