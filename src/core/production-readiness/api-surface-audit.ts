/**
 * API Surface Audit
 *
 * Audits public exports, detects unstable internal exports leaking publicly,
 * detects duplicate model exposure, and detects inconsistent naming conventions.
 *
 * No Date.now(). No Math.random(). Deterministic only.
 */

import type { APIExportEntry, APISurfaceAuditReport } from './types.js';

const INTERNAL_PREFIXES = ['_', 'Internal', 'internal'];
const NAMING_PATTERNS: Record<string, RegExp> = {
  class: /^[A-Z][a-zA-Z0-9]*$/,
  function: /^[a-z][a-zA-Z0-9]*$/,
  interface: /^[A-Z][a-zA-Z0-9]*$/,
  type: /^[A-Z][a-zA-Z0-9]*$/,
  const: /^[A-Z_][A-Z0-9_]*$|^[a-z][a-zA-Z0-9]*$/,
  enum: /^[A-Z][a-zA-Z0-9]*$/,
};

let auditCounter = 0;
function nextAuditId(): string {
  auditCounter++;
  return `api-audit-${auditCounter}`;
}

export class APISurfaceAudit {
  audit(exports: APIExportEntry[]): APISurfaceAuditReport {
    const auditId = nextAuditId();

    const publicExports = exports.filter((e) => !e.isInternal);
    const leakedInternals = this.detectLeakedInternals(exports);
    const duplicateExposures = this.detectDuplicates(exports);
    const namingInconsistencies = this.detectNamingInconsistencies(exports);

    return {
      auditId,
      publicExports,
      leakedInternals,
      duplicateExposures,
      namingInconsistencies,
      totalExports: exports.length,
      totalLeaks: leakedInternals.length,
      totalDuplicates: duplicateExposures.length,
      totalInconsistencies: namingInconsistencies.length,
      generatedAt: 0,
    };
  }

  private detectLeakedInternals(exports: APIExportEntry[]): APIExportEntry[] {
    return exports.filter((e) => {
      if (!e.isInternal) return false;
      for (const prefix of INTERNAL_PREFIXES) {
        if (e.name.startsWith(prefix)) return true;
      }
      return false;
    });
  }

  private detectDuplicates(exports: APIExportEntry[]): Array<{ name: string; modules: string[] }> {
    const nameMap = new Map<string, string[]>();
    for (const exp of exports) {
      const existing = nameMap.get(exp.name) ?? [];
      existing.push(exp.module);
      nameMap.set(exp.name, existing);
    }

    const duplicates: Array<{ name: string; modules: string[] }> = [];
    for (const [name, modules] of nameMap) {
      if (modules.length > 1) {
        duplicates.push({ name, modules: [...new Set(modules)].sort() });
      }
    }

    return duplicates.sort((a, b) => a.name.localeCompare(b.name));
  }

  private detectNamingInconsistencies(exports: APIExportEntry[]): Array<{ name: string; expectedPattern: string; actualPattern: string }> {
    const inconsistencies: Array<{ name: string; expectedPattern: string; actualPattern: string }> = [];

    for (const exp of exports) {
      const pattern = NAMING_PATTERNS[exp.type];
      if (pattern && !pattern.test(exp.name)) {
        inconsistencies.push({
          name: exp.name,
          expectedPattern: pattern.source,
          actualPattern: exp.name,
        });
      }
    }

    return inconsistencies.sort((a, b) => a.name.localeCompare(b.name));
  }
}
