/**
 * Package Readiness
 *
 * Validates npm packaging readiness, detects missing exports,
 * detects broken CLI wiring, detects invalid dependency boundaries,
 * and verifies tsconfig/package consistency.
 *
 * No Date.now(). No Math.random(). Deterministic only.
 */

import type { PackagingReadinessSummary } from './types.js';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

let packageCounter = 0;
function nextPackageId(): string {
  packageCounter++;
  return `package-readiness-${packageCounter}`;
}

export class PackageReadiness {
  audit(projectRoot: string): PackagingReadinessSummary {
    const reportId = nextPackageId();

    const missingExports = this.detectMissingExports(projectRoot);
    const brokenCLIWiring = this.detectBrokenCLIWiring(projectRoot);
    const invalidDependencyBoundaries = this.detectInvalidDependencyBoundaries(projectRoot);
    const tsconfigPackageConsistent = this.verifyTsconfigPackageConsistency(projectRoot);
    const issues = [...missingExports, ...brokenCLIWiring, ...invalidDependencyBoundaries];

    if (!tsconfigPackageConsistent) {
      issues.push('tsconfig.json and package.json are inconsistent');
    }

    const packagingReady = issues.length === 0;

    return {
      reportId,
      missingExports,
      brokenCLIWiring,
      invalidDependencyBoundaries,
      tsconfigPackageConsistent,
      packagingReady,
      issues,
      generatedAt: 0,
    };
  }

  private detectMissingExports(projectRoot: string): string[] {
    const issues: string[] = [];

    const indexPath = join(projectRoot, 'src', 'index.ts');
    if (!existsSync(indexPath)) {
      issues.push('Missing src/index.ts entry point');
      return issues;
    }

    const indexContent = readFileSync(indexPath, 'utf-8');

    const expectedExports = [
      'HealingPipeline',
      'ValidationEngine',
      'ConfidenceGovernance',
      'PatchGenerator',
      'AuditPersister',
    ];

    for (const exp of expectedExports) {
      if (!indexContent.includes(exp)) {
        issues.push(`Missing export: ${exp}`);
      }
    }

    return issues;
  }

  private detectBrokenCLIWiring(projectRoot: string): string[] {
    const issues: string[] = [];

    const cliIndexPath = join(projectRoot, 'cli', 'index.ts');
    if (!existsSync(cliIndexPath)) {
      issues.push('Missing cli/index.ts entry point');
      return issues;
    }

    const cliContent = readFileSync(cliIndexPath, 'utf-8');

    const expectedCommands = [
      'init',
      'analyze',
      'heal',
      'validate',
      'validate-repo',
      'run',
    ];

    for (const cmd of expectedCommands) {
      if (!cliContent.includes(`'${cmd}'`) && !cliContent.includes(`"${cmd}"`)) {
        issues.push(`Missing CLI command: ${cmd}`);
      }
    }

    return issues;
  }

  private detectInvalidDependencyBoundaries(projectRoot: string): string[] {
    const issues: string[] = [];

    const packageJsonPath = join(projectRoot, 'package.json');
    if (!existsSync(packageJsonPath)) {
      issues.push('Missing package.json');
      return issues;
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    if (!packageJson.main && !packageJson.exports) {
      issues.push('No main or exports field in package.json');
    }

    if (packageJson.dependencies) {
      for (const dep of Object.keys(packageJson.dependencies)) {
        if (dep.startsWith('@testguardian/')) {
          issues.push(`Internal dependency should be in peerDependencies: ${dep}`);
        }
      }
    }

    return issues;
  }

  private verifyTsconfigPackageConsistency(projectRoot: string): boolean {
    const tsconfigPath = join(projectRoot, 'tsconfig.json');
    const packageJsonPath = join(projectRoot, 'package.json');

    if (!existsSync(tsconfigPath) || !existsSync(packageJsonPath)) {
      return false;
    }

    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    if (tsconfig.compilerOptions?.outDir && packageJson.main) {
      const outDir = tsconfig.compilerOptions.outDir;
      const mainPath = packageJson.main;
      if (!mainPath.startsWith(outDir)) {
        return false;
      }
    }

    return true;
  }
}
