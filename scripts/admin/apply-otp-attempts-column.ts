/**
 * ONE-TIME: adds WhatsAppOTP.attempts in production.
 *
 *   npx tsx scripts/admin/apply-otp-attempts-column.ts           # show plan
 *   npx tsx scripts/admin/apply-otp-attempts-column.ts --apply   # execute
 *
 * Guards: the SQL file may contain only ALTER TABLE ... ADD COLUMN statements
 * (never DROP/DELETE/UPDATE/TRUNCATE/RENAME), the column must not already
 * exist, and the row count is compared before and after so an unexpected data
 * change is impossible to miss.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const SQL_FILE = path.join(process.cwd(), 'prisma', 'sql', '20260917_add_whatsappotp_attempts.sql');

async function main() {
  const apply = process.argv.includes('--apply');
  if (!process.env.DIRECT_URL) {
    console.error('DIRECT_URL is not set. Run from the project root where .env lives.');
    process.exit(1);
  }

  const sql = fs.readFileSync(SQL_FILE, 'utf8');
  if (/\b(DROP|DELETE|TRUNCATE|UPDATE|INSERT|RENAME|GRANT|REVOKE)\b/i.test(sql)) {
    console.error('REFUSING: the SQL file contains a destructive statement.');
    process.exit(1);
  }
  const statements = sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
    .filter(Boolean);
  for (const s of statements) {
    if (!/^ALTER TABLE "[A-Za-z]+" ADD COLUMN /i.test(s)) {
      console.error(`REFUSING: unexpected statement: ${s.slice(0, 90)}`);
      process.exit(1);
    }
  }

  const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
  try {
    const before: any[] = await prisma.$queryRawUnsafe(
      `SELECT count(*)::int AS rows,
              (SELECT count(*)::int FROM information_schema.columns
                WHERE table_schema='public' AND table_name='WhatsAppOTP' AND column_name='attempts') AS "columnExists"
       FROM "WhatsAppOTP"`
    );
    console.log(`Plan: ${statements.length} statement(s), all ALTER TABLE ... ADD COLUMN`);
    statements.forEach((s) => console.log('  -', s));
    console.log(`WhatsAppOTP rows before: ${before[0].rows}; column already present: ${before[0].columnExists > 0}`);

    if (before[0].columnExists > 0) {
      console.log('Nothing to do.');
      return;
    }
    if (!apply) {
      console.log('\nPlan only. Re-run with --apply to execute.');
      return;
    }

    await prisma.$transaction(statements.map((s) => prisma.$executeRawUnsafe(s)));
    const after: any[] = await prisma.$queryRawUnsafe(
      `SELECT count(*)::int AS rows, count(*) FILTER (WHERE attempts = 0)::int AS "attemptsZero" FROM "WhatsAppOTP"`
    );
    console.log(`Applied. WhatsAppOTP rows after: ${after[0].rows} (attempts=0 on ${after[0].attemptsZero}); rows unchanged: ${after[0].rows === before[0].rows}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('FAILED (transaction rolled back):', String(e.message).split('\n').slice(-2).join(' '));
  process.exit(1);
});
