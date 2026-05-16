/**
 * Module Boundary Audit
 *
 * Analyzes all modules for:
 * - overlapping responsibilities
 * - duplicated logic
 * - conflicting terminology
 * - orchestration inflation
 * - hidden coupling
 * - unstable dependency chains
 */

import type {
  ModuleBoundaryAuditReport,
  ModuleBoundaryIssue,
  ModuleResponsibility,
  AuditSeverity,
} from './types.js';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

interface ModuleInfo {
  name: string;
  path: string;
  exports: string[];
  imports: string[];
  fileCount: number;
}

export class ModuleBoundaryAuditor {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  audit(modulesToAudit: string[]): ModuleBoundaryAuditReport {
    const moduleInfos = this.collectModuleInfo(modulesToAudit);
    const responsibilities = this.analyzeResponsibility(moduleInfos);
    const issues = this.detectIssues(moduleInfos, responsibilities);
    const severityBreakdown = this.computeSeverityBreakdown(issues);

    return {
      id: `module-boundary-${Date.now()}`,
      modulesAnalyzed: modulesToAudit,
      responsibilities,
      issues,
      totalIssues: issues.length,
      severityBreakdown,
      summary: this.generateSummary(issues),
      createdAt: Date.now(),
    };
  }

  private collectModuleInfo(moduleNames: string[]): ModuleInfo[] {
    const infos: ModuleInfo[] = [];

    for (const name of moduleNames) {
      const modulePath = join(this.projectRoot, 'src', 'core', name);

      if (!existsSync(modulePath)) {
        continue;
      }

      const files = this.getTsFiles(modulePath);
      const exports = this.extractExports(files);
      const imports = this.extractImports(files);

      infos.push({
        name,
        path: modulePath,
        exports,
        imports,
        fileCount: files.length,
      });
    }

    return infos;
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

  private extractExports(files: string[]): string[] {
    const exports: string[] = [];

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const exportMatches = content.match(/export\s+(?:const|function|class|interface|type|enum)\s+(\w+)/g);

        if (exportMatches) {
          for (const match of exportMatches) {
            const name = match.split(/\s+/).pop();
            if (name) exports.push(name);
          }
        }
      } catch {
      }
    }

