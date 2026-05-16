/**
 * Semantic Consistency Audit
 *
 * Verifies consistency of terminology across modules:
 * - confidence terminology
 * - governance terminology
 * - risk classification semantics
 * - replay terminology
 * - healing status definitions
 * - mutation classification labels
 *
 * Detects:
 * - duplicated concepts with different names
 * - same names with different meanings
 * - inconsistent threshold semantics
 */

import type {
  SemanticConsistencyReport,
  SemanticInconsistency,
  TermDefinition,
  AuditSeverity,
} from './types.js';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

interface TermOccurrence {
  term: string;
  module: string;
  context: string;
  definition: string;
  type: 'type' | 'constant' | 'function' | 'interface' | 'enum';
}

export class SemanticConsistencyAuditor {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  audit(modulesToAudit: string[]): SemanticConsistencyReport {
    const occurrences = this.collectTermOccurrences(modulesToAudit);
    const terms = this.buildTermDefinitions(occurrences);
    const inconsistencies = this.detectInconsistencies(occurrences, terms);
    const severityBreakdown = this.computeSeverityBreakdown(inconsistencies);

    return {
      id: `semantic-consistency-${Date.now()}`,
      termsAnalyzed: terms.length,
      terms,
      inconsistencies,
      totalInconsistencies: inconsistencies.length,
      severityBreakdown,
      summary: this.generateSummary(inconsistencies),
      createdAt: Date.now(),
    };
  }

  private collectTermOccurrences(modules: string[]): TermOccurrence[] {
    const occurrences: TermOccurrence[] = [];

    for (const moduleName of modules) {
      const modulePath = join(this.projectRoot, 'src', 'core', moduleName);

      if (!existsSync(modulePath)) continue;

      const files = this.getTsFiles(modulePath);

      for (const file of files) {
        try {
          const content = readFileSync(file, 'utf-8');
          const fileOccurrences = this.extractTerms(content, moduleName);
          occurrences.push(...fileOccurrences);
        } catch {
        }
      }
    }

    return occurrences;
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

  private extractTerms(content: string, module: string): TermOccurrence[] {
    const occurrences: TermOccurrence[] = [];

    const typeMatches = content.match(/export\s+type\s+(\w+)\s*=/g);
    if (typeMatches) {
      for (const match of typeMatches) {
        const name = match.match(/type\s+(\w+)/)?.[1];
        if (name) {
          occurrences.push({
            term: name,
            module,
            context: 'type definition',
            definition: match,
            type: 'type',
          });
        }
      }
    }

    const interfaceMatches = content.match(/export\s+interface\s+(\w+)/g);
    if (interfaceMatches) {
      for (const match of interfaceMatches) {
        const name = match.match(/interface\s+(\w+)/)?.[1];
        if (name) {
          occurrences.push({
            term: name,
            module,
            context: 'interface definition',
            definition: match,
            type: 'interface',
          });
        }
      }
    }

    const constMatches = content.match(/export\s+const\s+(\w+)/g);
    if (constMatches) {
      for (const match of constMatches) {
        const name = match.match(/const\s+(\w+)/)?.[1];
        if (name) {
          occurrences.push({
            term: name,
            module,
            context: 'constant definition',
            definition: match,
            type: 'constant',
          });
        }
      }
    }

    return occurrences;
  }

  private buildTermDefinitions(occurrences: TermOccurrence[]): TermDefinition[] {
    const termMap = new Map<string, TermDefinition>();

    for (const occ of occurrences) {
      const existing = termMap.get(occ.term);

      if (existing) {
        if (!existing.modules.includes(occ.module)) {
          existing.modules.push(occ.module);
        }
        existing.usageContext.push(occ.context);
      } else {
        termMap.set(occ.term, {
          term: occ.term,
          module: occ.module,
          modules: [occ.module],
          definition: occ.definition,
          usageContext: [occ.context],
        });
      }
    }

    return Array.from(termMap.values());
  }

  private detectInconsistencies(occurrences: TermOccurrence[], terms: TermDefinition[]): SemanticInconsistency[] {
    const inconsistencies: SemanticInconsistency[] = [];

    const multiModuleTerms = terms.filter(t => t.modules.length > 1);

    for (const term of multiModuleTerms) {
      const definitions = term.modules.map(m => {
        const occ = occurrences.find(o => o.term === term.term && o.module === m);
        return occ?.definition ?? '';
      });

      const uniqueDefinitions = new Set(definitions);

      if (uniqueDefinitions.size > 1) {
        inconsistencies.push({
          id: `same-name-diff-meaning-${term.term}-${Date.now()}`,
          type: 'same-name-different-meaning',
          severity: 'high',
          term: term.term,
          modules: term.modules,
          definitions: Array.from(uniqueDefinitions),
          recommendation: `Standardize definition of "${term.term}" across modules`,
        });
      }
    }

    const confidenceTerms = terms.filter(t =>
      t.term.toLowerCase().includes('confidence') ||
      t.term.toLowerCase().includes('threshold')
    );

    for (const term of confidenceTerms) {
      if (term.modules.length > 1) {
        const thresholdMatches = occurrences.filter(o =>
          o.term.toLowerCase().includes('threshold') &&
          term.modules.includes(o.module)
        );

        if (thresholdMatches.length > 1) {
          inconsistencies.push({
            id: `inconsistent-threshold-${term.term}-${Date.now()}`,
            type: 'inconsistent-threshold',
            severity: 'medium',
            term: term.term,
            modules: term.modules,
            definitions: thresholdMatches.map(t => t.definition),
            recommendation: `Align threshold semantics for "${term.term}"`,
          });
        }
      }
    }

    const statusTerms = terms.filter(t =>
      t.term.toLowerCase().includes('status') ||
      t.term.toLowerCase().includes('state') ||
      t.term.toLowerCase().includes('level')
    );

    for (const term of statusTerms) {
      if (term.modules.length > 1) {
        inconsistencies.push({
          id: `conflicting-status-${term.term}-${Date.now()}`,
          type: 'conflicting-status',
          severity: 'medium',
          term: term.term,
          modules: term.modules,
          definitions: term.modules.map(m => {
            const occ = occurrences.find(o => o.term === term.term && o.module === m);
            return occ?.definition ?? '';
          }),
          recommendation: `Standardize status terminology for "${term.term}"`,
        });
      }
    }

    const conceptGroups = this.findConceptGroups(terms);

    for (const [concept, termsInGroup] of conceptGroups) {
      if (termsInGroup.length > 1) {
        inconsistencies.push({
          id: `dup-concept-${concept}-${Date.now()}`,
          type: 'duplicated-concept-different-name',
          severity: 'medium',
          term: concept,
          modules: termsInGroup.map(t => t.module),
          definitions: termsInGroup.map(t => t.term),
          recommendation: `Consolidate similar concepts: ${termsInGroup.map(t => t.term).join(', ')}`,
        });
      }
    }

    return inconsistencies.sort((a, b) => {
      const order: Record<AuditSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.severity] - order[b.severity];
    });
  }

