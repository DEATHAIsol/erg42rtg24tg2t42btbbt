# Quick Start Deployment Guide

## 🚀 Fastest Path to Production

### Option 1: Railway (Recommended - Easiest) ⭐

**Time: ~15 minutes**

1. **Sign up at [railway.app](https://railway.app)**
   - Free $5 credit to start
   - No credit card needed initially

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your repository

3. **Add PostgreSQL Database**
   - Click "+ New" → "Database" → "Add PostgreSQL"
   - Railway automatically creates a database
   - Copy the `DATABASE_URL` from the database settings

4. **Configure Environment Variables**
   - In your project settings, add:
     ```
     DATABASE_URL=<paste from PostgreSQL service>
     NODE_ENV=production
     ```

5. **Deploy**
   - Railway auto-detects Next.js
   - Builds and deploys automatically
   - Your app will be live at `your-app.railway.app`

6. **Migrate Database** (One-time)
   - After first deploy, run migration:
   ```bash
   # Update lib/db.ts imports to use db-postgres.ts
   # Or use the migration script:
   DATABASE_URL=<your-url> npx tsx scripts/migrate-to-postgres.ts
   ```

**Cost:** $5/month after free credit

---

### Option 2: Vercel + Supabase (Best for Next.js) ⭐⭐

**Time: ~20 minutes**

1. **Deploy to Vercel**
   - Sign up at [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel auto-detects Next.js and deploys

2. **Create Supabase Database**
   - Sign up at [supabase.com](https://supabase.com) (free tier)
   - Create new project
   - Go to Settings → Database
   - Copy "Connection string" (URI format)

3. **Add Environment Variables in Vercel**
   - Project Settings → Environment Variables
   - Add `DATABASE_URL` with your Supabase connection string

4. **Update Code for PostgreSQL**
   - Replace `lib/db.ts` imports with `lib/db-postgres.ts`
   - Or use the adapter pattern (see `lib/db-adapter.ts`)

5. **Run Migration**
   ```bash
   DATABASE_URL=<supabase-url> npx tsx scripts/migrate-to-postgres.ts
   ```

6. **Redeploy**
   - Push to GitHub or trigger redeploy in Vercel

**Cost:** Free tier available

---

### Option 3: Render (Free Tier Available)

**Time: ~25 minutes**

1. **Sign up at [render.com](https://render.com)**

2. **Create PostgreSQL Database**
   - New → PostgreSQL
   - Copy internal database URL

3. **Create Web Service**
   - New → Web Service
   - Connect GitHub repo
   - Build command: `npm install && npm run build`
   - Start command: `npm start`

4. **Add Environment Variables**
   - `DATABASE_URL` (from PostgreSQL service)
   - `NODE_ENV=production`

5. **Deploy and Migrate**
   - Same as Railway steps

**Cost:** Free tier (spins down after inactivity)

---

## 🔧 Pre-Deployment Checklist

- [ ] Update `lib/db.ts` imports to use PostgreSQL adapter
- [ ] Test migration script locally
- [ ] Set up environment variables
- [ ] Update `next.config.js` if needed
- [ ] Test build: `npm run build`
- [ ] Verify database connection

---

## 📝 Code Changes Needed

### Step 1: Update Database Imports

In all API routes, change:
```typescript
// From:
import { dbOperations } from '@/lib/db'

// To (for PostgreSQL):
import { dbOperations } from '@/lib/db-postgres'

// Or use adapter (auto-detects):
import { dbOperations } from '@/lib/db-adapter'
```

### Step 2: Install PostgreSQL Package

```bash
npm install pg @types/pg
```

### Step 3: Update API Routes

Files that need updating:
- `app/api/markets/store/route.ts`
- `app/api/markets/search/route.ts`
- `app/api/markets/top/route.ts`
- `app/api/markets/[id]/route.ts`
- `app/api/markets/sync-prices/route.ts`

---

## 🧪 Testing Locally with PostgreSQL

1. **Install PostgreSQL locally** (or use Docker):
   ```bash
   # macOS
   brew install postgresql
   brew services start postgresql
   
   # Create database
   createdb probio_markets
   ```

2. **Set environment variable**:
   ```bash
   export DATABASE_URL="postgresql://localhost:5432/probio_markets"
   ```

3. **Run migration**:
   ```bash
   DATABASE_URL="postgresql://localhost:5432/probio_markets" npx tsx scripts/migrate-to-postgres.ts
   ```

4. **Update imports and test**:
   - Change imports to `db-postgres`
   - Run `npm run dev`
   - Test API endpoints

---

## 🆘 Troubleshooting

### "Module not found: better-sqlite3"
- This is expected in serverless environments
- Use PostgreSQL adapter instead

### "DATABASE_URL not set"
- Make sure environment variable is set in hosting platform
- Check it's available at build time (not just runtime)

### "Connection refused"
- Check database is accessible from hosting platform
- Verify firewall/network settings
- For Vercel, use connection pooling URL

### Migration fails
- Check database permissions
- Verify schema doesn't already exist
- Check connection string format

---

## 📚 Next Steps After Deployment

1. **Set up custom domain** (optional)
2. **Configure SSL** (usually automatic)
3. **Set up monitoring** (Vercel Analytics, etc.)
4. **Configure backups** (database backups)
5. **Set up CI/CD** (automatic deployments)

---

## 💡 Pro Tips

- **Use connection pooling** for serverless (Supabase, Neon provide this)
- **Monitor database size** (free tiers have limits)
- **Set up database backups** before going live
- **Use environment-specific configs** (dev/staging/prod)
- **Test migrations** on staging first

---

Need help? Check `DEPLOYMENT.md` for detailed platform-specific guides.