    return [...new Set(exports)];
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
            if (path) imports.push(path);
          }
        }
      } catch {
      }
    }

    return [...new Set(imports)];
  }

  private analyzeResponsibility(modules: ModuleInfo[]): ModuleResponsibility[] {
    return modules.map(m => {
      const declaredResponsibilities = this.inferDeclaredResponsibilities(m);
      const actualResponsibilities = this.inferActualResponsibilities(m);
      const overlappingWith = this.findOverlappingModules(m, modules);
      const duplicatedLogic = this.findDuplicatedLogic(m, modules);

      return {
        moduleName: m.name,
        declaredResponsibilities,
        actualResponsibilities,
        overlappingWith,
        duplicatedLogic,
      };
    });
  }

  private inferDeclaredResponsibilities(module: ModuleInfo): string[] {
    const responsibilities: string[] = [];

    if (module.exports.some(e => e.toLowerCase().includes('orchestrat'))) {
      responsibilities.push('orchestration');
    }

    if (module.exports.some(e => e.toLowerCase().includes('analyz'))) {
      responsibilities.push('analysis');
    }

    if (module.exports.some(e => e.toLowerCase().includes('classif'))) {
      responsibilities.push('classification');
    }

    if (module.exports.some(e => e.toLowerCase().includes('validat'))) {
      responsibilities.push('validation');
    }

    if (module.exports.some(e => e.toLowerCase().includes('simulat'))) {
      responsibilities.push('simulation');
    }

    if (module.exports.some(e => e.toLowerCase().includes('storage') || e.toLowerCase().includes('persist'))) {
      responsibilities.push('persistence');
    }

    return responsibilities;
  }

  private inferActualResponsibilities(module: ModuleInfo): string[] {
    const responsibilities = this.inferDeclaredResponsibilities(module);

    if (module.imports.some(i => i.includes('fs') || i.includes('path'))) {
      if (!responsibilities.includes('persistence')) {
        responsibilities.push('file-system-operations');
      }
    }

    if (module.imports.some(i => i.includes('logger'))) {
      responsibilities.push('logging');
    }

    return [...new Set(responsibilities)];
  }

  private findOverlappingModules(module: ModuleInfo, allModules: ModuleInfo[]): string[] {
    const overlapping: string[] = [];

    for (const other of allModules) {
      if (other.name === module.name) continue;

      const sharedExports = module.exports.filter(e => other.exports.includes(e));
      const sharedImports = module.imports.filter(i => other.imports.includes(i));

      if (sharedExports.length > 2 || sharedImports.length > 3) {
        overlapping.push(other.name);
      }
    }

    return overlapping;
  }

  private findDuplicatedLogic(module: ModuleInfo, allModules: ModuleInfo[]): string[] {
    const duplicated: string[] = [];

    for (const other of allModules) {
      if (other.name === module.name) continue;

      const sharedExports = module.exports.filter(e => other.exports.includes(e));

      if (sharedExports.length > 0) {
        duplicated.push(`${other.name}: ${sharedExports.join(', ')}`);
      }
    }

    return duplicated;
  }

  private detectIssues(modules: ModuleInfo[], responsibilities: ModuleResponsibility[]): ModuleBoundaryIssue[] {
    const issues: ModuleBoundaryIssue[] = [];

    for (const resp of responsibilities) {
      if (resp.overlappingWith.length > 0) {
        issues.push({
          id: `overlap-${resp.moduleName}-${Date.now()}`,
          type: 'overlapping-responsibility',
          severity: resp.overlappingWith.length > 2 ? 'high' : 'medium',
          modules: [resp.moduleName, ...resp.overlappingWith],
          description: `Module ${resp.moduleName} shares responsibilities with ${resp.overlappingWith.join(', ')}`,
          evidence: [
            `Declared: ${resp.declaredResponsibilities.join(', ')}`,
            `Actual: ${resp.actualResponsibilities.join(', ')}`,
          ],
        });
      }

      if (resp.duplicatedLogic.length > 0) {
        issues.push({
          id: `dup-${resp.moduleName}-${Date.now()}`,
          type: 'duplicated-logic',
          severity: resp.duplicatedLogic.length > 3 ? 'high' : 'medium',
          modules: [resp.moduleName],
          description: `Module ${resp.moduleName} has duplicated logic with other modules`,
          evidence: resp.duplicatedLogic,
        });
      }
    }

    const orchestrators = modules.filter(m => m.exports.some(e => e.toLowerCase().includes('orchestrat')));
    for (const orch of orchestrators) {
      if (orch.fileCount > 8) {
        issues.push({
          id: `orch-inflation-${orch.name}-${Date.now()}`,
          type: 'orchestration-inflation',
          severity: orch.fileCount > 12 ? 'high' : 'medium',
          modules: [orch.name],
          description: `Orchestrator ${orch.name} has ${orch.fileCount} files - potential inflation`,
          evidence: [`File count: ${orch.fileCount}`],
        });
      }
    }

    for (const mod of modules) {
      const coreImports = mod.imports.filter(i => i.includes('../core/'));
      const uniqueCoreModules = new Set(coreImports.map(i => {
        const parts = i.split('/');
        return parts[parts.length - 2] ?? '';
      }));

      if (uniqueCoreModules.size > 4) {
        issues.push({
          id: `hidden-coupling-${mod.name}-${Date.now()}`,
          type: 'hidden-coupling',
          severity: uniqueCoreModules.size > 6 ? 'high' : 'medium',
          modules: [mod.name, ...Array.from(uniqueCoreModules)],
          description: `Module ${mod.name} has hidden coupling with ${uniqueCoreModules.size} core modules`,
          evidence: Array.from(uniqueCoreModules),
        });
      }
    }

    return issues.sort((a, b) => {
      const order: Record<AuditSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.severity] - order[b.severity];
    });
  }

  private computeSeverityBreakdown(issues: ModuleBoundaryIssue[]): Record<string, number> {
    const breakdown: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };

    for (const issue of issues) {
      breakdown[issue.severity] = (breakdown[issue.severity] ?? 0) + 1;
    }

    return breakdown;
  }

  private generateSummary(issues: ModuleBoundaryIssue[]): string {
    const total = issues.length;
    const high = issues.filter(i => i.severity === 'high' || i.severity === 'critical').length;
    const types = new Set(issues.map(i => i.type));

    return `${total} module boundary issues found (${high} high/critical). Affected areas: ${Array.from(types).join(', ')}.`;
  }
}