  private findConceptGroups(terms: TermDefinition[]): Map<string, TermDefinition[]> {
    const groups = new Map<string, TermDefinition[]>();

    const conceptPatterns = [
      { pattern: /risk/i, concept: 'risk-classification' },
      { pattern: /confidence/i, concept: 'confidence-scoring' },
      { pattern: /governance/i, concept: 'governance-evaluation' },
      { pattern: /replay/i, concept: 'replay-validation' },
      { pattern: /healing/i, concept: 'healing-status' },
      { pattern: /mutation/i, concept: 'mutation-classification' },
      { pattern: /stability/i, concept: 'stability-assessment' },
      { pattern: /deceptive/i, concept: 'deception-detection' },
    ];

    for (const term of terms) {
      for (const { pattern, concept } of conceptPatterns) {
        if (pattern.test(term.term)) {
          const group = groups.get(concept) ?? [];
          group.push(term);
          groups.set(concept, group);
        }
      }
    }

    return groups;
  }

  private computeSeverityBreakdown(issues: SemanticInconsistency[]): Record<string, number> {
    const breakdown: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };

    for (const issue of issues) {
      breakdown[issue.severity] = (breakdown[issue.severity] ?? 0) + 1;
    }

    return breakdown;
  }

  private generateSummary(issues: SemanticInconsistency[]): string {
    const total = issues.length;
    const high = issues.filter(i => i.severity === 'high' || i.severity === 'critical').length;
    const types = new Set(issues.map(i => i.type));

    return `${total} semantic inconsistencies found (${high} high/critical). Types: ${Array.from(types).join(', ')}.`;
  }
}