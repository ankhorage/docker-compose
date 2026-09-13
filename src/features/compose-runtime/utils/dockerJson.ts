/** Parse one Docker inspect JSON array while retaining unknown input safety. */
export function parseDockerDocument(value: string): readonly Readonly<Record<string, unknown>>[] {
  if (value.trim().length === 0) return [];
  const parsed: unknown = JSON.parse(value);
  if (!isUnknownArray(parsed)) throw new Error('Invalid Docker inspect response.');
  return parsed.map(requireRecord);
}

export function requireRecord(value: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(value)) throw new Error('Invalid Docker record.');
  return value;
}

export function optionalRecord(
  value: Readonly<Record<string, unknown>> | undefined,
  key: string,
): Readonly<Record<string, unknown>> | undefined {
  const item = getValue(value, key);
  if (item === undefined || item === null) return undefined;
  if (!isRecord(item)) throw new Error('Invalid Docker record field.');
  return item;
}

export function optionalStringRecord(
  value: Readonly<Record<string, unknown>> | undefined,
  key: string,
): Readonly<Record<string, string>> | undefined {
  const item = optionalRecord(value, key);
  if (item === undefined) return undefined;
  const entries = Object.entries(item);
  if (!entries.every(([, entry]) => typeof entry === 'string')) {
    throw new Error('Invalid Docker string record.');
  }
  return Object.fromEntries(entries) as Readonly<Record<string, string>>;
}

export function requireString(value: Readonly<Record<string, unknown>>, key: string): string {
  const item = getValue(value, key);
  if (typeof item !== 'string' || item.length === 0) throw new Error('Invalid Docker string.');
  return item;
}

export function optionalString(
  value: Readonly<Record<string, unknown>> | undefined,
  key: string,
): string | undefined {
  const item = getValue(value, key);
  return typeof item === 'string' ? item : undefined;
}

export function requireBoolean(value: Readonly<Record<string, unknown>>, key: string): boolean {
  const item = getValue(value, key);
  if (typeof item !== 'boolean') throw new Error('Invalid Docker boolean.');
  return item;
}

export function requireNumber(value: Readonly<Record<string, unknown>>, key: string): number {
  const item = getValue(value, key);
  if (typeof item !== 'number' || !Number.isFinite(item)) throw new Error('Invalid Docker number.');
  return item;
}

export function optionalNumber(
  value: Readonly<Record<string, unknown>> | undefined,
  key: string,
): number | undefined {
  const item = getValue(value, key);
  return typeof item === 'number' && Number.isFinite(item) ? item : undefined;
}

export function requireStringArray(
  value: Readonly<Record<string, unknown>>,
  key: string,
): readonly string[] {
  const item = getValue(value, key);
  if (!isUnknownArray(item) || !item.every((entry) => typeof entry === 'string')) {
    throw new Error('Invalid Docker string array.');
  }
  return item;
}

export function optionalArray(
  value: Readonly<Record<string, unknown>>,
  key: string,
): readonly unknown[] {
  const item = getValue(value, key);
  if (item === undefined) return [];
  if (!isUnknownArray(item)) throw new Error('Invalid Docker array.');
  return item;
}

export function getString(
  value: Readonly<Record<string, string>>,
  key: string,
): string | undefined {
  return Object.entries(value)
    .find(([name]) => name === key)
    ?.at(1);
}

export function getValue(
  value: Readonly<Record<string, unknown>> | undefined,
  key: string,
): unknown {
  return value === undefined
    ? undefined
    : Object.entries(value)
        .find(([name]) => name === key)
        ?.at(1);
}

export function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}
