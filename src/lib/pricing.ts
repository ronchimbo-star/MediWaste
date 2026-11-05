export const COLLECTION_FREQUENCIES = [
  'Pay-As-You-Go',
  'Flexi 4',
  'Quarterly',
  'Bi-Monthly',
  'Monthly',
  'Fortnightly',
  'Weekly',
] as const;

export function formatPence(pence: number | null | undefined): string {
  if (pence === null || pence === undefined) return '-';
  return `£${(pence / 100).toFixed(2)}`;
}

export function parsePoundsToPence(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  return Math.round(Number(trimmed) * 100);
}

export function parseMiles(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const miles = Number(trimmed);
  return miles > 0 ? miles : null;
}
