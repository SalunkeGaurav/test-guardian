/**
 * Structured Logger
 *
 * Provides consistent logging with levels and prefixes across all modules.
 * No external dependencies — uses process.stdout/stderr directly.
 *
 * Levels: debug, info, warn, error
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const PREFIX = '[tg]';
const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

let currentLevel: LogLevel = 'info';

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel];
}

function formatMessage(level: LogLevel, module: string, message: string): string {
  return `${PREFIX}[${level}][${module}] ${message}`;
}

export function debug(module: string, message: string): void {
  if (shouldLog('debug')) console.debug(formatMessage('debug', module, message));
}

export function info(module: string, message: string): void {
  if (shouldLog('info')) console.log(formatMessage('info', module, message));
}

export function warn(module: string, message: string): void {
  if (shouldLog('warn')) console.warn(formatMessage('warn', module, message));
}

export function error(module: string, message: string): void {
  if (shouldLog('error')) console.error(formatMessage('error', module, message));
}

export function span(module: string, label: string): () => void {
  const start = performance.now();
  info(module, `${label}...`);
  return () => {
    const elapsed = (performance.now() - start).toFixed(1);
    info(module, `${label} done (${elapsed}ms)`);
  };
}
