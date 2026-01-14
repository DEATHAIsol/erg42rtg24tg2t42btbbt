import Database from 'better-sqlite3'
import { PolymarketMarket } from './polymarket'
import path from 'path'
import fs from 'fs'

// Database file path - use absolute path for better compatibility
function getDbPath(): string {
  // In production, you might want to use an environment variable
  const dbDir = process.env.DATABASE_DIR || path.join(process.cwd(), 'data')
  const dbFile = process.env.DATABASE_FILE || 'markets.db'
  
  // Ensure data directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }
  
  return path.join(dbDir, dbFile)
}

// Initialize database connection
let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = getDbPath()
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL') // Enable Write-Ahead Logging for better performance
    initializeSchema(db)
  }
  return db
}

// Initialize database schema
function initializeSchema(database: Database.Database) {
  // Create table if it doesn't exist
  database.exec(`
    CREATE TABLE IF NOT EXISTS markets (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      description TEXT,
      slug TEXT,
      imageUrl TEXT,
      endDate TEXT,
      startDate TEXT,
      outcomes TEXT, -- JSON array
      volume REAL DEFAULT 0,
      liquidity REAL DEFAULT 0,
      marketMakerAddress TEXT,
      active INTEGER DEFAULT 1,
      archived INTEGER DEFAULT 0,
      closed INTEGER DEFAULT 0,
      resolutionSource TEXT,
      tags TEXT, -- JSON array
      createdAt TEXT,
      updatedAt TEXT,
      conditionId TEXT,
      clobTokenIds TEXT, -- JSON array
      yesPrice REAL,
      noPrice REAL,
      yesBuyPrice REAL,
      yesSellPrice REAL,
      noBuyPrice REAL,
      noSellPrice REAL,
      yesOrderBook TEXT, -- JSON object with bids/asks
      noOrderBook TEXT, -- JSON object with bids/asks
      priceSyncedAt TEXT,
      lastSyncedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_markets_active ON markets(active);
    CREATE INDEX IF NOT EXISTS idx_markets_closed ON markets(closed);
    CREATE INDEX IF NOT EXISTS idx_markets_volume ON markets(volume DESC);
    CREATE INDEX IF NOT EXISTS idx_markets_liquidity ON markets(liquidity DESC);
    CREATE INDEX IF NOT EXISTS idx_markets_createdAt ON markets(createdAt);
    CREATE INDEX IF NOT EXISTS idx_markets_tags ON markets(tags);
    CREATE INDEX IF NOT EXISTS idx_markets_priceSyncedAt ON markets(priceSyncedAt);
  `)

  // Add new columns if they don't exist (migration)
  try {
    const tableInfo = database.prepare("PRAGMA table_info(markets)").all() as any[]
    const columnNames = tableInfo.map((col: any) => col.name)
    
    const newColumns = [
      { name: 'yesBuyPrice', type: 'REAL' },
      { name: 'yesSellPrice', type: 'REAL' },
      { name: 'noBuyPrice', type: 'REAL' },
      { name: 'noSellPrice', type: 'REAL' },
      { name: 'yesOrderBook', type: 'TEXT' },
      { name: 'noOrderBook', type: 'TEXT' },
      { name: 'priceSyncedAt', type: 'TEXT' },
    ]

    for (const col of newColumns) {
      if (!columnNames.includes(col.name)) {
        try {
          database.exec(`ALTER TABLE markets ADD COLUMN ${col.name} ${col.type}`)
          console.log(`✅ Added column ${col.name} to markets table`)
        } catch (alterError: any) {
          // Column might already exist or table might not exist yet
          if (!alterError.message.includes('duplicate column')) {
            console.warn(`Warning adding column ${col.name}:`, alterError.message)
          }
        }
      }
    }
  } catch (error: any) {
    console.warn('Error during schema migration:', error.message)
  }
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
    outcomes: JSON.stringify(market.outcomes || []),
    volume: market.volume || 0,
    liquidity: market.liquidity || 0,
    marketMakerAddress: market.marketMakerAddress || null,
    active: market.active !== false ? 1 : 0,
    archived: market.archived ? 1 : 0,
    closed: market.closed ? 1 : 0,
    resolutionSource: market.resolutionSource || null,
    tags: JSON.stringify(market.tags || []),
    createdAt: market.createdAt || null,
    updatedAt: market.updatedAt || null,
    conditionId: market.conditionId || null,
    clobTokenIds: JSON.stringify(market.clobTokenIds || []),
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
    description: row.description || undefined,
    slug: row.slug || '',
    imageUrl: row.imageUrl || undefined,
    endDate: row.endDate || undefined,
    startDate: row.startDate || undefined,
    outcomes: row.outcomes ? JSON.parse(row.outcomes) : ['Yes', 'No'],
    volume: row.volume || 0,
    liquidity: row.liquidity || 0,
    marketMakerAddress: row.marketMakerAddress || undefined,
    active: row.active !== 0,
    archived: row.archived === 1,
    closed: row.closed === 1,
    resolutionSource: row.resolutionSource || undefined,
    tags: row.tags ? JSON.parse(row.tags) : [],
    createdAt: row.createdAt || undefined,
    updatedAt: row.updatedAt || undefined,
    conditionId: row.conditionId || undefined,
    clobTokenIds: row.clobTokenIds ? JSON.parse(row.clobTokenIds) : undefined,
    yesPrice: row.yesPrice ?? undefined,
    noPrice: row.noPrice ?? undefined,
    yesBuyPrice: row.yesBuyPrice ?? undefined,
    yesSellPrice: row.yesSellPrice ?? undefined,
    noBuyPrice: row.noBuyPrice ?? undefined,
    noSellPrice: row.noSellPrice ?? undefined,
    yesOrderBook: row.yesOrderBook ? JSON.parse(row.yesOrderBook) : undefined,
    noOrderBook: row.noOrderBook ? JSON.parse(row.noOrderBook) : undefined,
    priceSyncedAt: row.priceSyncedAt || undefined,
  }
}

