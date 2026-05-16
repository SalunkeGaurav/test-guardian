/**
 * Architecture Auditor
 *
 * Detects architecture problems:
 * - oversized orchestrators
 * - duplicated report generation
 * - overlapping persistence logic
 * - unstable dependency chains
 * - excessive model fragmentation
 * - orchestration inflation
 * - weak module boundaries
 *
 * No Date.now(). No Math.random(). Deterministic only.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ArchitecturalHotspot, ArchitecturalHotspotsReport } from './types.js';

let auditCounter = 0;
function nextAuditId(): string {
  auditCounter++;
  return `arch-audit-${auditCounter}`;
}

export class ArchitectureAuditor {
  audit(projectRoot: string): ArchitecturalHotspotsReport {
    const reportId = nextAuditId();
    const hotspots: ArchitecturalHotspot[] = [];

    hotspots.push(...this.detectOversizedOrchestrators(projectRoot));
    hotspots.push(...this.detectDuplicatedReports(projectRoot));
    hotspots.push(...this.detectOverlappingPersistence(projectRoot));
    hotspots.push(...this.detectUnstableDependencies(projectRoot));
    hotspots.push(...this.detectModelFragmentation(projectRoot));
    hotspots.push(...this.detectOrchestrationInflation(projectRoot));
    hotspots.push(...this.detectWeakBoundaries(projectRoot));

    const criticalHotspots = hotspots.filter((h) => h.severity === 'critical').length;

    return {
      reportId,
      hotspots: hotspots.sort((a, b) => a.hotspot.localeCompare(b.hotspot)),
      totalHotspots: hotspots.length,
      criticalHotspots,
      generatedAt: 0,
    };
  }

  private detectOversizedOrchestrators(projectRoot: string): ArchitecturalHotspot[] {
    const hotspots: ArchitecturalHotspot[] = [];
    const coreDir = join(projectRoot, 'src', 'core');

    if (!existsSync(coreDir)) return hotspots;

    const modules = readdirSync(coreDir).filter((d) => {
      const fullPath = join(coreDir, d);
      return existsSync(fullPath) && readdirSync(fullPath).some((f) => f.endsWith('.ts'));
    });

    for (const module of modules) {
      const moduleDir = join(coreDir, module);
      const files = readdirSync(moduleDir).filter((f) => f.endsWith('.ts'));
      const totalLines = files.reduce((sum, f) => {
        const content = readFileSync(join(moduleDir, f), 'utf-8');
        return sum + content.split('\n').length;
      }, 0);

      if (totalLines > 500) {
        hotspots.push({
          hotspot: `${module} (${totalLines} lines)`,
          type: 'oversized-orchestrator',
          affectedModules: [module],
          severity: totalLines > 1000 ? 'critical' : 'high',
          description: `Module ${module} has ${totalLines} lines across ${files.length} files`,
          recommendation: `Consider splitting ${module} into smaller focused modules`,
        });
      }
    }

    return hotspots;
  }

  private detectDuplicatedReports(projectRoot: string): ArchitecturalHotspot[] {
    const hotspots: ArchitecturalHotspot[] = [];
    const coreDir = join(projectRoot, 'src', 'core');

    if (!existsSync(coreDir)) return hotspots;

    const reportPatterns = ['Report', 'Summary', 'Result', 'Inventory'];
    const modulesWithReports: Map<string, string[]> = new Map();

    const modules = readdirSync(coreDir).filter((d) => {
      const fullPath = join(coreDir, d);
      return existsSync(fullPath);
    });

    for (const module of modules) {
      const moduleDir = join(coreDir, module);
      const files = readdirSync(moduleDir).filter((f) => f.endsWith('.ts'));

      for (const file of files) {
        const content = readFileSync(join(moduleDir, file), 'utf-8');
        for (const pattern of reportPatterns) {
          const matches = content.match(new RegExp(`interface\\s+\\w*${pattern}\\w*`, 'g'));
          if (matches && matches.length > 0) {
            const existing = modulesWithReports.get(pattern) ?? [];
            existing.push(`${module}/${file}`);
            modulesWithReports.set(pattern, existing);
          }
        }
      }
    }

    for (const [pattern, modules] of modulesWithReports) {
      if (modules.length > 3) {
        hotspots.push({
          hotspot: `Duplicated ${pattern} schemas`,
          type: 'duplicated-reports',
          affectedModules: [...new Set(modules)].sort(),
          severity: modules.length > 5 ? 'high' : 'medium',
          description: `${pattern} schema appears in ${modules.length} modules`,
          recommendation: `Consolidate ${pattern} schemas into shared types module`,
        });
      }
    }

    return hotspots;
  }

  private detectOverlappingPersistence(projectRoot: string): ArchitecturalHotspot[] {
    const hotspots: ArchitecturalHotspot[] = [];
    const coreDir = join(projectRoot, 'src', 'core');

    if (!existsSync(coreDir)) return hotspots;

    const modules = readdirSync(coreDir).filter((d) => {
      const fullPath = join(coreDir, d);
      return existsSync(fullPath);
    });

    const modulesWithPersistence: string[] = [];

    for (const module of modules) {
      const moduleDir = join(coreDir, module);
      const files = readdirSync(moduleDir).filter((f) => f.endsWith('.ts'));

      for (const file of files) {
        const content = readFileSync(join(moduleDir, file), 'utf-8');
        if (content.includes('writeFileSync') || content.includes('mkdirSync') || content.includes('existsSync')) {
          modulesWithPersistence.push(module);
          break;
        }
      }
    }

    if (modulesWithPersistence.length > 5) {
      hotspots.push({
        hotspot: `Overlapping persistence logic (${modulesWithPersistence.length} modules)`,
        type: 'overlapping-persistence',
        affectedModules: [...new Set(modulesWithPersistence)].sort(),
        severity: 'high',
        description: `${modulesWithPersistence.length} modules have their own persistence logic`,
        recommendation: 'Centralize persistence into shared storage utilities',
      });
    }

    return hotspots;
  }

  private detectUnstableDependencies(projectRoot: string): ArchitecturalHotspot[] {
    const hotspots: ArchitecturalHotspot[] = [];
    const coreDir = join(projectRoot, 'src', 'core');

    if (!existsSync(coreDir)) return hotspots;

    const modules = readdirSync(coreDir).filter((d) => {
      const fullPath = join(coreDir, d);
      return existsSync(fullPath);
    });

    for (const module of modules) {
      const moduleDir = join(coreDir, module);
      const files = readdirSync(moduleDir).filter((f) => f.endsWith('.ts'));

      for (const file of files) {
        const content = readFileSync(join(moduleDir, file), 'utf-8');
        const importMatches = content.match(/from\s+['"]\.\.\/([^'"]+)['"]/g);
        if (importMatches) {
          const importedModules = importMatches.map((m) => m.match(/from\s+['"]\.\.\/([^'"]+)['"]/)?.[1]).filter(Boolean);
          if (importedModules.length > 5) {
            hotspots.push({
              hotspot: `${module}/${file} imports ${importedModules.length} external modules`,
              type: 'unstable-dependency',
              affectedModules: [module, ...importedModules.sort()],
              severity: importedModules.length > 10 ? 'high' : 'medium',
              description: `File ${file} has ${importedModules.length} cross-module imports`,
              recommendation: `Reduce dependencies in ${module}/${file}`,
            });
          }
        }
      }
    }

    return hotspots;
  }

  private detectModelFragmentation(projectRoot: string): ArchitecturalHotspot[] {
    const hotspots: ArchitecturalHotspot[] = [];
    const modelsDir = join(projectRoot, 'src', 'models');

    if (!existsSync(modelsDir)) return hotspots;

    const modelFiles = readdirSync(modelsDir).filter((f) => f.endsWith('.ts'));
    const totalInterfaces = modelFiles.reduce((sum, f) => {
      const content = readFileSync(join(modelsDir, f), 'utf-8');
      const matches = content.match(/interface\s+\w+/g);
      return sum + (matches?.length ?? 0);
    }, 0);

    if (modelFiles.length > 15 || totalInterfaces > 50) {
      hotspots.push({
        hotspot: `Model fragmentation (${modelFiles.length} files, ${totalInterfaces} interfaces)`,
        type: 'model-fragmentation',
        affectedModules: ['models'],
        severity: modelFiles.length > 20 ? 'high' : 'medium',
        description: `${modelFiles.length} model files with ${totalInterfaces} interfaces`,
        recommendation: 'Consolidate related models into fewer files',
      });
    }

    return hotspots;
  }

  private detectOrchestrationInflation(projectRoot: string): ArchitecturalHotspot[] {
    const hotspots: ArchitecturalHotspot[] = [];
    const coreDir = join(projectRoot, 'src', 'core');

    if (!existsSync(coreDir)) return hotspots;

    const modules = readdirSync(coreDir).filter((d) => {
      const fullPath = join(coreDir, d);
      return existsSync(fullPath);
    });

    const orchestratorModules: string[] = [];

    for (const module of modules) {
      const moduleDir = join(coreDir, module);
      const files = readdirSync(moduleDir).filter((f) => f.endsWith('.ts'));

      for (const file of files) {
        const content = readFileSync(join(moduleDir, file), 'utf-8');
        if (content.includes('orchestrat') || content.includes('Orchestrator') || content.includes('orchestrat')) {
          orchestratorModules.push(module);
          break;
        }
      }
    }

    if (orchestratorModules.length > 3) {
      hotspots.push({
        hotspot: `Orchestration inflation (${orchestratorModules.length} orchestrator modules)`,
        type: 'orchestration-inflation',
        affectedModules: [...new Set(orchestratorModules)].sort(),
        severity: orchestratorModules.length > 5 ? 'high' : 'medium',
        description: `${orchestratorModules.length} modules contain orchestration logic`,
        recommendation: 'Consolidate orchestration into unified runtime',
      });
    }

    return hotspots;
  }

  private detectWeakBoundaries(projectRoot: string): ArchitecturalHotspot[] {
    const hotspots: ArchitecturalHotspot[] = [];
    const coreDir = join(projectRoot, 'src', 'core');

    if (!existsSync(coreDir)) return hotspots;

    const modules = readdirSync(coreDir).filter((d) => {
      const fullPath = join(coreDir, d);
      return existsSync(fullPath);
    });

    for (const module of modules) {
      const moduleDir = join(coreDir, module);
      const indexFile = join(moduleDir, 'index.ts');

      if (existsSync(indexFile)) {
        const content = readFileSync(indexFile, 'utf-8');
        const exportCount = (content.match(/export/g) ?? []).length;

        if (exportCount > 15) {
          hotspots.push({
            hotspot: `${module} exports ${exportCount} items`,
            type: 'weak-boundary',
            affectedModules: [module],
            severity: exportCount > 25 ? 'high' : 'medium',
            description: `Module ${module} has ${exportCount} public exports`,
            recommendation: `Reduce public API surface of ${module}`,
          });
        }
      }
    }

    return hotspots;
  }
}
