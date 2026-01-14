/**
 * PostgreSQL database adapter
 * Use this file when migrating to PostgreSQL
 * 
 * To use: Replace imports from './db' with './db-postgres'
 */

import { Pool } from 'pg'
import { PolymarketMarket } from './polymarket'

// Initialize PostgreSQL connection pool
let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required')
    }
    pool = new Pool({
      connectionString,
      // Supabase requires SSL in production
      ssl: process.env.NODE_ENV === 'production' || connectionString.includes('supabase.co') 
        ? { rejectUnauthorized: false } 
        : false,
    })
  }
  return pool
}

// Initialize database schema
async function initializeSchema() {
  const db = getPool()
  await db.query(`
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
}

// Initialize on first import
if (typeof window === 'undefined') {
  initializeSchema().catch(console.error)
}

// Convert PolymarketMarket to database row
function marketToRow(market: PolymarketMarket & {
  yesBuyPrice?: number | null
  yesSellPrice?: number | null
  noBuyPrice?: number | null
  noSellPrice?: number | null
  yesOrderBook?: any
  noOrderBook?: any
  priceSyncedAt?: string | null
}): any {
  return {
    id: market.id,
    question: market.question,
    description: market.description || null,
    slug: market.slug || null,
    imageUrl: market.imageUrl || null,
    endDate: market.endDate || null,
    startDate: market.startDate || null,
    outcomes: JSON.stringify(market.outcomes || ['Yes', 'No']),
    volume: market.volume || 0,
    liquidity: market.liquidity || 0,
    marketMakerAddress: market.marketMakerAddress || null,
    active: market.active !== false ? 1 : 0,
    archived: market.archived ? 1 : 0,
    closed: market.closed ? 1 : 0,
    resolutionSource: market.resolutionSource || null,
    tags: JSON.stringify(market.tags || []),
    createdAt: market.createdAt || new Date().toISOString(),
    updatedAt: market.updatedAt || new Date().toISOString(),
    conditionId: market.conditionId || null,
    clobTokenIds: market.clobTokenIds ? JSON.stringify(market.clobTokenIds) : null,
    yesPrice: market.yesPrice ?? null,
    noPrice: market.noPrice ?? null,
    yesBuyPrice: market.yesBuyPrice ?? null,
    yesSellPrice: market.yesSellPrice ?? null,
    noBuyPrice: market.noBuyPrice ?? null,
    noSellPrice: market.noSellPrice ?? null,
    yesOrderBook: market.yesOrderBook ? JSON.stringify(market.yesOrderBook) : null,
    noOrderBook: market.noOrderBook ? JSON.stringify(market.noOrderBook) : null,
    priceSyncedAt: market.priceSyncedAt || null,
    lastSyncedAt: new Date().toISOString(),
  }
}

// Convert database row to PolymarketMarket
function rowToMarket(row: any): PolymarketMarket & {
  yesBuyPrice?: number
  yesSellPrice?: number
  noBuyPrice?: number
  noSellPrice?: number
  yesOrderBook?: any
  noOrderBook?: any
  priceSyncedAt?: string
} {
  return {
    id: row.id,
    question: row.question,
    description: row.description || '',
    slug: row.slug || row.id,
    imageUrl: row.imageUrl,
    endDate: row.endDate,
    startDate: row.startDate,
    outcomes: row.outcomes ? (typeof row.outcomes === 'string' ? JSON.parse(row.outcomes) : row.outcomes) : ['Yes', 'No'],
    volume: row.volume || 0,
    liquidity: row.liquidity || 0,
    marketMakerAddress: row.marketMakerAddress,
    active: row.active !== 0,
    archived: row.archived === 1,
    closed: row.closed === 1,
    resolutionSource: row.resolutionSource,
    tags: row.tags ? (typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags) : [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    conditionId: row.conditionId,
    clobTokenIds: row.clobTokenIds ? (typeof row.clobTokenIds === 'string' ? JSON.parse(row.clobTokenIds) : row.clobTokenIds) : [],
    yesPrice: row.yesPrice,
    noPrice: row.noPrice,
    yesBuyPrice: row.yesBuyPrice,
    yesSellPrice: row.yesSellPrice,
    noBuyPrice: row.noBuyPrice,
    noSellPrice: row.noSellPrice,
    yesOrderBook: row.yesOrderBook ? (typeof row.yesOrderBook === 'string' ? JSON.parse(row.yesOrderBook) : row.yesOrderBook) : undefined,
    noOrderBook: row.noOrderBook ? (typeof row.noOrderBook === 'string' ? JSON.parse(row.noOrderBook) : row.noOrderBook) : undefined,
    priceSyncedAt: row.priceSyncedAt || undefined,
  }
}

// Database operations (same interface as SQLite version)
export const dbOperations = {
  // Insert or update markets (upsert)
  async upsertMarkets(markets: PolymarketMarket[]) {
    const db = getPool()
    const client = await db.connect()
    
    try {
      await client.query('BEGIN')
      
      for (const market of markets) {
        const row = marketToRow(market)
        await client.query(`
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
        `, [
          row.id, row.question, row.description, row.slug, row.imageUrl, row.endDate, row.startDate,
          row.outcomes, row.volume, row.liquidity, row.marketMakerAddress, row.active, row.archived,
          row.closed, row.resolutionSource, row.tags, row.createdAt, row.updatedAt, row.conditionId,
          row.clobTokenIds, row.yesPrice, row.noPrice, row.yesBuyPrice, row.yesSellPrice,
          row.noBuyPrice, row.noSellPrice, row.yesOrderBook, row.noOrderBook,
          row.priceSyncedAt, row.lastSyncedAt
        ])
      }
      
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  },

  // Get all markets
  async getAllMarkets(): Promise<PolymarketMarket[]> {
    const db = getPool()
    const result = await db.query('SELECT * FROM markets')
    return result.rows.map(rowToMarket)
  },

  // Get market by ID
  async getMarketById(id: string): Promise<PolymarketMarket | null> {
    const db = getPool()
    const result = await db.query('SELECT * FROM markets WHERE id = $1', [id])
    if (result.rows.length === 0) return null
    return rowToMarket(result.rows[0])
  },

  // Search markets
  async searchMarkets(
    query: string,
    filters?: {
      tags?: string[]
      minVolume?: number
      minLiquidity?: number
      minOdds?: number // 0-1 decimal
      maxOdds?: number // 0-1 decimal
    },
    sortBy: 'volume' | 'liquidity' | 'newest' | 'oldest' = 'volume',
    limit: number = 24,
    offset: number = 0
  ): Promise<{ markets: PolymarketMarket[]; total: number }> {
    const db = getPool()
    let sql = 'SELECT * FROM markets WHERE active = 1 AND closed = 0'
    const params: any[] = []
    let paramCount = 0

    if (query) {
      paramCount++
      sql += ` AND (question ILIKE $${paramCount} OR description ILIKE $${paramCount} OR tags::text ILIKE $${paramCount})`
      params.push(`%${query}%`)
    }

    if (filters?.tags && filters.tags.length > 0) {
      paramCount++
      sql += ` AND tags::text ILIKE $${paramCount}`
      params.push(`%${filters.tags.join('%')}%`)
    }

    if (filters?.minVolume) {
      paramCount++
      sql += ` AND volume >= $${paramCount}`
      params.push(filters.minVolume)
    }

    if (filters?.minLiquidity) {
      paramCount++
      sql += ` AND liquidity >= $${paramCount}`
      params.push(filters.minLiquidity)
    }

    if (filters?.minOdds !== undefined) {
      paramCount++
      sql += ` AND COALESCE("yesPrice", 0.5) >= $${paramCount}`
      params.push(filters.minOdds)
    }

    if (filters?.maxOdds !== undefined) {
      paramCount++
      sql += ` AND COALESCE("yesPrice", 0.5) <= $${paramCount}`
      params.push(filters.maxOdds)
    }

    // Get total count
    const countResult = await db.query(`SELECT COUNT(*) FROM (${sql}) as filtered`, params)
    const total = parseInt(countResult.rows[0].count)

    // Add sorting
    switch (sortBy) {
      case 'volume':
        sql += ' ORDER BY volume DESC, liquidity DESC'
        break
      case 'liquidity':
        sql += ' ORDER BY liquidity DESC, volume DESC'
        break
      case 'newest':
        sql += ' ORDER BY "createdAt" DESC'
        break
      case 'oldest':
        sql += ' ORDER BY "createdAt" ASC'
        break
    }

    // Add limit and offset
    paramCount++
    sql += ` LIMIT $${paramCount}`
    params.push(limit)
    paramCount++
    sql += ` OFFSET $${paramCount}`
    params.push(offset)

    const result = await db.query(sql, params)
    return {
      markets: result.rows.map(rowToMarket),
      total,
    }
  },

  // Get top markets
  async getTopMarkets(
    limit: number = 500,
    offset: number = 0,
    sortBy: 'volume' | 'liquidity' | 'newest' | 'oldest' = 'volume'
  ): Promise<{ markets: PolymarketMarket[]; total: number }> {
    return this.searchMarkets('', undefined, sortBy, limit, offset)
  },

  // Get stats
  async getStats() {
    const db = getPool()
    const result = await db.query(`
      SELECT 
        COUNT(*) as totalMarkets,
        MAX("lastSyncedAt") as lastUpdated
      FROM markets
    `)
    return {
      totalMarkets: parseInt(result.rows[0].totalmarkets || '0'),
      lastUpdated: result.rows[0].lastupdated || null,
      updateInProgress: false,
    }
  },

  // Clear all markets
  async clearAll() {
    const db = getPool()
    // Extend timeout for large table operations
    await db.query('SET statement_timeout = 300000') // 5 minutes
    await db.query('DELETE FROM markets')
    await db.query('SET statement_timeout = DEFAULT')
  },

  // Update prices and order book for a market
  async updateMarketPrices(
    marketId: string,
    priceData: {
      yesPrice?: number | null
      noPrice?: number | null
      yesBuyPrice?: number | null
      yesSellPrice?: number | null
      noBuyPrice?: number | null
      noSellPrice?: number | null
      yesOrderBook?: any
      noOrderBook?: any
    }
  ) {
    const db = getPool()
    await db.query(`
      UPDATE markets SET
        "yesPrice" = COALESCE($1, "yesPrice"),
        "noPrice" = COALESCE($2, "noPrice"),
        "yesBuyPrice" = COALESCE($3, "yesBuyPrice"),
        "yesSellPrice" = COALESCE($4, "yesSellPrice"),
        "noBuyPrice" = COALESCE($5, "noBuyPrice"),
        "noSellPrice" = COALESCE($6, "noSellPrice"),
        "yesOrderBook" = COALESCE($7, "yesOrderBook"),
        "noOrderBook" = COALESCE($8, "noOrderBook"),
        "priceSyncedAt" = $9
      WHERE id = $10
    `, [
      priceData.yesPrice ?? null,
      priceData.noPrice ?? null,
      priceData.yesBuyPrice ?? null,
      priceData.yesSellPrice ?? null,
      priceData.noBuyPrice ?? null,
      priceData.noSellPrice ?? null,
      priceData.yesOrderBook ? JSON.stringify(priceData.yesOrderBook) : null,
      priceData.noOrderBook ? JSON.stringify(priceData.noOrderBook) : null,
      new Date().toISOString(),
      marketId
    ])
  },

  // Get markets by IDs
  async getMarketsByIds(ids: string[]): Promise<PolymarketMarket[]> {
    if (ids.length === 0) return []
    const db = getPool()
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',')
    const result = await db.query(`SELECT * FROM markets WHERE id IN (${placeholders})`, ids)
    return result.rows.map(rowToMarket)
  },
}


