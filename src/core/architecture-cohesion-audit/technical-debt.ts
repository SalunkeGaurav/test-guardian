/**
 * Technical Debt Inventory
 *
 * Generates deterministic inventory of:
 * - dead abstractions
 * - duplicated utilities
 * - oversized orchestrators
 * - unstable interfaces
 * - weak type contracts
 * - fragile coupling zones
 *
 * Classified by: low-risk, medium-risk, high-risk
 */

import type {
  TechnicalDebtInventoryReport,
  TechnicalDebtItem,
  DebtRiskLevel,
} from './types.js';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export class TechnicalDebtInventoryGenerator {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  generate(modulesToAudit: string[]): TechnicalDebtInventoryReport {
    const items: TechnicalDebtItem[] = [];

    for (const moduleName of modulesToAudit) {
      const modulePath = join(this.projectRoot, 'src', 'core', moduleName);

      if (!existsSync(modulePath)) continue;

      const files = this.getTsFiles(modulePath);
      items.push(...this.detectDeadAbstractions(files, moduleName));
      items.push(...this.detectDuplicatedUtilities(files, moduleName));
      items.push(...this.detectOversizedOrchestrators(files, moduleName));
      items.push(...this.detectUnstableInterfaces(files, moduleName));
      items.push(...this.detectWeakTypeContracts(files, moduleName));
      items.push(...this.detectFragileCoupling(files, moduleName));
    }

    const riskBreakdown = this.computeRiskBreakdown(items);
    const categoryBreakdown = this.computeCategoryBreakdown(items);

    return {
      id: `technical-debt-${Date.now()}`,
      totalItems: items.length,
      items,
      riskBreakdown,
      categoryBreakdown,
      summary: this.generateSummary(items),
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

  private detectDeadAbstractions(files: string[], module: string): TechnicalDebtItem[] {
    const items: TechnicalDebtItem[] = [];

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (!line) continue;

          if (line.includes('export interface') || line.includes('export type')) {
            const nameMatch = line.match(/(?:interface|type)\s+(\w+)/);
            if (nameMatch) {
              const name = nameMatch[1];
              if (!name) continue;
              const isUsed = this.isTypeUsed(content, name);

              if (!isUsed) {
                items.push({
                  id: `dead-abstraction-${module}-${name}`,
                  type: 'dead-abstraction',
                  riskLevel: 'low-risk',
                  location: `${file}:${i + 1}`,
                  description: `Type "${name}" is exported but not used within module`,
                  impact: 'Increases maintenance burden and API surface',
                  recommendation: `Remove unused type "${name}" or document its intended use`,
                  evidence: [`Defined at line ${i + 1}`],
                });
              }
            }
          }
        }
      } catch {
      }
    }

    return items;
  }

  private isTypeUsed(content: string, typeName: string): boolean {
    const usagePattern = new RegExp(`\\b${typeName}\\b`, 'g');
    const matches = content.match(usagePattern);
    return matches !== null && matches.length > 1;
  }

  private detectDuplicatedUtilities(files: string[], module: string): TechnicalDebtItem[] {
    const items: TechnicalDebtItem[] = [];
    const utilityFunctions = new Map<string, string[]>();

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const funcMatches = content.match(/export\s+(?:function|const)\s+(\w+)\s*[=(]/g);

        if (funcMatches) {
          for (const match of funcMatches) {
            const nameMatch = match.match(/(\w+)\s*[=(]/);
            if (nameMatch) {
              const name = nameMatch[1];
              if (!name) continue;
              const existing = utilityFunctions.get(name) ?? [];
              existing.push(file);
              utilityFunctions.set(name, existing);
            }
          }
        }
      } catch {
      }
    }

    for (const [name, locations] of utilityFunctions.entries()) {
      if (locations.length > 1) {
        items.push({
          id: `dup-utility-${module}-${name}`,
          type: 'duplicated-utility',
          riskLevel: 'medium-risk',
          location: locations.join(', '),
          description: `Utility "${name}" defined in ${locations.length} files`,
          impact: 'Code duplication increases maintenance cost and bug risk',
          recommendation: `Extract "${name}" to a shared utility module`,
          evidence: locations,
        });
      }
    }

    return items;
  }

  private detectOversizedOrchestrators(files: string[], module: string): TechnicalDebtItem[] {
    const items: TechnicalDebtItem[] = [];

    if (!module.toLowerCase().includes('orchestrat')) return items;

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const lineCount = content.split('\n').length;

        if (lineCount > 300) {
          items.push({
            id: `oversized-orchestrator-${module}-${file}`,
            type: 'oversized-orchestrator',
            riskLevel: lineCount > 500 ? 'high-risk' : 'medium-risk',
            location: file,
            description: `Orchestrator file has ${lineCount} lines`,
            impact: 'Large orchestrators are hard to maintain and test',
            recommendation: 'Split into smaller, focused components',
            evidence: [`Line count: ${lineCount}`],
          });
        }
      } catch {
      }
    }

    return items;
  }

  private detectUnstableInterfaces(files: string[], module: string): TechnicalDebtItem[] {
    const items: TechnicalDebtItem[] = [];

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const interfaceMatches = content.match(/export\s+interface\s+(\w+)\s*\{([^}]+)\}/gs);

        if (interfaceMatches) {
          for (const match of interfaceMatches) {
            const nameMatch = match.match(/interface\s+(\w+)/);
            if (nameMatch) {
              const name = nameMatch[1];
              const optionalFields = (match.match(/\?:/g) ?? []).length;
              const totalFields = (match.match(/\w+\??:/g) ?? []).length;

              if (totalFields > 0 && optionalFields / totalFields > 0.5) {
                items.push({
                  id: `unstable-interface-${module}-${name}`,
                  type: 'unstable-interface',
                  riskLevel: 'medium-risk',
                  location: file,
                  description: `Interface "${name}" has ${optionalFields}/${totalFields} optional fields`,
                  impact: 'High optionality indicates unstable contract',
                  recommendation: `Review if all fields in "${name}" should be optional`,
                  evidence: [`Optional fields: ${optionalFields}, Total: ${totalFields}`],
                });
              }
            }
          }
        }
      } catch {
      }
    }

    return items;
  }

  private detectWeakTypeContracts(files: string[], module: string): TechnicalDebtItem[] {
    const items: TechnicalDebtItem[] = [];

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (!line) continue;

          if (line.includes(': unknown') || line.includes(': any') || line.includes(': Record<string, unknown>')) {
            items.push({
              id: `weak-type-${module}-${file}-${i}`,
              type: 'weak-type-contract',
              riskLevel: 'low-risk',
              location: `${file}:${i + 1}`,
              description: `Uses weak type at line ${i + 1}`,
              impact: 'Weak types reduce compile-time safety',
              recommendation: 'Replace with specific type definition',
              evidence: [line.trim()],
            });
          }
        }
      } catch {
      }
    }

    return items;
  }

  private detectFragileCoupling(files: string[], module: string): TechnicalDebtItem[] {
    const items: TechnicalDebtItem[] = [];
    const importCounts = new Map<string, number>();

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const importMatches = content.match(/from\s+['"]([^'"]+)['"]/g);

        if (importMatches) {
          for (const match of importMatches) {
            const pathMatch = match.match(/['"]([^'"]+)['"]/);
            if (pathMatch) {
              const path = pathMatch[1];
              if (!path) continue;
              const count = importCounts.get(path) ?? 0;
              importCounts.set(path, count + 1);
            }
          }
        }
      } catch {
      }
    }

    for (const [path, count] of importCounts.entries()) {
      if (count > 5 && path.includes('../core/')) {
        items.push({
          id: `fragile-coupling-${module}-${path}`,
          type: 'fragile-coupling',
          riskLevel: count > 10 ? 'high-risk' : 'medium-risk',
          location: module,
          description: `Module imports from "${path}" ${count} times`,
          impact: 'Heavy coupling to internal module structure',
          recommendation: `Consider abstracting imports from "${path}"`,
          evidence: [`Import count: ${count}`],
        });
      }
    }

    return items;
  }

  private computeRiskBreakdown(items: TechnicalDebtItem[]): Record<string, number> {
    const breakdown: Record<string, number> = { 'low-risk': 0, 'medium-risk': 0, 'high-risk': 0 };

    for (const item of items) {
      breakdown[item.riskLevel] = (breakdown[item.riskLevel] ?? 0) + 1;
    }

    return breakdown;
  }

  private computeCategoryBreakdown(items: TechnicalDebtItem[]): Record<string, number> {
    const breakdown: Record<string, number> = {};

    for (const item of items) {
      breakdown[item.type] = (breakdown[item.type] ?? 0) + 1;
    }

    return breakdown;
  }

  private generateSummary(items: TechnicalDebtItem[]): string {
    const total = items.length;
    const high = items.filter(i => i.riskLevel === 'high-risk').length;
    const medium = items.filter(i => i.riskLevel === 'medium-risk').length;

    return `${total} technical debt items found (${high} high-risk, ${medium} medium-risk).`;
  }
}