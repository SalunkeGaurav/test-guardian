# TestGuardian CLI Reference

## Usage

```
testguardian <command> [options]
```

## Commands

### analyze

Analyze a Playwright project for test health and healing opportunities.

```
testguardian analyze <project-path> [options]
```

**Options:**
- `--output <path>` - Output directory for reports
- `--verbose` - Enable debug logging
- `--compact` - Compact output mode
- `--json` - Machine-readable JSON output

### pipeline

Execute the full healing pipeline on a project.

```
testguardian pipeline <project-path> [options]
```

**Options:**
- `--mode <mode>` - Execution mode (full, validate-only, report-only)
- `--governance` - Enable strict governance
- `--output <path>` - Output directory for reports
- `--verbose` - Enable debug logging

### execution-lab

Execute tests against repositories and collect evidence.

```
testguardian execution-lab <project-path> [options]
```

**Options:**
- `--batch-size <n>` - Number of repositories per batch
- `--resume` - Resume from previous execution state
- `--failed-only` - Only re-execute failed repositories
- `--output <path>` - Output directory for reports
- `--verbose` - Enable debug logging

### review

Generate developer-facing review bundles.

```
testguardian review <project-path> [options]
```

**Options:**
- `--output <path>` - Output directory for reports
- `--verbose` - Enable debug logging

### production-readiness

Assess production readiness of the system.

```
testguardian production-readiness [options]
```

**Options:**
- `--output <path>` - Output directory for reports
- `--verbose` - Enable debug logging

### corpus-scale

Execute large-scale corpus analysis.

```
testguardian corpus-scale --corpus <path> [options]
```

**Options:**
- `--corpus <path>` - Path to benchmark corpus directory
- `--batch-size <n>` - Number of repositories per batch
- `--resume` - Resume from previous execution state
- `--failed-only` - Only re-execute failed repositories
- `--report-only` - Generate reports only, skip execution
- `--verbose` - Enable debug logging

### stabilization

Execute stabilization analysis.

```
testguardian stabilization --corpus <path> [options]
```

**Options:**
- `--corpus <path>` - Path to benchmark corpus directory
- `--batch-size <n>` - Number of repositories per batch
- `--resume` - Resume from previous execution state
- `--report-only` - Generate reports only, skip execution
- `--verbose` - Enable debug logging

### alpha-prepare

Prepare alpha release with consolidated reports.

```
testguardian alpha-prepare [options]
```

**Options:**
- `--corpus <path>` - Path to benchmark corpus directory
- `--output <path>` - Output directory for reports
- `--verbose` - Enable debug logging

## Output Modes

### Default Mode

Human-readable output with formatted tables and summaries.

### Compact Mode

Reduced output with essential information only.

```
testguardian analyze <path> --compact
```

### Verbose Mode

Detailed output with debug information.

```
testguardian analyze <path> --verbose
```

### JSON Mode

Machine-readable JSON output for programmatic consumption.

```
testguardian analyze <path> --json
```

## Exit Codes

- `0` - Success
- `1` - General error
- `2` - Invalid arguments
- `3` - Configuration error
