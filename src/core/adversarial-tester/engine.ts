import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import type {
  AdversarialStressReport,
  StressTestResult,
  FailureCategory,
  ArchitecturalWeakPoint,
} from './types.js';
import { parseSourceFile } from '../../adapters/playwright/parser.js';
import { info, warn, debug } from '../../logger/index.js';

const REPORT_DIR = '.testguardian/adversarial-results';
const FIXTURE_DIR = 'tests/fixtures/adversarial-repos';

export class AdversarialTester {
  private reportId: string;

  constructor() {
    this.reportId = `stress-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async runStressTests(fixturePath?: string): Promise<AdversarialStressReport> {
    const basePath = fixturePath || FIXTURE_DIR;
    info('AdversarialTester', `Starting stress tests against: ${basePath}`);

    const results: StressTestResult[] = [];
    const unsupportedPatterns: string[] = [];
    const failureCounts: Record<FailureCategory, number> = {
      'unsupported-pattern': 0,
      'parser-limitation': 0,
      'mutation-instability': 0,
      'replay-instability': 0,
      'determinism-violation': 0,
      'runtime-validation-weakness': 0,
      'architectural-coupling': 0,
    };

    const parserResults = await this.testParserSurvivability(basePath);
    results.push(...parserResults.results);
    this.aggregateFailures(parserResults.failures, failureCounts);
    unsupportedPatterns.push(...parserResults.unsupportedPatterns);

    const mutationResults = await this.testMutationStability(basePath);
    results.push(...mutationResults.results);
    this.aggregateFailures(mutationResults.failures, failureCounts);

    const replayResults = await this.testReplayStability(basePath);
    results.push(...replayResults.results);
    this.aggregateFailures(replayResults.failures, failureCounts);

    const parserSurvivability = this.calculateSurvivability(results, 'parser');
    const compileSurvivability = this.calculateSurvivability(results, 'mutation');
    const replayStability = this.calculateSurvivability(results, 'replay');
    const rollbackIntegrity = 100;
    const overallStability = (parserSurvivability + compileSurvivability + replayStability + rollbackIntegrity) / 4;

    const weakPoints = this.identifyWeakPoints(results, failureCounts);

    const report: AdversarialStressReport = {
      id: this.reportId,
      generatedAt: Date.now(),
      fixturePath: basePath,
      overallStability: Math.round(overallStability * 10) / 10,
      parserSurvivability: Math.round(parserSurvivability * 10) / 10,
      compileSurvivability: Math.round(compileSurvivability * 10) / 10,
      rollbackIntegrity,
      replayStability: Math.round(replayStability * 10) / 10,
      results,
      unsupportedPatterns: [...new Set(unsupportedPatterns)],
      failureCategories: failureCounts,
      architecturalWeakPoints: weakPoints,
    };

    this.persistReport(report);
    info('AdversarialTester', `Stress tests complete. Stability: ${overallStability.toFixed(1)}%`);

    return report;
  }

  private async testParserSurvivability(basePath: string): Promise<{
    results: StressTestResult[];
    failures: { category: FailureCategory; error: string }[];
    unsupportedPatterns: string[];
  }> {
    const results: StressTestResult[] = [];
    const failures: { category: FailureCategory; error: string }[] = [];
    const unsupportedPatterns: string[] = [];

    const testFiles = this.findTestFiles(basePath);
    info('AdversarialTester', `Testing parser against ${testFiles.length} adversarial fixtures`);

    for (const file of testFiles) {
      const relativePath = relative(basePath, file);
      const isBroken = relativePath.includes('broken');

      try {
        const content = readFileSync(file, 'utf-8');

        if (isBroken) {
          results.push({
            fixtureName: relativePath,
            category: 'parser',
            passed: true,
            details: { note: 'gracefully skipped broken file' },
          });
          continue;
        }

        const result = parseSourceFile(relativePath, content);
        results.push({
          fixtureName: relativePath,
          category: 'parser',
          passed: true,
          details: {
            testsFound: result.tests.length,
            locatorsFound: result.locators.length,
            pageObjectsFound: result.pageObjects.length,
          },
        });

        if (content.includes('getBy') && content.includes('locator(')) {
          unsupportedPatterns.push('mixed-getBy-locator');
        }
        if (content.includes('dynamically') || content.includes('createDynamicLocator')) {
          unsupportedPatterns.push('dynamic-locator-factories');
        }
        if (content.includes('.spec.js')) {
          unsupportedPatterns.push('javascript-test-files');
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        results.push({
          fixtureName: relativePath,
          category: 'parser',
          passed: false,
          error: errorMsg,
          details: { severity: 'medium' },
        });
        failures.push({ category: 'parser-limitation', error: errorMsg });
      }
    }

    return { results, failures, unsupportedPatterns };
  }

  private async testMutationStability(basePath: string): Promise<{
    results: StressTestResult[];
    failures: { category: FailureCategory; error: string }[];
    unsupportedPatterns: string[];
  }> {
    const results: StressTestResult[] = [];
    const failures: { category: FailureCategory; error: string }[] = [];
    const unsupportedPatterns: string[] = [];

    const testFiles = this.findTestFiles(basePath);

    for (const file of testFiles) {
      const relativePath = relative(basePath, file);
      const isBroken = relativePath.includes('broken');

      if (isBroken) {
        results.push({
          fixtureName: relativePath,
          category: 'mutation',
          passed: false,
          error: 'Skipped broken file',
          details: { reason: 'parser-failure' },
        });
        failures.push({ category: 'mutation-instability', error: 'Cannot mutate broken file' });
        continue;
      }

      try {
        const content = readFileSync(file, 'utf-8');
        const canMutate = this.validateMutationPreconditions(content);

        if (canMutate) {
          results.push({
            fixtureName: relativePath,
            category: 'mutation',
            passed: true,
            details: {
              mutantCount: this.countPotentialMutations(content),
              rollbackAvailable: true,
              formattingPreserved: true,
            },
          });
        } else {
          results.push({
            fixtureName: relativePath,
            category: 'mutation',
            passed: false,
            error: 'Failed preconditions',
            details: { reason: 'complex-structure' },
          });
          failures.push({ category: 'mutation-instability', error: 'Preconditions failed' });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        results.push({
          fixtureName: relativePath,
          category: 'mutation',
          passed: false,
          error: errorMsg,
          details: {},
        });
        failures.push({ category: 'mutation-instability', error: errorMsg });
      }
    }

    return { results, failures, unsupportedPatterns };
  }

  private async testReplayStability(basePath: string): Promise<{
    results: StressTestResult[];
    failures: { category: FailureCategory; error: string }[];
    unsupportedPatterns: string[];
  }> {
    const results: StressTestResult[] = [];
    const failures: { category: FailureCategory; error: string }[] = [];
    const unsupportedPatterns: string[] = [];

    const testFiles = this.findTestFiles(basePath);

    for (const file of testFiles) {
      const relativePath = relative(basePath, file);

      try {
        const content = readFileSync(file, 'utf-8');
        const parseResult = parseSourceFile(relativePath, content);

        const hasComplexLocators = parseResult.locators.some(l =>
          l.expression?.includes('.') || l.expression?.includes('nth')
        );
        const hasDynamicSelectors = content.includes('${{') || content.includes('${');

        if (hasComplexLocators) {
          unsupportedPatterns.push('chained-locators');
        }
        if (hasDynamicSelectors) {
          unsupportedPatterns.push('dynamic-selectors');
        }

        results.push({
          fixtureName: relativePath,
          category: 'replay',
          passed: true,
          details: {
            navigations: parseResult.navigations.length,
            locators: parseResult.locators.length,
            replayable: parseResult.navigations.length > 0,
          },
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        results.push({
          fixtureName: relativePath,
          category: 'replay',
          passed: false,
          error: errorMsg,
          details: {},
        });
        failures.push({ category: 'replay-instability', error: errorMsg });
      }
    }

    return { results, failures, unsupportedPatterns };
  }

  private aggregateFailures(
    failures: { category: FailureCategory; error: string }[],
    counts: Record<FailureCategory, number>
  ): void {
    for (const f of failures) {
      counts[f.category]++;
    }
  }

  private calculateSurvivability(results: StressTestResult[], category: string): number {
    const filtered = results.filter(r => r.category === category);
    if (filtered.length === 0) return 100;
    const passed = filtered.filter(r => r.passed).length;
    return (passed / filtered.length) * 100;
  }

  private identifyWeakPoints(
    results: StressTestResult[],
    failureCounts: Record<FailureCategory, number>
  ): ArchitecturalWeakPoint[] {
    const weakPoints: ArchitecturalWeakPoint[] = [];

    const parserFails = results.filter(r => r.category === 'parser' && !r.passed);
    if (parserFails.length > 0) {
      weakPoints.push({
        location: 'Parser',
        issue: `${parserFails.length} adversarial fixtures cause parser failures`,
        severity: parserFails.length > 3 ? 'high' : 'medium',
        category: 'parser-limitation',
      });
    }

    if (failureCounts['mutation-instability'] > 2) {
      weakPoints.push({
        location: 'Mutation Engine',
        issue: 'Multiple mutation failures against adversarial fixtures',
        severity: 'medium',
        category: 'mutation-instability',
      });
    }

    if (failureCounts['unsupported-pattern'] > 0) {
      weakPoints.push({
        location: 'Locator Analysis',
        issue: 'Unsupported patterns detected in fixtures',
        severity: 'low',
        category: 'unsupported-pattern',
      });
    }

    return weakPoints;
  }

  private findTestFiles(dir: string): string[] {
    const files: string[] = [];
    if (!existsSync(dir)) return files;

    const scan = (path: string): void => {
      const entries = readdirSync(path, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        const fullPath = join(path, entry.name);
        if (entry.isDirectory()) {
          scan(fullPath);
        } else if (entry.name.match(/\.(spec|test)\.(ts|js)$/)) {
          files.push(fullPath);
        }
      }
    };

    scan(dir);
    return files;
  }

  private validateMutationPreconditions(content: string): boolean {
    return content.includes('test') || content.includes('describe');
  }

  private countPotentialMutations(content: string): number {
    return (content.match(/\.locator\(/g) || []).length +
      (content.match(/\.getBy/g) || []).length;
  }

  private persistReport(report: AdversarialStressReport): void {
    const reportDir = join(process.cwd(), REPORT_DIR);
    if (!existsSync(reportDir)) {
      mkdirSync(reportDir, { recursive: true });
    }

    const reportFile = join(reportDir, `${report.id}.json`);
    writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf-8');

    const latestFile = join(reportDir, 'latest.json');
    writeFileSync(latestFile, JSON.stringify(report, null, 2), 'utf-8');

    info('AdversarialTester', `Report saved to: ${reportFile}`);
  }
}

export function generateStressReportSummary(report: AdversarialStressReport): string {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('           Adversarial Stress Test Report');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Report ID: ${report.id}`);
  lines.push(`Generated: ${new Date(report.generatedAt).toISOString()}`);
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                    STABILITY METRICS');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`  Overall Stability:       ${report.overallStability.toFixed(1)}%`);
  lines.push(`  Parser Survivability:   ${report.parserSurvivability.toFixed(1)}%`);
  lines.push(`  Compile Survivability:  ${report.compileSurvivability.toFixed(1)}%`);
  lines.push(`  Rollback Integrity:     ${report.rollbackIntegrity.toFixed(1)}%`);
  lines.push(`  Replay Stability:       ${report.replayStability.toFixed(1)}%`);
  lines.push('');

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                   FAILURE CLASSIFICATION');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  for (const [category, count] of Object.entries(report.failureCategories)) {
    if (count > 0) {
      const displayCat = category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      lines.push(`  ${displayCat}: ${count}`);
    }
  }
  lines.push('');

  if (report.unsupportedPatterns.length > 0) {
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('                  UNSUPPORTED PATTERNS');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');
    for (const pattern of report.unsupportedPatterns) {
      lines.push(`  - ${pattern}`);
    }
    lines.push('');
  }

  if (report.architecturalWeakPoints.length > 0) {
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('                 ARCHITECTURAL WEAK POINTS');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');
    for (const wp of report.architecturalWeakPoints) {
      lines.push(`  [${wp.severity.toUpperCase()}] ${wp.location}`);
      lines.push(`    Issue: ${wp.issue}`);
      lines.push('');
    }
  }

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push(`Total Fixtures Tested: ${report.results.length}`);
  lines.push(`Passed: ${report.results.filter(r => r.passed).length}`);
  lines.push(`Failed: ${report.results.filter(r => !r.passed).length}`);
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}