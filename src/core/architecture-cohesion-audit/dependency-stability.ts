/**
 * Dependency Stability Audit
 *
 * Analyzes:
 * - circular dependency risk
 * - orchestration overreach
 * - unstable imports
 * - module fan-out growth
 * - dependency hotspots
 */

import type {
  DependencyStabilityReport,
  DependencyIssue,
  ModuleDependency,
  AuditSeverity,
} from './types.js';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export class DependencyStabilityAuditor {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  audit(modulesToAudit: string[]): DependencyStabilityReport {
    const dependencies = this.analyzeDependencies(modulesToAudit);
    const issues = this.detectIssues(dependencies, modulesToAudit);
    const hotspots = this.findHotspots(dependencies);
    const severityBreakdown = this.computeSeverityBreakdown(issues);

    return {
      id: `dependency-stability-${Date.now()}`,
      modulesAnalyzed: dependencies,
      issues,
      totalIssues: issues.length,
      severityBreakdown,
      hotspots,
      summary: this.generateSummary(issues, hotspots),
      createdAt: Date.now(),
    };
  }

  private analyzeDependencies(modules: string[]): ModuleDependency[] {
    const deps: ModuleDependency[] = [];

    for (const moduleName of modules) {
      const modulePath = join(this.projectRoot, 'src', 'core', moduleName);

      if (!existsSync(modulePath)) continue;

      const files = this.getTsFiles(modulePath);
      const imports = this.extractImports(files);
      const fanOut = imports.length;

      deps.push({
        moduleName,
        imports,
        importedBy: [],
        fanOut,
        fanIn: 0,
      });
    }

    for (const dep of deps) {
      for (const other of deps) {
        if (other.moduleName === dep.moduleName) continue;

        const otherPath = join(this.projectRoot, 'src', 'core', other.moduleName);
        const otherFiles = this.getTsFiles(otherPath);
        const otherImports = this.extractImports(otherFiles);

        if (otherImports.some(i => i.includes(dep.moduleName))) {
          dep.importedBy.push(other.moduleName);
        }
      }

      dep.fanIn = dep.importedBy.length;
    }

    return deps;
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

  private extractImports(files: string[]): string[] {
    const imports: string[] = [];

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const importMatches = content.match(/from\s+['"]([^'"]+)['"]/g);

        if (importMatches) {
          for (const match of importMatches) {
            const path = match.match(/['"]([^'"]+)['"]/)?.[1];
            if (path && path.startsWith('../')) {
              imports.push(path);
            }
          }
        }
      } catch {
      }
    }

    return [...new Set(imports)];
  }

  private detectIssues(dependencies: ModuleDependency[], modules: string[]): DependencyIssue[] {
    const issues: DependencyIssue[] = [];

    for (const dep of dependencies) {
      if (dep.fanOut > 8) {
        issues.push({
          id: `fan-out-${dep.moduleName}-${Date.now()}`,
          type: 'fan-out-growth',
          severity: dep.fanOut > 12 ? 'high' : 'medium',
          modules: [dep.moduleName],
          description: `Module ${dep.moduleName} has high fan-out (${dep.fanOut} imports)`,
          evidence: dep.imports.slice(0, 5),
        });
      }

      if (dep.fanIn > 4) {
        issues.push({
          id: `hotspot-${dep.moduleName}-${Date.now()}`,
          type: 'dependency-hotspot',
          severity: dep.fanIn > 6 ? 'high' : 'medium',
          modules: [dep.moduleName, ...dep.importedBy],
          description: `Module ${dep.moduleName} is a dependency hotspot (imported by ${dep.fanIn} modules)`,
          evidence: dep.importedBy,
        });
      }
    }

    for (let i = 0; i < dependencies.length; i++) {
      for (let j = i + 1; j < dependencies.length; j++) {
        const a = dependencies[i];
        const b = dependencies[j];
        if (!a || !b) continue;

        const aImportsB = a.imports.some(imp => imp.includes(b.moduleName));
        const bImportsA = b.imports.some(imp => imp.includes(a.moduleName));

        if (aImportsB && bImportsA) {
          issues.push({
            id: `circular-${a.moduleName}-${b.moduleName}-${Date.now()}`,
            type: 'circular-dependency-risk',
            severity: 'high',
            modules: [a.moduleName, b.moduleName],
            description: `Circular dependency between ${a.moduleName} and ${b.moduleName}`,
            evidence: [`${a.moduleName} -> ${b.moduleName}`, `${b.moduleName} -> ${a.moduleName}`],
          });
        }
      }
    }

    const orchestrators = dependencies.filter(d => d.moduleName.includes('orchestrat'));
    for (const orch of orchestrators) {
      if (orch.fanOut > 6) {
        issues.push({
          id: `orch-overreach-${orch.moduleName}-${Date.now()}`,
          type: 'orchestration-overreach',
          severity: orch.fanOut > 10 ? 'high' : 'medium',
          modules: [orch.moduleName],
          description: `Orchestrator ${orch.moduleName} has excessive dependencies (${orch.fanOut})`,
          evidence: orch.imports.slice(0, 5),
        });
      }
    }

    return issues.sort((a, b) => {
      const order: Record<AuditSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.severity] - order[b.severity];
    });
  }

  private findHotspots(dependencies: ModuleDependency[]): string[] {
    return dependencies
      .filter(d => d.fanIn > 3)
      .sort((a, b) => b.fanIn - a.fanIn)
      .map(d => `${d.moduleName} (${d.fanIn} dependents)`);
  }

  private computeSeverityBreakdown(issues: DependencyIssue[]): Record<string, number> {
    const breakdown: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };

    for (const issue of issues) {
      breakdown[issue.severity] = (breakdown[issue.severity] ?? 0) + 1;
    }

    return breakdown;
  }

  private generateSummary(issues: DependencyIssue[], hotspots: string[]): string {
    const total = issues.length;
    const high = issues.filter(i => i.severity === 'high' || i.severity === 'critical').length;
    const circular = issues.filter(i => i.type === 'circular-dependency-risk').length;

    return `${total} dependency issues found (${high} high/critical, ${circular} circular). Hotspots: ${hotspots.length}.`;
  }
}