/**
 * Database adapter that supports both SQLite (dev) and PostgreSQL (production)
 * 
 * Usage:
 * - Set DATABASE_URL for PostgreSQL
 * - Leave unset for SQLite (development)
 * 
 * Import this instead of './db' or './db-postgres'
 * 
 * Example:
 *   import { dbOperations } from '@/lib/db-adapter'
 *   await dbOperations.getMarketById(id)  // Always use await, even for SQLite
 */

// Auto-detect which database to use based on environment
const usePostgres = !!process.env.DATABASE_URL

let dbOperations: any

if (usePostgres) {
  // Use PostgreSQL in production (already async)
  if (typeof window === 'undefined') {
    console.log('📊 Using PostgreSQL database')
  }
  const pgDb = require('./db-postgres')
  dbOperations = pgDb.dbOperations
} else {
  // Use SQLite in development - wrap sync operations in promises for async compatibility
  if (typeof window === 'undefined') {
    console.log('📊 Using SQLite database (wrapped for async compatibility)')
  }
  const sqliteDb = require('./db')
  const sqliteOps = sqliteDb.dbOperations
  
  // Wrap all SQLite operations to return promises (for async/await compatibility)
  dbOperations = {
    async upsertMarkets(markets: any[]) {
      return Promise.resolve(sqliteOps.upsertMarkets(markets))
    },
    async getAllMarkets() {
      return Promise.resolve(sqliteOps.getAllActiveMarkets())
    },
    async getMarketById(id: string) {
      return Promise.resolve(sqliteOps.getMarketById(id))
    },
    async searchMarkets(query: string, filters?: any, sortBy?: any, limit?: number, offset?: number) {
      return Promise.resolve(sqliteOps.searchMarkets(query, filters || {}, sortBy, limit, offset))
    },
    async getTopMarkets(limit: number, offset: number, sortBy?: any) {
      return Promise.resolve(sqliteOps.getTopMarkets(limit, offset, sortBy))
    },
    async getStats() {
      return Promise.resolve(sqliteOps.getStats())
    },
    async clearAll() {
      return Promise.resolve(sqliteOps.clearAll())
    },
    async updateMarketPrices(marketId: string, priceData: any) {
      return Promise.resolve(sqliteOps.updateMarketPrices(marketId, priceData))
    },
    async getMarketsByIds(ids: string[]) {
      return Promise.resolve(sqliteOps.getMarketsByIds(ids))
    },
  }
}

export { dbOperations }

