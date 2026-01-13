# Hosting & Database Setup Summary

## 🎯 Current Situation

- **Database:** SQLite (file-based, in `/data/markets.db`)
- **Backend:** Next.js API routes
- **Challenge:** SQLite doesn't work with serverless hosting

## ✅ What I've Created

### Documentation
- **DEPLOYMENT.md** - Complete hosting guide with all options
- **QUICK_START_DEPLOY.md** - Fast 15-minute deployment guide
- **README_DEPLOYMENT.md** - Overview and summary

### Code Files
- **lib/db-postgres.ts** - PostgreSQL adapter (drop-in replacement)
- **lib/db-adapter.ts** - Auto-detecting adapter (SQLite or PostgreSQL)
- **scripts/migrate-to-postgres.ts** - Migration script

### Configuration Files
- **railway.json** - Railway deployment config
- **Dockerfile** - For container-based hosting
- **fly.toml** - Fly.io configuration
- **vercel.json** - Vercel configuration
- **.env.example** - Environment variables template

## 🚀 Recommended: Railway (Easiest)

**Why Railway:**
- ✅ Easiest setup (15 minutes)
- ✅ PostgreSQL included
- ✅ Persistent storage available
- ✅ $5/month (free credit to start)
- ✅ Auto-deploys from GitHub

**Steps:**
1. Sign up at railway.app
2. Create project from GitHub
3. Add PostgreSQL service
4. Set `DATABASE_URL` environment variable
5. Update code to use PostgreSQL (see below)
6. Deploy!

## 📝 Code Changes Required

### Step 1: Update Database Imports

**Files to update:**
- `app/api/markets/store/route.ts`
- `app/api/markets/search/route.ts`
- `app/api/markets/top/route.ts`
- `app/api/markets/[id]/route.ts`
- `app/api/markets/sync-prices/route.ts`

**Change:**
```typescript
// From:
import { dbOperations } from '@/lib/db'

// To:
import { dbOperations } from '@/lib/db-postgres'
// OR use auto-detecting adapter:
import { dbOperations } from '@/lib/db-adapter'
```

**Note:** PostgreSQL adapter uses async/await, so you may need to add `await` to some calls.

### Step 2: Install PostgreSQL Package

```bash
npm install pg @types/pg
```

### Step 3: Run Migration (One-time)

After setting up PostgreSQL:

```bash
DATABASE_URL="postgresql://user:pass@host:5432/db" npx tsx scripts/migrate-to-postgres.ts
```

## 🔄 Alternative: Keep SQLite

If you want to keep SQLite, use platforms with persistent storage:
- **Railway** (with volume)
- **Fly.io** (with volume)
- **DigitalOcean** (with spaces)
- **Self-hosted VPS**

## 📊 Database Options Comparison

| Option | Pros | Cons | Best For |
|--------|------|------|----------|
| **PostgreSQL** | Works everywhere, scalable, production-ready | Requires migration | Most hosting platforms |
| **Turso** | SQLite-compatible, serverless-friendly | Newer service | Vercel/serverless |
| **SQLite + Volume** | No migration needed | Limited platforms | Railway/Fly.io |

## 🎬 Quick Start (Railway)

```bash
# 1. Install PostgreSQL types
npm install pg @types/pg

# 2. Update imports in API routes
# (Change @/lib/db to @/lib/db-postgres)

# 3. Deploy to Railway
# - Connect GitHub repo
# - Add PostgreSQL service
# - Set DATABASE_URL

# 4. Run migration
DATABASE_URL="<railway-url>" npx tsx scripts/migrate-to-postgres.ts

# 5. Done! Your app is live
```

## 📚 Next Steps

1. **Read** `QUICK_START_DEPLOY.md` for detailed steps
2. **Choose** your hosting platform
3. **Set up** database
4. **Update** code imports
5. **Migrate** data
6. **Deploy!**

## 🆘 Need Help?

- See `DEPLOYMENT.md` for detailed platform guides
- See `QUICK_START_DEPLOY.md` for step-by-step instructions
- Check migration script for database setup

---

**Ready to deploy?** Start with `QUICK_START_DEPLOY.md` → Railway section!

