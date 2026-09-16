/**
 * ONE-TIME: creates the two tables the scheduled refresh needs
 * (ReferencePriceRefreshRun, ReferencePriceRefreshLock) plus their enum and
 * indexes, in the production Supabase database.
 *
 * Why this instead of `prisma db push`: the exact SQL was generated with
 * `prisma migrate diff` against the live database and reviewed
 * (prisma/sql/20260917_add_reference_price_refresh_tables.sql). Running THAT
 * file means production gets precisely what was reviewed, not whatever a
 * future push computes against a schema that may have drifted.
 *
 * Guarantees enforced before anything runs:
 *  - refuses if the SQL contains DROP/ALTER/DELETE/TRUNCATE/UPDATE/INSERT/
 *    RENAME/GRANT/REVOKE - it cannot modify or remove existing data;
 *  - refuses unless every statement is CREATE TYPE / CREATE TABLE / CREATE INDEX;
 *  - refuses if any of the objects already exist (safe to re-run: it just stops);
 *  - applies all statements in ONE transaction over DIRECT_URL, so it is
 *    all-or-nothing.
 *
 *   npx tsx scripts/reference-pricing/apply-refresh-tables.ts            # show plan only
 *   npx tsx scripts/reference-pricing/apply-refresh-tables.ts --apply    # execute
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const SQL_FILE = path.join(process.cwd(), 'prisma', 'sql', '20260917_add_reference_price_refresh_tables.sql');
const NEW_OBJECTS = ['RefreshRunStatus', 'ReferencePriceRefreshRun', 'ReferencePriceRefreshLock'];

async function main() {
  const apply = process.argv.includes('--apply');
  if (!process.env.DIRECT_URL) {
    console.error('DIRECT_URL is not set. Run this from the project root where .env lives.');
    process.exit(1);
  }

  const sql = fs.readFileSync(SQL_FILE, 'utf8');
  if (/\b(DROP|ALTER|DELETE|TRUNCATE|UPDATE|INSERT|RENAME|GRANT|REVOKE)\b/i.test(sql)) {
    console.error('REFUSING: the SQL file contains a statement that could modify or remove existing data.');
    process.exit(1);
  }
  const statements = sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
    .filter(Boolean);
  for (const s of statements) {
    if (!/^CREATE (TYPE|TABLE|INDEX) /i.test(s)) {
      console.error(`REFUSING: unexpected statement: ${s.slice(0, 80)}`);
      process.exit(1);
    }
  }

  const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
  try {
    const existing: { name: string }[] = await prisma.$queryRawUnsafe(
      `SELECT table_name AS name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1)
       UNION
       SELECT t.typname AS name FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
       WHERE n.nspname = 'public' AND t.typname = ANY($1)`,
      NEW_OBJECTS
    );

    console.log(`Plan: ${statements.length} statements, all CREATE TYPE / CREATE TABLE / CREATE INDEX.`);
    for (const s of statements) console.log(`  - ${s.split('\n')[0]}`);

    if (existing.length > 0) {
      console.log(`\nAlready present: ${existing.map((e) => e.name).join(', ')}. Nothing to do.`);
      return;
    }

    if (!apply) {
      console.log('\nPlan only. Re-run with --apply to execute in a single transaction.');
      return;
    }

    await prisma.$transaction(statements.map((s) => prisma.$executeRawUnsafe(s)));
    console.log('\nApplied in a single transaction. No existing table was altered.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('FAILED (transaction rolled back, nothing applied):', String(e.message).split('\n').slice(-2).join(' '));
  process.exit(1);
});
