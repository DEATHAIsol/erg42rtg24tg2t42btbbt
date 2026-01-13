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
 */

// Auto-detect which database to use based on environment
const usePostgres = !!process.env.DATABASE_URL

let dbOperations: any

if (usePostgres) {
  // Use PostgreSQL in production
  if (typeof window === 'undefined') {
    console.log('📊 Using PostgreSQL database')
  }
  const pgDb = require('./db-postgres')
  dbOperations = pgDb.dbOperations
} else {
  // Use SQLite in development
  if (typeof window === 'undefined') {
    console.log('📊 Using SQLite database')
  }
  const sqliteDb = require('./db')
  dbOperations = sqliteDb.dbOperations
}

export { dbOperations }

