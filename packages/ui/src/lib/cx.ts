export type ClassValue = string | number | false | null | undefined;

/** Minimal className joiner — no new dependency for something this small. */
export function cx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
