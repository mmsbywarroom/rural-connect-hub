/**
 * Supabase → Neon data migration
 *
 * Prerequisites:
 * - Neon tables already created (npm run db:push)
 * - .env: DATABASE_URL = Neon, SUPABASE_URL = Supabase
 *
 * Run: npx tsx server/migrate-supabase-to-neon.ts
 */

import "dotenv/config";
import pg from "pg";

const supabaseUrl = process.env.SUPABASE_URL;
const neonUrl = process.env.DATABASE_URL;

if (!supabaseUrl) {
  console.error("SUPABASE_URL missing in .env (Supabase connection string).");
  process.exit(1);
}
if (!neonUrl) {
  console.error("DATABASE_URL missing in .env (Neon connection string).");
  process.exit(1);
}

const supabasePool = new pg.Pool({
  connectionString: supabaseUrl,
  ssl: { rejectUnauthorized: false },
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

const neonPool = new pg.Pool({
  connectionString: neonUrl,
  ssl: { rejectUnauthorized: false },
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

function isConnectionError(e: unknown): boolean {
  const err = e as Error & { code?: string };
  return err?.code === "ECONNRESET" || err?.code === "ECONNREFUSED" || err?.message?.includes("ECONNRESET") || false;
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

async function getPublicTables(pool: pg.Pool): Promise<string[]> {
  const r = await pool.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`
  );
  return r.rows.map((row) => row.table_name);
}

/** Order tables so parents come before children (FK-safe insert order) */
async function getTableOrderByDeps(pool: pg.Pool, tables: string[]): Promise<string[]> {
  const r = await pool.query<{ table_name: string; foreign_table: string }>(
    `SELECT tc.table_name, ccu.table_name AS foreign_table
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
     JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
     WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
       AND tc.table_name = ANY($1) AND ccu.table_name = ANY($1)`
    , [tables]);
  const tableSet = new Set(tables);
  const deps = new Map<string, Set<string>>();
  for (const t of tables) deps.set(t, new Set());
  for (const row of r.rows) {
    if (tableSet.has(row.foreign_table)) deps.get(row.table_name)!.add(row.foreign_table);
  }
  const out: string[] = [];
  const done = new Set<string>();
  while (out.length < tables.length) {
    let added = 0;
    for (const t of tables) {
      if (done.has(t)) continue;
      const d = deps.get(t)!;
      const ready = [...d].every((p) => done.has(p));
      if (ready) { out.push(t); done.add(t); added++; }
    }
    if (added === 0) break;
  }
  for (const t of tables) if (!done.has(t)) out.push(t);
  return out;
}

async function copyTable(
  supabaseClient: pg.PoolClient,
  neonClient: pg.PoolClient,
  table: string
): Promise<{ inserted: number; total: number }> {
  const res = await supabaseClient.query({
    text: `SELECT * FROM ${quoteIdent(table)}`,
    rowMode: "array",
  });
  const rows = res.rows as unknown[][];
  const fields = res.fields!;
  const columns = fields.map((f) => f.name);
  if (rows.length === 0) return { inserted: 0, total: 0 };

  const cols = columns.map(quoteIdent).join(", ");
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
  const insertSql = `INSERT INTO ${quoteIdent(table)} (${cols}) VALUES (${placeholders})`;

  let inserted = 0;
  for (const row of rows) {
    try {
      await neonClient.query(insertSql, row);
      inserted++;
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (code === "23505") inserted++; // duplicate = already in Neon
    }
  }
  return { inserted, total: rows.length };
}

async function copyOneTable(table: string): Promise<{ inserted: number; total: number }> {
  const supabaseClient = await supabasePool.connect();
  const neonClient = await neonPool.connect();
  supabaseClient.on("error", () => {}); // avoid unhandled 'error' on ECONNRESET
  neonClient.on("error", () => {});
  try {
    return await copyTable(supabaseClient, neonClient, table);
  } finally {
    supabaseClient.removeAllListeners("error");
    neonClient.removeAllListeners("error");
    supabaseClient.release();
    neonClient.release();
  }
}

async function main() {
  console.log("Connecting to Supabase and Neon...");
  let metaClient: pg.PoolClient | null = null;
  try {
    metaClient = await neonPool.connect();
    const [supabaseTables, neonTables] = await Promise.all([
      getPublicTables(supabasePool),
      getPublicTables(neonPool),
    ]);
    metaClient.release();
    metaClient = null;

    const neonSet = new Set(neonTables);
    let pending = supabaseTables.filter((t) => neonSet.has(t));
    metaClient = await neonPool.connect();
    pending = await getTableOrderByDeps(neonPool, pending);
    metaClient.release();
    metaClient = null;

    console.log(`Supabase: ${supabaseTables.length} tables, Neon: ${neonTables.length}. Copying ${pending.length} tables (parent-first order).\n`);

    const done: string[] = [];
    let pass = 0;
    while (pending.length > 0) {
      pass++;
      if (pass > 1) console.log("\nPass " + pass + " (retrying " + pending.length + " tables):");
      const retry: string[] = [];
      for (const table of pending) {
        const maxTries = 3;
        let lastErr: Error | null = null;
        for (let tryNum = 1; tryNum <= maxTries; tryNum++) {
          try {
            const { inserted, total } = await copyOneTable(table);
            console.log(`  ${table}: ${inserted}/${total} rows`);
            if (inserted > 0) done.push(table);
            if (total > 0 && inserted === 0) retry.push(table);
            lastErr = null;
            break;
          } catch (err: unknown) {
            lastErr = err as Error;
            if (isConnectionError(err) && tryNum < maxTries) {
              console.warn(`  ${table}: connection reset, retry ${tryNum}/${maxTries}...`);
              await new Promise((r) => setTimeout(r, 2000));
            } else {
              console.error(`  ${table}: ERROR`, (lastErr as Error).message);
              retry.push(table);
              break;
            }
          }
        }
      }
      if (retry.length === 0 || retry.length === pending.length) {
        if (retry.length > 0) console.error("\nCould not copy (FK/parent missing):", retry.join(", "));
        break;
      }
      pending = retry;
    }
    console.log("\nDone. " + done.length + " tables copied.");
  } finally {
    if (metaClient) metaClient.release();
    await supabasePool.end();
    await neonPool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
