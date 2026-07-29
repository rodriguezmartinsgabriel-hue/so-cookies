export function getDatabaseUrl() {
  return process.env.DIRECT_DATABASE_URL
    ?? process.env.POSTGRES_URL_NON_POOLING
    ?? process.env.DATABASE_URL!;
}
