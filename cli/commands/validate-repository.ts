import { resolve } from 'node:path';
import { info, error, warn } from '../../src/logger/index.js';
import { RepositoryValidator, generateReportSummary } from '../../src/core/repository-validator/index.js';

export interface ValidateRepositoryOptions {
  path?: string;
  verbose?: boolean;
}

export async function validateRepository(options: ValidateRepositoryOptions): Promise<void> {
  const repoPath = options.path ? resolve(options.path) : resolve(process.cwd());

  info('CLI', `Repository validation started for: ${repoPath}`);

  try {
    const validator = new RepositoryValidator();
    const report = await validator.validateRepository(repoPath);

    console.log('');
    console.log(generateReportSummary(report));

    if (report.compatibilityStatus === 'unsupported') {
      warn('CLI', 'Repository validation failed: unsupported repository structure');
      process.exit(1);
    } else if (report.compatibilityStatus === 'partially-supported') {
      warn('CLI', 'Repository partially compatible - some features may not work');
    } else {
      info('CLI', 'Repository fully supported');
    }
  } catch (err) {
    error('CLI', `Validation failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}