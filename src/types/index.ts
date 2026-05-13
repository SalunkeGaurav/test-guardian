/**
 * Shared utility types.
 *
 * These are NOT domain models — they are TypeScript helper types
 * used across modules. Domain entities live in src/models/.
 */

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type DeepPartial<T> = { [P in keyof T]?: DeepPartial<T[P]> };
export type Awaitable<T> = T | Promise<T>;
