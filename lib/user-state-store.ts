/**
 * Server-side persistence for a signed-in user's terminal state.
 *
 * Scope is deliberately limited to things that are safe to hold for a user:
 * paper-trading portfolio, parlays, alerts and UI settings. The custodial
 * wallet's secret key is NEVER accepted or stored here — it stays on-device.
 *
 * Backed by Postgres when DATABASE_URL is set, otherwise the local SQLite file.
 */

export interface UserStatePayload {
  /** Millisecond timestamp of the last client-side mutation. Used for last-write-wins. */
  updatedAt: number
  data: Record<string, unknown>
}

const usePostgres = !!process.env.DATABASE_URL

/* ------------------------------- Postgres -------------------------------- */

let pgReady: Promise<void> | null = null

async function pgInit() {
  if (!pgReady) {
    pgReady = (async () => {
      const pool: any = pgPool()
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_state (
          user_id    TEXT PRIMARY KEY,
          data       JSONB NOT NULL,
          updated_at BIGINT NOT NULL
        )
      `)
    })()
  }
  return pgReady
}

let _pgPool: any = null
function pgPool() {
  if (!_pgPool) {
    const { Pool } = require('pg')
    const connectionString = process.env.DATABASE_URL as string
    _pgPool = new Pool({
      connectionString,
      // Match lib/db-postgres.ts so both pools agree about TLS: hosted
      // Postgres (Supabase) requires SSL, a local server rejects it.
      ssl:
        process.env.NODE_ENV === 'production' || connectionString.includes('supabase.co')
          ? { rejectUnauthorized: false }
          : false,
    })
  }
  return _pgPool
}

/* -------------------------------- SQLite --------------------------------- */

let sqliteReady = false

function sqliteDb() {
  const { getDb } = require('./db')
  const db = getDb()
  if (!sqliteReady) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_state (
        user_id    TEXT PRIMARY KEY,
        data       TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)
    sqliteReady = true
  }
  return db
}

/* -------------------------------- Public --------------------------------- */

export async function getUserState(userId: string): Promise<UserStatePayload | null> {
  if (usePostgres) {
    await pgInit()
    const res = await pgPool().query(
      'SELECT data, updated_at FROM user_state WHERE user_id = $1',
      [userId]
    )
    if (res.rows.length === 0) return null
    const row = res.rows[0]
    return {
      data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
      updatedAt: Number(row.updated_at),
    }
  }

  const row = sqliteDb()
    .prepare('SELECT data, updated_at FROM user_state WHERE user_id = ?')
    .get(userId) as { data: string; updated_at: number } | undefined

  if (!row) return null
  try {
    return { data: JSON.parse(row.data), updatedAt: Number(row.updated_at) }
  } catch {
    return null
  }
}

export async function putUserState(
  userId: string,
  payload: UserStatePayload
): Promise<void> {
  const json = JSON.stringify(payload.data)

  if (usePostgres) {
    await pgInit()
    await pgPool().query(
      `INSERT INTO user_state (user_id, data, updated_at)
       VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (user_id) DO UPDATE
         SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
      [userId, json, payload.updatedAt]
    )
    return
  }

  sqliteDb()
    .prepare(
      `INSERT INTO user_state (user_id, data, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE
         SET data = excluded.data, updated_at = excluded.updated_at`
    )
    .run(userId, json, payload.updatedAt)
}
