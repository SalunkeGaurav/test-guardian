/**
 * Simplification Detector
 *
 * Generates deterministic simplification recommendations:
 * - modules that should merge
 * - duplicated report schemas
 * - redundant persistence utilities
 * - orchestration chains that can collapse
 * - unstable public exports
 * - dead abstractions
 * - unnecessary indirection layers
 *
 * No Date.now(). No Math.random(). Deterministic only.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SimplificationOpportunity, SimplificationOpportunitiesReport } from './types.js';

let detectorCounter = 0;
function nextDetectorId(): string {
  detectorCounter++;
  return `simplification-${detectorCounter}`;
}

export class SimplificationDetector {
  detect(projectRoot: string): SimplificationOpportunitiesReport {
    const reportId = nextDetectorId();
    const opportunities: SimplificationOpportunity[] = [];

    opportunities.push(...this.detectMergeableModules(projectRoot));
    opportunities.push(...this.detectDuplicateSchemas(projectRoot));
    opportunities.push(...this.detectRedundantPersistence(projectRoot));
    opportunities.push(...this.detectCollapsibleOrchestration(projectRoot));
    opportunities.push(...this.detectUnstableExports(projectRoot));
    opportunities.push(...this.detectDeadAbstractions(projectRoot));
    opportunities.push(...this.detectUnnecessaryIndirection(projectRoot));

    const highImpactOpportunities = opportunities.filter((o) => o.impact === 'high').length;

    return {
      reportId,
      opportunities: opportunities.sort((a, b) => a.opportunity.localeCompare(b.opportunity)),
      totalOpportunities: opportunities.length,
      highImpactOpportunities,
      generatedAt: 0,
    };
  }

  private detectMergeableModules(projectRoot: string): SimplificationOpportunity[] {
    const opportunities: SimplificationOpportunity[] = [];
    const coreDir = join(projectRoot, 'src', 'core');

    if (!existsSync(coreDir)) return opportunities;

    const modules = readdirSync(coreDir).filter((d) => {
      const fullPath = join(coreDir, d);
      return existsSync(fullPath);
    });

    // Find modules with similar names or purposes
    const moduleGroups = new Map<string, string[]>();

    for (const module of modules) {
      const prefix = module.split('-')[0];
      const existing = moduleGroups.get(prefix) ?? [];
      existing.push(module);
      moduleGroups.set(prefix, existing);
    }

    for (const [prefix, group] of moduleGroups) {
      if (group.length > 2) {
        opportunities.push({
          opportunity: `Merge ${prefix}-* modules`,
          type: 'merge-modules',
          affectedModules: group.sort(),
          impact: 'high',
          description: `${group.length} modules share the ${prefix} prefix`,
          recommendation: `Consider consolidating ${group.join(', ')} into a single module`,
        });
      }
    }

    return opportunities;
  }

  private detectDuplicateSchemas(projectRoot: string): SimplificationOpportunity[] {
    const opportunities: SimplificationOpportunity[] = [];
    const coreDir = join(projectRoot, 'src', 'core');

    if (!existsSync(coreDir)) return opportunities;

    const modules = readdirSync(coreDir).filter((d) => {
      const fullPath = join(coreDir, d);
      return existsSync(fullPath);
    });

    const schemaMap = new Map<string, string[]>();

    for (const module of modules) {
      const moduleDir = join(coreDir, module);
      const files = readdirSync(moduleDir).filter((f) => f.endsWith('.ts'));

      for (const file of files) {
        const content = readFileSync(join(moduleDir, file), 'utf-8');
        const interfaceMatches = content.match(/interface\s+(\w+)/g);
        if (interfaceMatches) {
          for (const match of interfaceMatches) {
            const name = match.replace('interface ', '');
            const existing = schemaMap.get(name) ?? [];
            existing.push(`${module}/${file}`);
            schemaMap.set(name, existing);
          }
        }
      }
    }

    for (const [name, locations] of schemaMap) {
      if (locations.length > 1) {
        opportunities.push({
          opportunity: `Duplicate schema: ${name}`,
          type: 'duplicate-schemas',
          affectedModules: [...new Set(locations)].sort(),
          impact: locations.length > 2 ? 'high' : 'medium',
          description: `Interface ${name} is defined in ${locations.length} locations`,
          recommendation: `Consolidate ${name} into a shared types module`,
        });
      }
    }

    return opportunities;
  }

  private detectRedundantPersistence(projectRoot: string): SimplificationOpportunity[] {
    const opportunities: SimplificationOpportunity[] = [];
    const coreDir = join(projectRoot, 'src', 'core');

    if (!existsSync(coreDir)) return opportunities;

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
        if (content.includes('writeFileSync') || content.includes('mkdirSync')) {
          modulesWithPersistence.push(module);
          break;
        }
      }
    }

    if (modulesWithPersistence.length > 3) {
      opportunities.push({
        opportunity: 'Redundant persistence utilities',
        type: 'redundant-persistence',
        affectedModules: [...new Set(modulesWithPersistence)].sort(),
        impact: 'high',
        description: `${modulesWithPersistence.length} modules have their own persistence logic`,
        recommendation: 'Centralize persistence into src/core/storage utilities',
      });
    }

    return opportunities;
  }

  private detectCollapsibleOrchestration(projectRoot: string): SimplificationOpportunity[] {
    const opportunities: SimplificationOpportunity[] = [];
    const coreDir = join(projectRoot, 'src', 'core');

    if (!existsSync(coreDir)) return opportunities;

    const modules = readdirSync(coreDir).filter((d) => {
      const fullPath = join(coreDir, d);
      return existsSync(fullPath);
    });

    const orchestratorChains: string[] = [];

    for (const module of modules) {
      const moduleDir = join(coreDir, module);
      const files = readdirSync(moduleDir).filter((f) => f.endsWith('.ts'));

      for (const file of files) {
        const content = readFileSync(join(moduleDir, file), 'utf-8');
        const importCount = (content.match(/import.*from.*core/g) ?? []).length;
        if (importCount > 3) {
          orchestratorChains.push(`${module}/${file}`);
        }
      }
    }

    if (orchestratorChains.length > 2) {
      opportunities.push({
        opportunity: 'Collapsible orchestration chains',
        type: 'collapse-orchestration',
        affectedModules: orchestratorChains.sort(),
        impact: 'high',
        description: `${orchestratorChains.length} files have complex import chains`,
        recommendation: 'Simplify orchestration by reducing cross-module dependencies',
      });
    }

    return opportunities;
  }

  private detectUnstableExports(projectRoot: string): SimplificationOpportunity[] {
    const opportunities: SimplificationOpportunity[] = [];
    const coreDir = join(projectRoot, 'src', 'core');

    if (!existsSync(coreDir)) return opportunities;

    const modules = readdirSync(coreDir).filter((d) => {
      const fullPath = join(coreDir, d);
      return existsSync(fullPath);
    });

    for (const module of modules) {
      const moduleDir = join(coreDir, module);
      const indexFile = join(moduleDir, 'index.ts');

      if (existsSync(indexFile)) {
        const content = readFileSync(indexFile, 'utf-8');
        const internalExports = (content.match(/export.*[Ii]nternal/g) ?? []).length;
        const privateExports = (content.match(/export.*_/g) ?? []).length;

        if (internalExports > 0 || privateExports > 0) {
          opportunities.push({
            opportunity: `Unstable exports in ${module}`,
            type: 'unstable-exports',
            affectedModules: [module],
            impact: 'medium',
            description: `${module} exports ${internalExports + privateExports} internal/private items`,
            recommendation: `Remove internal/private exports from ${module}/index.ts`,
          });
        }
      }
    }

    return opportunities;
  }

  private detectDeadAbstractions(projectRoot: string): SimplificationOpportunity[] {
    const opportunities: SimplificationOpportunity[] = [];
    const coreDir = join(projectRoot, 'src', 'core');

    if (!existsSync(coreDir)) return opportunities;

    const modules = readdirSync(coreDir).filter((d) => {
      const fullPath = join(coreDir, d);
      return existsSync(fullPath);
    });

    for (const module of modules) {
      const moduleDir = join(coreDir, module);
      const files = readdirSync(moduleDir).filter((f) => f.endsWith('.ts'));

      for (const file of files) {
        const content = readFileSync(join(moduleDir, file), 'utf-8');
        const abstractClasses = (content.match(/abstract class/g) ?? []).length;
        const unusedInterfaces = (content.match(/interface\s+\w+.*\{\s*\}/g) ?? []).length;

        if (abstractClasses > 2 || unusedInterfaces > 3) {
          opportunities.push({
            opportunity: `Dead abstractions in ${module}/${file}`,
            type: 'dead-abstraction',
            affectedModules: [module],
            impact: 'medium',
            description: `${file} has ${abstractClasses} abstract classes and ${unusedInterfaces} empty interfaces`,
            recommendation: `Remove unused abstractions from ${module}/${file}`,
          });
        }
      }
    }

    return opportunities;
  }

  private detectUnnecessaryIndirection(projectRoot: string): SimplificationOpportunity[] {
    const opportunities: SimplificationOpportunity[] = [];
    const coreDir = join(projectRoot, 'src', 'core');

    if (!existsSync(coreDir)) return opportunities;

    const modules = readdirSync(coreDir).filter((d) => {
      const fullPath = join(coreDir, d);
      return existsSync(fullPath);
    });

    for (const module of modules) {
      const moduleDir = join(coreDir, module);
      const files = readdirSync(moduleDir).filter((f) => f.endsWith('.ts'));

      for (const file of files) {
        const content = readFileSync(join(moduleDir, file), 'utf-8');
        const wrapperFunctions = (content.match(/function\s+\w+.*\{.*return\s+\w+\(/g) ?? []).length;
        const proxyClasses = (content.match(/class\s+\w+.*extends\s+\w+/g) ?? []).length;

        if (wrapperFunctions > 5 || proxyClasses > 3) {
          opportunities.push({
            opportunity: `Unnecessary indirection in ${module}/${file}`,
            type: 'unnecessary-indirection',
            affectedModules: [module],
            impact: 'medium',
            description: `${file} has ${wrapperFunctions} wrapper functions and ${proxyClasses} proxy classes`,
            recommendation: `Simplify indirection in ${module}/${file}`,
          });
        }
      }
    }

    return opportunities;
  }
}
