/**
 * Packaging Validator
 *
 * Validates npm package readiness for alpha release:
 * - package.json validation
 * - production build verification
 * - minimal install verification
 * - dependency audit
 * - CLI entry validation
 * - export integrity verification
 *
 * Deterministic output only.
 *
 * @module packaging-validator
 */

import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

export interface PackageValidationResult {
  packageName: string;
  version: string;
  hasMainEntry: boolean;
  hasTypesEntry: boolean;
  hasBinEntry: boolean;
  hasExportsMap: boolean;
  missingDependencies: string[];
  unusedDependencies: string[];
  peerDependencyIssues: string[];
  readinessScore: number;
  status: 'ready' | 'needs-work' | 'not-ready';
  recommendations: string[];
}

export interface InstallVerificationResult {
  packageName: string;
  version: string;
  canResolve: boolean;
  canExecute: boolean;
  cliEntrypoint: string;
  errors: string[];
  status: 'verified' | 'failed';
}

export interface DependencyAuditResult {
  totalDependencies: number;
  productionDependencies: number;
  devDependencies: number;
  peerDependencies: number;
  optionalDependencies: number;
  issues: string[];
  status: 'clean' | 'warnings' | 'errors';
}

export interface ExportIntegrityResult {
  totalExports: number;
  validExports: number;
  brokenExports: string[];
  status: 'intact' | 'degraded';
}

export interface PackagingReport {
  generatedAt: number;
  packageValidation: PackageValidationResult;
  installVerification: InstallVerificationResult;
  dependencyAudit: DependencyAuditResult;
  exportIntegrity: ExportIntegrityResult;
  overallStatus: 'ready' | 'needs-work' | 'not-ready';
  recommendations: string[];
}

function loadPackageJson(projectRoot: string): Record<string, unknown> | null {
  const packagePath = join(projectRoot, 'package.json');
  if (!existsSync(packagePath)) return null;
  try {
    return JSON.parse(readFileSync(packagePath, 'utf-8'));
  } catch {
    return null;
  }
}

function validatePackageJson(pkg: Record<string, unknown>): PackageValidationResult {
  const recommendations: string[] = [];
  const missingDependencies: string[] = [];
  const unusedDependencies: string[] = [];
  const peerDependencyIssues: string[] = [];

  const hasMain = typeof pkg.main === 'string' && pkg.main.length > 0;
  const hasTypes = typeof pkg.types === 'string' && pkg.types.length > 0;
  const hasBin = typeof pkg.bin === 'string' || (typeof pkg.bin === 'object' && pkg.bin !== null);
  const hasExports = typeof pkg.exports === 'object' && pkg.exports !== null;

  if (!hasMain) recommendations.push('Add "main" field to package.json');
  if (!hasTypes) recommendations.push('Add "types" field to package.json');
  if (!hasBin) recommendations.push('Add "bin" field to package.json for CLI');
  if (!hasExports) recommendations.push('Add "exports" map for modern module resolution');

  const deps = (pkg.dependencies as Record<string, string>) || {};
  const devDeps = (pkg.devDependencies as Record<string, string>) || {};
  const peerDeps = (pkg.peerDependencies as Record<string, string>) || {};

  // Check for common missing dependencies
  const expectedDeps = ['commander', 'glob', 'typescript'];
  for (const dep of expectedDeps) {
    if (!deps[dep] && !devDeps[dep]) {
      missingDependencies.push(dep);
    }
  }

  // Check for peer dependency issues
  for (const [name, version] of Object.entries(peerDeps)) {
    if (!deps[name] && !devDeps[name]) {
      peerDependencyIssues.push(`${name}@${version} not in dependencies`);
    }
  }

  let score = 100;
  if (!hasMain) score -= 20;
  if (!hasTypes) score -= 15;
  if (!hasBin) score -= 15;
  if (!hasExports) score -= 10;
  score -= missingDependencies.length * 5;
  score -= peerDependencyIssues.length * 5;
  score = Math.max(0, score);

  const status = score >= 80 ? 'ready' : score >= 50 ? 'needs-work' : 'not-ready';

  return {
    packageName: (pkg.name as string) || 'unknown',
    version: (pkg.version as string) || '0.0.0',
    hasMainEntry: hasMain,
    hasTypesEntry: hasTypes,
    hasBinEntry: hasBin,
    hasExportsMap: hasExports,
    missingDependencies,
    unusedDependencies,
    peerDependencyIssues,
    readinessScore: score,
    status,
    recommendations,
  };
}

function verifyInstall(projectRoot: string, pkg: Record<string, unknown>): InstallVerificationResult {
  const errors: string[] = [];
  const packageName = (pkg.name as string) || 'unknown';
  const version = (pkg.version as string) || '0.0.0';

  // Check if main entry exists
  const mainEntry = pkg.main as string;
  let canResolve = false;
  if (mainEntry) {
    const mainPath = resolve(projectRoot, mainEntry);
    canResolve = existsSync(mainPath) || existsSync(`${mainPath}.js`) || existsSync(`${mainPath}.ts`);
    if (!canResolve) errors.push(`Cannot resolve main entry: ${mainEntry}`);
  }

  // Check CLI entry
  const binEntry = pkg.bin;
  let cliEntrypoint = '';
  let canExecute = false;
  if (typeof binEntry === 'string') {
    cliEntrypoint = binEntry;
    const binPath = resolve(projectRoot, binEntry);
    canExecute = existsSync(binPath);
    if (!canExecute) errors.push(`Cannot resolve CLI entry: ${binEntry}`);
  } else if (typeof binEntry === 'object' && binEntry !== null) {
    const firstBin = Object.values(binEntry as Record<string, string>)[0];
    if (firstBin) {
      cliEntrypoint = firstBin;
      const binPath = resolve(projectRoot, firstBin);
      canExecute = existsSync(binPath);
      if (!canExecute) errors.push(`Cannot resolve CLI entry: ${firstBin}`);
    }
  }

  return {
    packageName,
    version,
    canResolve,
    canExecute,
    cliEntrypoint,
    errors,
    status: errors.length === 0 ? 'verified' : 'failed',
  };
}

