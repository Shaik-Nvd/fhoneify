/**
 * READ-ONLY. Snapshots every public table's row count and a content checksum,
 * and optionally compares against an earlier snapshot - the proof that a
 * production step touched only what it was supposed to.
 *
 *   npx tsx scripts/reference-pricing/db-snapshot.ts before.json
 *   ...do the production step...
 *   npx tsx scripts/reference-pricing/db-snapshot.ts after.json --compare before.json
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

type Snapshot = Record<string, { rows: number; checksum: string }>;

async function takeSnapshot(): Promise<Snapshot> {
  const tables: { table_name: string }[] = await prisma.$queryRawUnsafe(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`
  );
  const snapshot: Snapshot = {};
  for (const { table_name } of tables) {
    const q = `"${table_name.replace(/"/g, '""')}"`;
    const [{ rows, checksum }]: any = await prisma.$queryRawUnsafe(
      `SELECT count(*)::int AS rows,
              coalesce(md5(string_agg(md5(t::text), '' ORDER BY md5(t::text))), 'empty') AS checksum
       FROM ${q} t`
    );
    snapshot[table_name] = { rows, checksum };
  }
  return snapshot;
}

async function main() {
  const out = process.argv[2];
  const compareIdx = process.argv.indexOf('--compare');
  const snapshot = await takeSnapshot();

  for (const [table, v] of Object.entries(snapshot)) {
    console.log(`${table.padEnd(28)} rows=${String(v.rows).padStart(6)}  checksum=${v.checksum.slice(0, 12)}`);
  }
  if (out) fs.writeFileSync(out, JSON.stringify({ takenAt: new Date().toISOString(), snapshot }, null, 2));

  if (compareIdx > 0) {
    const before: Snapshot = JSON.parse(fs.readFileSync(process.argv[compareIdx + 1], 'utf8')).snapshot;
    console.log('\n--- compared with', process.argv[compareIdx + 1], '---');
    for (const table of Array.from(new Set([...Object.keys(before), ...Object.keys(snapshot)])).sort()) {
      const a = before[table];
      const b = snapshot[table];
      if (!a) console.log(`ADDED      ${table} (rows=${b.rows})`);
      else if (!b) console.log(`REMOVED    ${table}`);
      else if (a.rows !== b.rows || a.checksum !== b.checksum) console.log(`CHANGED    ${table} rows ${a.rows} -> ${b.rows}`);
      else console.log(`unchanged  ${table}`);
    }
  }
}

main()
  .catch((e) => {
    console.error('snapshot failed:', String(e.message).split('\n').slice(-2).join(' '));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
