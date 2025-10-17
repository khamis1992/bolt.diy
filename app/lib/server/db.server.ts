import type { AppLoadContext } from '@remix-run/cloudflare';

export function getDatabase(context: AppLoadContext): D1Database {
  const db = context.cloudflare?.env?.BOLT_DB;

  if (!db) {
    throw new Error('Missing BOLT_DB binding. Did you configure the Cloudflare D1 database?');
  }

  return db;
}
