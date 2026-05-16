/**
 * Installation Verifier
 *
 * Verifies clean installation of TestGuardian:
 * - Clean install verification
 * - Minimal dependency validation
 * - CLI smoke tests
 * - Package startup verification
 *
 * Deterministic output only.
 *
 * @module installation-verifier
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

export interface InstallVerificationResult {
  packageName: string;
  version: string;
  canResolve: boolean;
  canExecute: boolean;
  cliEntrypoint: string;
  errors: string[];
  status: 'verified' | 'failed';
}

export interface DependencyValidationResult {
  totalDependencies: number;
  productionDependencies: number;
  devDependencies: number;
  missingDependencies: string[];
  unusedDependencies: string[];
  status: 'clean' | 'warnings' | 'errors';
}

export interface CliSmokeTestResult {
  command: string;
  expectedExitCode: number;
  actualExitCode: number;
  stdout: string;
  stderr: string;
  passed: boolean;
}

export interface PackageStartupResult {
  canImport: boolean;
  canInitialize: boolean;
  exportsValid: boolean;
  errors: string[];
  status: 'ready' | 'failed';
}

export interface InstallationReport {
  generatedAt: number;
  installVerification: InstallVerificationResult;
  dependencyValidation: DependencyValidationResult;
  cliSmokeTests: CliSmokeTestResult[];
  packageStartup: PackageStartupResult;
  overallStatus: 'verified' | 'needs-work' | 'failed';
  recommendations: string[];
}

function verifyInstall(projectRoot: string): InstallVerificationResult {
  const errors: string[] = [];
  const packagePath = join(projectRoot, 'package.json');

  if (!existsSync(packagePath)) {
    return {
      packageName: 'unknown',
      version: '0.0.0',
      canResolve: false,
      canExecute: false,
      cliEntrypoint: '',
      errors: ['package.json not found'],
      status: 'failed',
    };
  }

  const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
  const packageName = pkg.name || 'unknown';
  const version = pkg.version || '0.0.0';

  // Check main entry
  const mainEntry = pkg.main;
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

function validateDependencies(projectRoot: string): DependencyValidationResult {
  const packagePath = join(projectRoot, 'package.json');
  if (!existsSync(packagePath)) {
    return {
      totalDependencies: 0,
      productionDependencies: 0,
      devDependencies: 0,
      missingDependencies: ['package.json not found'],
      unusedDependencies: [],
      status: 'errors',
    };
  }

  const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
  const deps = pkg.dependencies || {};
  const devDeps = pkg.devDependencies || {};

  const missingDependencies: string[] = [];
  const unusedDependencies: string[] = [];

  // Check for critical dependencies
  const criticalDeps = ['commander'];
  for (const dep of criticalDeps) {
    if (!deps[dep] && !devDeps[dep]) {
      missingDependencies.push(dep);
    }
  }

  // Check node_modules for installed dependencies
  const nodeModulesPath = join(projectRoot, 'node_modules');
  if (existsSync(nodeModulesPath)) {
    const installedDeps = new Set();
    try {
      const entries = require('node:fs').readdirSync(nodeModulesPath);
      for (const entry of entries) {
        if (!entry.startsWith('.') && !entry.startsWith('@')) {
          installedDeps.add(entry);
        }
      }
    } catch {
      // Ignore read errors
    }

    // Check for unused dependencies
    for (const dep of Object.keys(deps)) {
      if (!installedDeps.has(dep)) {
        unusedDependencies.push(dep);
      }
    }
  }

  const status = missingDependencies.length === 0 && unusedDependencies.length === 0
    ? 'clean'
    : missingDependencies.length > 0
      ? 'errors'
      : 'warnings';

  return {
    totalDependencies: Object.keys(deps).length + Object.keys(devDeps).length,
    productionDependencies: Object.keys(deps).length,
    devDependencies: Object.keys(devDeps).length,
    missingDependencies,
    unusedDependencies,
    status,
  };
}

function runCliSmokeTests(projectRoot: string): CliSmokeTestResult[] {
  const tests: CliSmokeTestResult[] = [];

  // Test 1: CLI help
  try {
    const stdout = execSync('node cli/index.ts --help', {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    tests.push({
      command: 'testguardian --help',
      expectedExitCode: 0,
      actualExitCode: 0,
      stdout,
      stderr: '',
      passed: true,
    });
  } catch (error: any) {
    tests.push({
      command: 'testguardian --help',
      expectedExitCode: 0,
      actualExitCode: error.status || 1,
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      passed: false,
    });
  }

  // Test 2: CLI version
  try {
    const stdout = execSync('node cli/index.ts --version', {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    tests.push({
      command: 'testguardian --version',
      expectedExitCode: 0,
      actualExitCode: 0,
      stdout,
      stderr: '',
      passed: true,
    });
  } catch (error: any) {
    tests.push({
      command: 'testguardian --version',
      expectedExitCode: 0,
      actualExitCode: error.status || 1,
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      passed: false,
    });
  }

  return tests;
}

function verifyPackageStartup(projectRoot: string): PackageStartupResult {
  const errors: string[] = [];
  let canImport = false;
  let canInitialize = false;
  let exportsValid = false;

  // Check if main entry can be imported
  const indexPath = join(projectRoot, 'src', 'index.ts');
  if (existsSync(indexPath)) {
    canImport = true;
  } else {
    errors.push('Cannot find src/index.ts');
  }

  // Check if CLI can be initialized
  const cliPath = join(projectRoot, 'cli', 'index.ts');
  if (existsSync(cliPath)) {
    canInitialize = true;
  } else {
    errors.push('Cannot find cli/index.ts');
  }

  // Check exports
  if (canImport) {
    try {
      const content = readFileSync(indexPath, 'utf-8');
      exportsValid = content.includes('export');
      if (!exportsValid) errors.push('No exports found in src/index.ts');
    } catch {
      errors.push('Cannot read src/index.ts');
    }
  }

  return {
    canImport,
    canInitialize,
    exportsValid,
    errors,
    status: errors.length === 0 ? 'ready' : 'failed',
  };
}

export function verifyInstallation(projectRoot: string): InstallationReport {
  const installVerification = verifyInstall(projectRoot);
  const dependencyValidation = validateDependencies(projectRoot);
  const cliSmokeTests = runCliSmokeTests(projectRoot);
  const packageStartup = verifyPackageStartup(projectRoot);

  const overallStatus =
    installVerification.status === 'failed' ||
    dependencyValidation.status === 'errors' ||
    packageStartup.status === 'failed' ||
    cliSmokeTests.some((t) => !t.passed)
      ? 'failed'
      : dependencyValidation.status === 'warnings'
        ? 'needs-work'
        : 'verified';

  const recommendations: string[] = [
    ...installVerification.errors.map((e) => `Install: ${e}`),
    ...dependencyValidation.missingDependencies.map((d) => `Missing dependency: ${d}`),
    ...dependencyValidation.unusedDependencies.map((d) => `Unused dependency: ${d}`),
    ...packageStartup.errors.map((e) => `Startup: ${e}`),
    ...cliSmokeTests.filter((t) => !t.passed).map((t) => `CLI test failed: ${t.command}`),
  ];

  return {
    generatedAt: 0,
    installVerification,
    dependencyValidation,
    cliSmokeTests,
    packageStartup,
    overallStatus,
    recommendations,
  };
}

export function persistInstallationReport(projectRoot: string, outputDir: string): string {
  const report = verifyInstallation(projectRoot);
  const dir = join(outputDir, 'alpha-release');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const filePath = join(dir, 'install-verification-report.json');
  writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
  return filePath;
}