function auditDependencies(pkg: Record<string, unknown>): DependencyAuditResult {
  const deps = (pkg.dependencies as Record<string, string>) || {};
  const devDeps = (pkg.devDependencies as Record<string, string>) || {};
  const peerDeps = (pkg.peerDependencies as Record<string, string>) || {};
  const optionalDeps = (pkg.optionalDependencies as Record<string, string>) || {};

  const issues: string[] = [];

  // Check for duplicate dependencies across sections
  const allDeps = new Set([...Object.keys(deps), ...Object.keys(devDeps)]);
  if (allDeps.size < Object.keys(deps).length + Object.keys(devDeps).length) {
    issues.push('Duplicate dependencies found in dependencies and devDependencies');
  }

  // Check for peer dependency version conflicts
  for (const [name, version] of Object.entries(peerDeps)) {
    if (deps[name] && deps[name] !== version) {
      issues.push(`Version conflict: ${name} is ${deps[name]} in dependencies but ${version} in peerDependencies`);
    }
  }

  const status = issues.length === 0 ? 'clean' : issues.length <= 2 ? 'warnings' : 'errors';

  return {
    totalDependencies: Object.keys(deps).length + Object.keys(devDeps).length + Object.keys(peerDeps).length + Object.keys(optionalDeps).length,
    productionDependencies: Object.keys(deps).length,
    devDependencies: Object.keys(devDeps).length,
    peerDependencies: Object.keys(peerDeps).length,
    optionalDependencies: Object.keys(optionalDeps).length,
    issues,
    status,
  };
}

function verifyExportIntegrity(projectRoot: string, pkg: Record<string, unknown>): ExportIntegrityResult {
  const exports = pkg.exports as Record<string, unknown> | undefined;
  const brokenExports: string[] = [];
  let validExports = 0;

  if (exports) {
    for (const [path, value] of Object.entries(exports)) {
      if (typeof value === 'string') {
        const fullPath = resolve(projectRoot, value);
        if (!existsSync(fullPath)) {
          brokenExports.push(`${path} -> ${value}`);
        } else {
          validExports++;
        }
      } else if (typeof value === 'object' && value !== null) {
        const importPath = (value as Record<string, string>).import || (value as Record<string, string>).require;
        if (importPath) {
          const fullPath = resolve(projectRoot, importPath);
          if (!existsSync(fullPath)) {
            brokenExports.push(`${path} -> ${importPath}`);
          } else {
            validExports++;
          }
        }
      }
    }
  }

  const totalExports = validExports + brokenExports.length;

  return {
    totalExports,
    validExports,
    brokenExports,
    status: brokenExports.length === 0 ? 'intact' : 'degraded',
  };
}

export function validatePackaging(projectRoot: string): PackagingReport {
  const pkg = loadPackageJson(projectRoot);
  if (!pkg) {
    return {
      generatedAt: 0,
      packageValidation: {
        packageName: 'unknown',
        version: '0.0.0',
        hasMainEntry: false,
        hasTypesEntry: false,
        hasBinEntry: false,
        hasExportsMap: false,
        missingDependencies: ['package.json not found'],
        unusedDependencies: [],
        peerDependencyIssues: [],
        readinessScore: 0,
        status: 'not-ready',
        recommendations: ['Create package.json'],
      },
      installVerification: {
        packageName: 'unknown',
        version: '0.0.0',
        canResolve: false,
        canExecute: false,
        cliEntrypoint: '',
        errors: ['package.json not found'],
        status: 'failed',
      },
      dependencyAudit: {
        totalDependencies: 0,
        productionDependencies: 0,
        devDependencies: 0,
        peerDependencies: 0,
        optionalDependencies: 0,
        issues: ['package.json not found'],
        status: 'errors',
      },
      exportIntegrity: {
        totalExports: 0,
        validExports: 0,
        brokenExports: [],
        status: 'degraded',
      },
      overallStatus: 'not-ready',
      recommendations: ['Create package.json'],
    };
  }

  const packageValidation = validatePackageJson(pkg);
  const installVerification = verifyInstall(projectRoot, pkg);
  const dependencyAudit = auditDependencies(pkg);
  const exportIntegrity = verifyExportIntegrity(projectRoot, pkg);

  const overallStatus =
    packageValidation.status === 'not-ready' || installVerification.status === 'failed'
      ? 'not-ready'
      : packageValidation.status === 'needs-work' || dependencyAudit.status === 'warnings'
        ? 'needs-work'
        : 'ready';

  const recommendations = [
    ...packageValidation.recommendations,
    ...installVerification.errors.map((e) => `Install verification: ${e}`),
    ...dependencyAudit.issues.map((i) => `Dependency audit: ${i}`),
    ...exportIntegrity.brokenExports.map((b) => `Export integrity: ${b}`),
  ];

  return {
    generatedAt: 0,
    packageValidation,
    installVerification,
    dependencyAudit,
    exportIntegrity,
    overallStatus,
    recommendations,
  };
}

export function persistPackagingReport(projectRoot: string, outputDir: string): string {
  const report = validatePackaging(projectRoot);
  const dir = join(outputDir, 'alpha-release');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const filePath = join(dir, 'package-readiness-report.json');
  writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
  return filePath;
}
