export const CLIENT_PAGE_SIZE_OPTIONS = [10, 30, 50, 100] as const;
export const DEFAULT_CLIENT_PAGE_SIZE = 30;

export type ClientPageSize = number;

export function normalizeClientPageSize(value: number | string | null | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_CLIENT_PAGE_SIZE;
  return Math.floor(parsed);
}

export function normalizeClientPage(value: number | string | null | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}
