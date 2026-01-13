// Quick test script to verify Supabase connection
const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('❌ DATABASE_URL not found in .env.local')
  process.exit(1)
}

console.log('🔌 Testing Supabase connection...')
console.log('📍 Connection string:', connectionString.substring(0, 50) + '...')

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
})

pool.query('SELECT NOW() as current_time, version() as pg_version')
  .then((result) => {
    console.log('✅ Connection successful!')
    console.log('⏰ Current time:', result.rows[0].current_time)
    console.log('📊 PostgreSQL version:', result.rows[0].pg_version.split(' ')[0] + ' ' + result.rows[0].pg_version.split(' ')[1])
    
    // Check if markets table exists
    return pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'markets'
      ) as table_exists
    `)
  })
  .then((result) => {
    const tableExists = result.rows[0].table_exists
    if (tableExists) {
      console.log('✅ Markets table exists')
      return pool.query('SELECT COUNT(*) as count FROM markets')
    } else {
      console.log('ℹ️  Markets table does not exist yet (will be created on first API call)')
      return Promise.resolve({ rows: [{ count: 0 }] })
    }
  })
  .then((result) => {
    console.log('📈 Markets in database:', result.rows[0].count)
    pool.end()
    console.log('\n✅ All checks passed! Your local environment is ready to use Supabase.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Connection failed:', error.message)
    console.error('\nTroubleshooting:')
    console.error('1. Check your DATABASE_URL in .env.local')
    console.error('2. Verify your Supabase project is active')
    console.error('3. Check your database password is correct')
    pool.end()
    process.exit(1)
  })



