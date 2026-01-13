/**
 * Migration script to convert SQLite database to PostgreSQL
 * 
 * Usage:
 * 1. Set DATABASE_URL environment variable
 * 2. Run: npx tsx scripts/migrate-to-postgres.ts
 */

import Database from 'better-sqlite3'
import { Pool } from 'pg'
import path from 'path'
import fs from 'fs'

// Install pg if not already installed: npm install pg @types/pg

// SQLite database path
const sqlitePath = path.join(process.cwd(), 'data', 'markets.db')

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function migrate() {
  console.log('🔄 Starting migration from SQLite to PostgreSQL...')

  // Check if SQLite database exists
  if (!fs.existsSync(sqlitePath)) {
    console.error('❌ SQLite database not found at:', sqlitePath)
    process.exit(1)
  }

  // Connect to SQLite
  const sqliteDb = new Database(sqlitePath)
  console.log('✅ Connected to SQLite database')

  // Test PostgreSQL connection
  try {
    await pool.query('SELECT NOW()')
    console.log('✅ Connected to PostgreSQL database')
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL:', error)
    process.exit(1)
  }

  // Create PostgreSQL schema
  console.log('📋 Creating PostgreSQL schema...')
  await pool.query(`
    CREATE TABLE IF NOT EXISTS markets (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      description TEXT,
      slug TEXT,
      "imageUrl" TEXT,
      "endDate" TEXT,
      "startDate" TEXT,
      outcomes TEXT,
      volume REAL DEFAULT 0,
      liquidity REAL DEFAULT 0,
      "marketMakerAddress" TEXT,
      active INTEGER DEFAULT 1,
      archived INTEGER DEFAULT 0,
      closed INTEGER DEFAULT 0,
      "resolutionSource" TEXT,
      tags TEXT,
      "createdAt" TEXT,
      "updatedAt" TEXT,
      "conditionId" TEXT,
      "clobTokenIds" TEXT,
      "yesPrice" REAL,
      "noPrice" REAL,
      "yesBuyPrice" REAL,
      "yesSellPrice" REAL,
      "noBuyPrice" REAL,
      "noSellPrice" REAL,
      "yesOrderBook" TEXT,
      "noOrderBook" TEXT,
      "priceSyncedAt" TEXT,
      "lastSyncedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_markets_active ON markets(active);
    CREATE INDEX IF NOT EXISTS idx_markets_closed ON markets(closed);
    CREATE INDEX IF NOT EXISTS idx_markets_volume ON markets(volume DESC);
    CREATE INDEX IF NOT EXISTS idx_markets_liquidity ON markets(liquidity DESC);
    CREATE INDEX IF NOT EXISTS idx_markets_createdAt ON markets("createdAt");
    CREATE INDEX IF NOT EXISTS idx_markets_tags ON markets(tags);
    CREATE INDEX IF NOT EXISTS idx_markets_priceSyncedAt ON markets("priceSyncedAt");
  `)
  console.log('✅ Schema created')

  // Read all markets from SQLite
  console.log('📖 Reading markets from SQLite...')
  const markets = sqliteDb.prepare('SELECT * FROM markets').all() as any[]
  console.log(`✅ Found ${markets.length} markets`)

  if (markets.length === 0) {
    console.log('⚠️  No markets to migrate')
    sqliteDb.close()
    await pool.end()
    return
  }

  // Clear existing PostgreSQL data (optional - comment out if you want to keep existing data)
  console.log('🗑️  Clearing existing PostgreSQL data...')
  await pool.query('TRUNCATE TABLE markets')
  console.log('✅ Cleared existing data')

  // Insert markets into PostgreSQL
  console.log('💾 Migrating markets to PostgreSQL...')
  const insertQuery = `
    INSERT INTO markets (
      id, question, description, slug, "imageUrl", "endDate", "startDate",
      outcomes, volume, liquidity, "marketMakerAddress", active, archived,
      closed, "resolutionSource", tags, "createdAt", "updatedAt", "conditionId",
      "clobTokenIds", "yesPrice", "noPrice", "yesBuyPrice", "yesSellPrice", 
      "noBuyPrice", "noSellPrice", "yesOrderBook", "noOrderBook", 
      "priceSyncedAt", "lastSyncedAt"
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 
      $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
    )
    ON CONFLICT(id) DO UPDATE SET
      question = EXCLUDED.question,
      description = EXCLUDED.description,
      slug = EXCLUDED.slug,
      "imageUrl" = EXCLUDED."imageUrl",
      "endDate" = EXCLUDED."endDate",
      "startDate" = EXCLUDED."startDate",
      outcomes = EXCLUDED.outcomes,
      volume = EXCLUDED.volume,
      liquidity = EXCLUDED.liquidity,
      "marketMakerAddress" = EXCLUDED."marketMakerAddress",
      active = EXCLUDED.active,
      archived = EXCLUDED.archived,
      closed = EXCLUDED.closed,
      "resolutionSource" = EXCLUDED."resolutionSource",
      tags = EXCLUDED.tags,
      "createdAt" = EXCLUDED."createdAt",
      "updatedAt" = EXCLUDED."updatedAt",
      "conditionId" = EXCLUDED."conditionId",
      "clobTokenIds" = EXCLUDED."clobTokenIds",
      "yesPrice" = COALESCE(EXCLUDED."yesPrice", markets."yesPrice"),
      "noPrice" = COALESCE(EXCLUDED."noPrice", markets."noPrice"),
      "yesBuyPrice" = COALESCE(EXCLUDED."yesBuyPrice", markets."yesBuyPrice"),
      "yesSellPrice" = COALESCE(EXCLUDED."yesSellPrice", markets."yesSellPrice"),
      "noBuyPrice" = COALESCE(EXCLUDED."noBuyPrice", markets."noBuyPrice"),
      "noSellPrice" = COALESCE(EXCLUDED."noSellPrice", markets."noSellPrice"),
      "yesOrderBook" = COALESCE(EXCLUDED."yesOrderBook", markets."yesOrderBook"),
      "noOrderBook" = COALESCE(EXCLUDED."noOrderBook", markets."noOrderBook"),
      "priceSyncedAt" = COALESCE(EXCLUDED."priceSyncedAt", markets."priceSyncedAt"),
      "lastSyncedAt" = EXCLUDED."lastSyncedAt"
  `

  let migrated = 0
  const batchSize = 100

  for (let i = 0; i < markets.length; i += batchSize) {
    const batch = markets.slice(i, i + batchSize)
    
    await Promise.all(
      batch.map(async (market) => {
        try {
          await pool.query(insertQuery, [
            market.id,
            market.question,
            market.description,
            market.slug,
            market.imageUrl,
            market.endDate,
            market.startDate,
            market.outcomes,
            market.volume,
            market.liquidity,
            market.marketMakerAddress,
            market.active,
            market.archived,
            market.closed,
            market.resolutionSource,
            market.tags,
            market.createdAt,
            market.updatedAt,
            market.conditionId,
            market.clobTokenIds,
            market.yesPrice,
            market.noPrice,
            market.yesBuyPrice,
            market.yesSellPrice,
            market.noBuyPrice,
            market.noSellPrice,
            market.yesOrderBook,
            market.noOrderBook,
            market.priceSyncedAt,
            market.lastSyncedAt || new Date().toISOString(),
          ])
          migrated++
        } catch (error) {
          console.error(`❌ Failed to migrate market ${market.id}:`, error)
        }
      })
    )

    console.log(`✅ Migrated ${Math.min(i + batchSize, markets.length)}/${markets.length} markets`)
  }

  // Verify migration
  const pgCount = await pool.query('SELECT COUNT(*) FROM markets')
  console.log(`\n📊 Migration Summary:`)
  console.log(`   SQLite: ${markets.length} markets`)
  console.log(`   PostgreSQL: ${pgCount.rows[0].count} markets`)
  console.log(`   Migrated: ${migrated} markets`)

  // Close connections
  sqliteDb.close()
  await pool.end()

  console.log('\n✅ Migration completed!')
}

migrate().catch((error) => {
  console.error('❌ Migration failed:', error)
  process.exit(1)
})

