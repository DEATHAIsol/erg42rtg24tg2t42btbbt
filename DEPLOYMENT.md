# Deployment Guide for Probio Markets

## Current Setup Analysis

Your application uses:
- **Next.js 14** (App Router)
- **SQLite** (better-sqlite3) - stored in `/data/markets.db`
- **Next.js API Routes** for backend
- **Client-side state** (localStorage for wallet/parlays)

## Challenge: SQLite in Production

SQLite is file-based and doesn't work well with:
- Serverless functions (Vercel, Netlify)
- Ephemeral file systems
- Multiple server instances

## Hosting Options

### Option 1: Vercel (Recommended for Next.js) ⭐

**Pros:**
- Built for Next.js (made by Next.js creators)
- Free tier with generous limits
- Automatic deployments from Git
- Edge functions support
- Easy SSL/CDN

**Cons:**
- Serverless functions (need database migration)
- 10-second function timeout on free tier
- No persistent file storage

**Database Migration Required:**
- Migrate to PostgreSQL (Vercel Postgres, Supabase, Neon)
- Or use Turso (SQLite-compatible, serverless-friendly)

**Steps:**
1. Sign up at [vercel.com](https://vercel.com)
2. Connect GitHub repository
3. Migrate database (see Database Migration section)
4. Add environment variables
5. Deploy

---

### Option 2: Railway ⭐⭐

**Pros:**
- Supports persistent volumes (can keep SQLite!)
- PostgreSQL included
- Simple deployment
- $5/month starter plan
- Good for databases

**Cons:**
- Paid service (free trial available)
- Less Next.js-optimized than Vercel

**Steps:**
1. Sign up at [railway.app](https://railway.app)
2. Create new project from GitHub
3. Add PostgreSQL service (or use persistent volume for SQLite)
4. Set environment variables
5. Deploy

---

### Option 3: Render

**Pros:**
- Free tier available
- PostgreSQL included
- Persistent disk storage
- Good documentation

**Cons:**
- Free tier spins down after inactivity
- Slower cold starts

**Steps:**
1. Sign up at [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repository
4. Add PostgreSQL database
5. Configure build/start commands
6. Deploy

---

### Option 4: Fly.io

**Pros:**
- Supports persistent volumes
- Global edge deployment
- Can run SQLite with volumes
- Good for full-stack apps

**Cons:**
- More complex setup
- Requires Docker knowledge

**Steps:**
1. Sign up at [fly.io](https://fly.io)
2. Install flyctl CLI
3. Create Dockerfile
4. Configure persistent volumes
5. Deploy

---

### Option 5: DigitalOcean App Platform

**Pros:**
- Managed PostgreSQL
- Persistent storage
- Simple deployment
- $5/month starter

**Cons:**
- Paid service
- Less Next.js-specific

---

## Database Migration Strategies

### Strategy A: Migrate to PostgreSQL (Recommended)

**Why:** Works with all hosting platforms, better for production

**Options:**
1. **Vercel Postgres** - Integrated with Vercel
2. **Supabase** - Free tier, PostgreSQL + real-time
3. **Neon** - Serverless PostgreSQL
4. **Railway Postgres** - Included with Railway
5. **Render Postgres** - Included with Render

**Migration Steps:**
1. Install PostgreSQL client library (`pg` or `@vercel/postgres`)
2. Create migration script to convert SQLite → PostgreSQL
3. Update `lib/db.ts` to use PostgreSQL
4. Test locally
5. Deploy

---

### Strategy B: Use Turso (SQLite-Compatible)

**Why:** Keep SQLite syntax, but serverless-friendly

**Pros:**
- No code changes needed (SQLite-compatible)
- Serverless-friendly
- Edge replication
- Free tier available

**Steps:**
1. Sign up at [turso.tech](https://turso.tech)
2. Create database
3. Install `@libsql/client`
4. Update connection in `lib/db.ts`
5. Deploy

---

### Strategy C: Keep SQLite with Persistent Storage

**Platforms that support this:**
- Railway (volumes)
- Fly.io (volumes)
- DigitalOcean (spaces/volumes)
- Self-hosted (VPS)

**Pros:**
- No migration needed
- Keep existing code

**Cons:**
- Limited hosting options
- Not scalable across multiple instances

---

## Recommended Approach

### For Quick Deployment: Railway + PostgreSQL

1. **Deploy to Railway**
   - Easiest setup
   - PostgreSQL included
   - Persistent storage available

2. **Migrate to PostgreSQL**
   - Better for production
   - Works with all platforms
   - Scalable

### For Best Performance: Vercel + Turso

1. **Deploy to Vercel**
   - Optimized for Next.js
   - Fast global CDN
   - Free tier

2. **Use Turso**
   - SQLite-compatible (minimal code changes)
   - Serverless-friendly
   - Edge replication

---

## Migration Scripts Needed

### 1. PostgreSQL Migration

Create `scripts/migrate-to-postgres.ts`:
- Read SQLite database
- Convert to PostgreSQL schema
- Insert data into PostgreSQL
- Verify migration

### 2. Database Abstraction Layer

Update `lib/db.ts` to support:
- SQLite (development)
- PostgreSQL (production)
- Turso (alternative)

---

## Environment Variables Needed

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname
# OR for Turso
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token

# Optional
DATABASE_DIR=/data
DATABASE_FILE=markets.db

# Solana
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## Next Steps

1. **Choose hosting platform** (recommend Railway or Vercel)
2. **Choose database** (recommend PostgreSQL or Turso)
3. **Create migration scripts**
4. **Update database connection code**
5. **Test locally**
6. **Deploy**

Would you like me to:
- Create PostgreSQL migration scripts?
- Update `lib/db.ts` to support multiple databases?
- Create deployment configuration files?
- Set up a specific hosting platform?

