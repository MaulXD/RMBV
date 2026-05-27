const DB_ENV_KEYS = [
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
] as const;

export function resolveDatabaseUrl(): string | undefined {
  for (const key of DB_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function hasDatabaseUrl(): boolean {
  const url = resolveDatabaseUrl();
  if (!url) return false;
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}
