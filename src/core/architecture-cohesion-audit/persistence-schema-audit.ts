/**
 * Persistence Schema Audit
 *
 * Inspects .testguardian directory structure for:
 * - redundant report structures
 * - duplicate persistence formats
 * - inconsistent metadata fields
 * - unstable schema patterns
 * - storage fragmentation
 */

import type {
  PersistenceCohesionReport,
  PersistenceSchemaIssue,
  PersistenceDirectory,
  AuditSeverity,
} from './types.js';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export class PersistenceSchemaAuditor {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  audit(): PersistenceCohesionReport {
    const tgDir = join(this.projectRoot, '.testguardian');

    if (!existsSync(tgDir)) {
      return this.createEmptyReport();
    }

    const directories = this.analyzeDirectories(tgDir);
    const issues = this.detectIssues(directories);
    const fragmentationScore = this.computeFragmentationScore(directories, issues);
    const severityBreakdown = this.computeSeverityBreakdown(issues);

    return {
      id: `persistence-cohesion-${Date.now()}`,
      directoriesAnalyzed: directories,
      issues,
      totalIssues: issues.length,
      severityBreakdown,
      fragmentationScore,
      summary: this.generateSummary(issues, fragmentationScore),
      createdAt: Date.now(),
    };
  }

  private analyzeDirectories(tgDir: string): PersistenceDirectory[] {
    const directories: PersistenceDirectory[] = [];
    const entries = readdirSync(tgDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const dirPath = join(tgDir, entry.name);
      const files = this.getFilesRecursive(dirPath);
      const schemas = this.extractSchemas(files);
      const namingConvention = this.detectNamingConvention(files);

      directories.push({
        path: entry.name,
        fileCount: files.length,
        schemas,
        namingConvention,
      });
    }

    return directories;
  }

  private getFilesRecursive(dir: string): string[] {
    if (!existsSync(dir)) return [];

    const files: string[] = [];
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...this.getFilesRecursive(fullPath));
      } else if (entry.name.endsWith('.json')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private extractSchemas(files: string[]): string[] {
    const schemas: string[] = [];

    for (const file of files.slice(0, 5)) {
      try {
        const content = readFileSync(file, 'utf-8');
        const parsed = JSON.parse(content);

        if (typeof parsed === 'object' && parsed !== null) {
          const keys = Object.keys(parsed).sort();
          schemas.push(keys.join(','));
        }
      } catch {
      }
    }

    return [...new Set(schemas)];
  }

  private detectNamingConvention(files: string[]): string {
    if (files.length === 0) return 'none';

    const prefixes: Record<string, number> = {};
    const extensions: Record<string, number> = {};

    for (const file of files) {
      const basename = file.split('/').pop() ?? '';
      const prefix = basename.split('-')[0] ?? '';
      const ext = basename.split('.').pop() ?? '';

      prefixes[prefix] = (prefixes[prefix] ?? 0) + 1;
      extensions[ext] = (extensions[ext] ?? 0) + 1;
    }

    const dominantPrefix = Object.entries(prefixes).sort((a, b) => b[1] - a[1])[0];
    return dominantPrefix ? dominantPrefix[0] : 'mixed';
  }

  private detectIssues(directories: PersistenceDirectory[]): PersistenceSchemaIssue[] {
    const issues: PersistenceSchemaIssue[] = [];

    const schemaMap = new Map<string, string[]>();

    for (const dir of directories) {
      for (const schema of dir.schemas) {
        const existing = schemaMap.get(schema) ?? [];
        existing.push(dir.path);
        schemaMap.set(schema, existing);
      }
    }

    for (const [schema, paths] of schemaMap.entries()) {
      if (paths.length > 1) {
        issues.push({
          id: `redundant-schema-${Date.now()}`,
          type: 'redundant-structure',
          severity: 'medium',
          paths,
          description: `Same schema structure found in ${paths.length} directories`,
          evidence: [`Schema fields: ${schema.substring(0, 100)}...`],
        });
      }
    }

    const metadataFields = new Map<string, Set<string>>();

    for (const dir of directories) {
      const dirPath = join(this.projectRoot, '.testguardian', dir.path);
      const files = this.getFilesRecursive(dirPath);

      for (const file of files.slice(0, 3)) {
        try {
          const content = readFileSync(file, 'utf-8');
          const parsed = JSON.parse(content);

          if (typeof parsed === 'object' && parsed !== null) {
            const metaFields = ['id', 'createdAt', 'timestamp', 'generatedAt', 'schemaVersion'];
            const foundMeta = metaFields.filter(f => f in parsed);

            for (const field of foundMeta) {
              if (!metadataFields.has(field)) {
                metadataFields.set(field, new Set());
              }
              metadataFields.get(field)!.add(dir.path);
            }
          }
        } catch {
        }
      }
    }

    for (const [field, dirs] of metadataFields.entries()) {
      if (dirs.size > 1) {
        const dirArray = Array.from(dirs);
        issues.push({
          id: `inconsistent-meta-${field}-${Date.now()}`,
          type: 'inconsistent-metadata',
          severity: 'low',
          paths: dirArray,
          description: `Metadata field "${field}" used inconsistently across ${dirArray.length} directories`,
          evidence: [`Directories: ${dirArray.join(', ')}`],
        });
      }
    }

    const namingViolations = directories.filter(d => d.namingConvention === 'mixed' && d.fileCount > 2);
    for (const dir of namingViolations) {
      issues.push({
        id: `naming-violation-${dir.path}-${Date.now()}`,
        type: 'naming-violation',
        severity: 'low',
        paths: [dir.path],
        description: `Directory ${dir.path} has mixed naming conventions`,
        evidence: [`Naming: ${dir.namingConvention}`],
      });
    }

    return issues.sort((a, b) => {
      const order: Record<AuditSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.severity] - order[b.severity];
    });
  }

  private computeFragmentationScore(directories: PersistenceDirectory[], issues: PersistenceSchemaIssue[]): number {
    if (directories.length === 0) return 0;

    const totalFiles = directories.reduce((sum, d) => sum + d.fileCount, 0);
    const emptyDirs = directories.filter(d => d.fileCount === 0).length;
    const issuePenalty = issues.length * 0.05;

    const fragmentation = (emptyDirs / directories.length) + issuePenalty;

    return Math.min(fragmentation, 1);
  }

  private computeSeverityBreakdown(issues: PersistenceSchemaIssue[]): Record<string, number> {
    const breakdown: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };

    for (const issue of issues) {
      breakdown[issue.severity] = (breakdown[issue.severity] ?? 0) + 1;
    }

    return breakdown;
  }

  private generateSummary(issues: PersistenceSchemaIssue[], fragmentationScore: number): string {
    const total = issues.length;
    const high = issues.filter(i => i.severity === 'high' || i.severity === 'critical').length;

    return `${total} persistence schema issues found (${high} high/critical). Fragmentation score: ${(fragmentationScore * 100).toFixed(0)}%.`;
  }

  private createEmptyReport(): PersistenceCohesionReport {
    return {
      id: `persistence-cohesion-${Date.now()}`,
      directoriesAnalyzed: [],
      issues: [],
      totalIssues: 0,
      severityBreakdown: { low: 0, medium: 0, high: 0, critical: 0 },
      fragmentationScore: 0,
      summary: '.testguardian directory not found.',
      createdAt: Date.now(),
    };
  }
}