// Database operations
export const dbOperations = {
  // Insert or update markets (upsert)
  upsertMarkets(markets: PolymarketMarket[]) {
    const database = getDb()
    const stmt = database.prepare(`
      INSERT INTO markets (
        id, question, description, slug, imageUrl, endDate, startDate,
        outcomes, volume, liquidity, marketMakerAddress, active, archived,
        closed, resolutionSource, tags, createdAt, updatedAt, conditionId,
        clobTokenIds, yesPrice, noPrice, yesBuyPrice, yesSellPrice, noBuyPrice,
        noSellPrice, yesOrderBook, noOrderBook, priceSyncedAt, lastSyncedAt
      ) VALUES (
        @id, @question, @description, @slug, @imageUrl, @endDate, @startDate,
        @outcomes, @volume, @liquidity, @marketMakerAddress, @active, @archived,
        @closed, @resolutionSource, @tags, @createdAt, @updatedAt, @conditionId,
        @clobTokenIds, @yesPrice, @noPrice, @yesBuyPrice, @yesSellPrice, @noBuyPrice,
        @noSellPrice, @yesOrderBook, @noOrderBook, @priceSyncedAt, @lastSyncedAt
      )
      ON CONFLICT(id) DO UPDATE SET
        question = excluded.question,
        description = excluded.description,
        slug = excluded.slug,
        imageUrl = excluded.imageUrl,
        endDate = excluded.endDate,
        startDate = excluded.startDate,
        outcomes = excluded.outcomes,
        volume = excluded.volume,
        liquidity = excluded.liquidity,
        marketMakerAddress = excluded.marketMakerAddress,
        active = excluded.active,
        archived = excluded.archived,
        closed = excluded.closed,
        resolutionSource = excluded.resolutionSource,
        tags = excluded.tags,
        createdAt = excluded.createdAt,
        updatedAt = excluded.updatedAt,
        conditionId = excluded.conditionId,
        clobTokenIds = excluded.clobTokenIds,
        yesPrice = COALESCE(excluded.yesPrice, markets.yesPrice),
        noPrice = COALESCE(excluded.noPrice, markets.noPrice),
        yesBuyPrice = COALESCE(excluded.yesBuyPrice, markets.yesBuyPrice),
        yesSellPrice = COALESCE(excluded.yesSellPrice, markets.yesSellPrice),
        noBuyPrice = COALESCE(excluded.noBuyPrice, markets.noBuyPrice),
        noSellPrice = COALESCE(excluded.noSellPrice, markets.noSellPrice),
        yesOrderBook = COALESCE(excluded.yesOrderBook, markets.yesOrderBook),
        noOrderBook = COALESCE(excluded.noOrderBook, markets.noOrderBook),
        priceSyncedAt = COALESCE(excluded.priceSyncedAt, markets.priceSyncedAt),
        lastSyncedAt = excluded.lastSyncedAt
    `)

    const insertMany = database.transaction((markets: PolymarketMarket[]) => {
      for (const market of markets) {
        stmt.run(marketToRow(market))
      }
    })

    insertMany(markets)
    return markets.length
  },

  // Get all active markets
  getAllActiveMarkets(): PolymarketMarket[] {
    const database = getDb()
    const rows = database.prepare(`
      SELECT * FROM markets
      WHERE active = 1 AND closed = 0
      ORDER BY volume DESC, liquidity DESC
    `).all()
    return rows.map(rowToMarket)
  },

  // Get top markets by sort criteria
  getTopMarkets(
    limit: number,
    offset: number,
    sortBy: 'volume' | 'liquidity' | 'newest' | 'oldest' = 'volume'
  ): { markets: PolymarketMarket[]; total: number } {
    const database = getDb()
    
    let orderBy = 'volume DESC, liquidity DESC'
    switch (sortBy) {
      case 'liquidity':
        orderBy = 'liquidity DESC, volume DESC'
        break
      case 'newest':
        orderBy = 'createdAt DESC'
        break
      case 'oldest':
        orderBy = 'createdAt ASC'
        break
    }

    const markets = database.prepare(`
      SELECT * FROM markets
      WHERE active = 1 AND closed = 0
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `).all(limit, offset).map(rowToMarket)

    const total = database.prepare(`
      SELECT COUNT(*) as count FROM markets
      WHERE active = 1 AND closed = 0
    `).get() as { count: number }

    return { markets, total: total.count }
  },

  // Search markets
  searchMarkets(
    query: string,
    filters: {
      tags?: string[]
      minVolume?: number
      minLiquidity?: number
      minOdds?: number // 0-1 decimal
      maxOdds?: number // 0-1 decimal
    },
    sortBy: 'volume' | 'liquidity' | 'newest' | 'oldest' = 'volume',
    limit: number,
    offset: number
  ): { markets: PolymarketMarket[]; total: number } {
    const database = getDb()
    
    let whereConditions = ['active = 1', 'closed = 0']
    const params: any[] = []

    // Text search
    if (query.trim()) {
      whereConditions.push(`(question LIKE ? OR description LIKE ?)`)
      const searchTerm = `%${query.trim()}%`
      params.push(searchTerm, searchTerm)
    }

    // Tag filter - search in JSON array (case-insensitive)
    if (filters.tags && filters.tags.length > 0) {
      // Tags are stored as lowercase JSON array: ["politics","elections"]
      // We need to match any of the selected tags in the array
      const tagConditions = filters.tags.map(() => {
        // Match tag in JSON array - check for quoted tag in array
        return `LOWER(tags) LIKE ?`
      }).join(' OR ')
      whereConditions.push(`(${tagConditions})`)
      filters.tags.forEach(tag => {
        const lowerTag = tag.toLowerCase().trim()
        // Match tag in JSON array format: ["tag"] or ["tag", ...] or [...,"tag",...]
        // Use pattern that matches the tag as a JSON array element (quoted)
        params.push(`%"${lowerTag}"%`)
      })
    }

    // Volume filter
    if (filters.minVolume && filters.minVolume > 0) {
      whereConditions.push('volume >= ?')
      params.push(filters.minVolume)
    }

    // Liquidity filter
    if (filters.minLiquidity && filters.minLiquidity > 0) {
      whereConditions.push('liquidity >= ?')
      params.push(filters.minLiquidity)
    }

    // Min odds filter (yesPrice is 0-1)
    if (filters.minOdds !== undefined) {
      whereConditions.push('COALESCE(yesPrice, 0.5) >= ?')
      params.push(filters.minOdds)
    }

    // Max odds filter (yesPrice is 0-1)
    if (filters.maxOdds !== undefined) {
      whereConditions.push('COALESCE(yesPrice, 0.5) <= ?')
      params.push(filters.maxOdds)
    }

    const whereClause = whereConditions.join(' AND ')

    let orderBy = 'volume DESC, liquidity DESC'
    switch (sortBy) {
      case 'liquidity':
        orderBy = 'liquidity DESC, volume DESC'
        break
      case 'newest':
        orderBy = 'createdAt DESC'
        break
      case 'oldest':
        orderBy = 'createdAt ASC'
        break
    }

    const markets = database.prepare(`
      SELECT * FROM markets
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset).map(rowToMarket)

    const total = database.prepare(`
      SELECT COUNT(*) as count FROM markets
      WHERE ${whereClause}
    `).get(...params) as { count: number }

    return { markets, total: total.count }
  },

  // Get market by ID
  getMarketById(id: string): PolymarketMarket | null {
    const database = getDb()
    const row = database.prepare('SELECT * FROM markets WHERE id = ?').get(id) as any
    return row ? rowToMarket(row) : null
  },

  // Get store stats
  getStats() {
    const database = getDb()
    const total = database.prepare('SELECT COUNT(*) as count FROM markets WHERE active = 1 AND closed = 0').get() as { count: number }
    const lastUpdated = database.prepare('SELECT MAX(lastSyncedAt) as lastUpdated FROM markets').get() as { lastUpdated: string | null }
    
    return {
      totalMarkets: total.count,
      lastUpdated: lastUpdated.lastUpdated,
      updateInProgress: false, // This would need to be tracked separately if needed
    }
  },

  // Clear all markets
  clearAll() {
    const database = getDb()
    database.prepare('DELETE FROM markets').run()
  },

  // Update prices and order book for a market
  updateMarketPrices(
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
    const database = getDb()
    const stmt = database.prepare(`
      UPDATE markets SET
        yesPrice = COALESCE(?, yesPrice),
        noPrice = COALESCE(?, noPrice),
        yesBuyPrice = COALESCE(?, yesBuyPrice),
        yesSellPrice = COALESCE(?, yesSellPrice),
        noBuyPrice = COALESCE(?, noBuyPrice),
        noSellPrice = COALESCE(?, noSellPrice),
        yesOrderBook = COALESCE(?, yesOrderBook),
        noOrderBook = COALESCE(?, noOrderBook),
        priceSyncedAt = ?
      WHERE id = ?
    `)
    
    stmt.run(
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
    )
  },

  // Get markets by IDs
  getMarketsByIds(ids: string[]): PolymarketMarket[] {
    if (ids.length === 0) return []
    const database = getDb()
    const placeholders = ids.map(() => '?').join(',')
    const rows = database.prepare(`
      SELECT * FROM markets
      WHERE id IN (${placeholders})
    `).all(...ids) as any[]
    return rows.map(rowToMarket)
  },
}

