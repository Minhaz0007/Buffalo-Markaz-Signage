# ⚡ Supabase Quick Setup - 5 Minutes

## What You'll Get
✅ Real-time sync across all devices
✅ Centralized settings management
✅ Automatic updates when settings change

---

## Step-by-Step Instructions

### 1️⃣ Create Supabase Project (2 min)

1. Go to https://supabase.com/ → Sign in with GitHub
2. Click **"New Project"**
3. Enter:
   - Name: `buffalo-markaz-signage`
   - Password: (create and save it)
   - Region: **US East**
4. Click **"Create new project"**
5. ☕ Wait 2 minutes for setup

### 2️⃣ Copy Your API Keys (30 sec)

1. In Supabase dashboard → Click **Settings** (left sidebar)
2. Click **API**
3. **COPY THESE TWO VALUES:**

```
Project URL: https://xxxxx.supabase.co
Anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ...
```

**⚠️ Keep these safe - you'll need them for Vercel!**

### 3️⃣ Run SQL Scripts (2 min)

1. In Supabase dashboard → Click **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Copy/paste each script below and click **"Run"** after each

---

#### Script 1: Create Tables ✅

```sql
-- COPY ENTIRE CONTENTS OF: 01-schema.sql
-- Paste here and click RUN
```

**Wait for:** ✓ Success. No rows returned

---

#### Script 2: Setup Security ✅

```sql
-- COPY ENTIRE CONTENTS OF: 02-security.sql
-- Paste here and click RUN
```

**Wait for:** ✓ Success. No rows returned

---

#### Script 3: Enable Real-time ✅

```sql
-- COPY ENTIRE CONTENTS OF: 03-realtime.sql
-- Paste here and click RUN
```

**Wait for:** ✓ Success

---

#### Script 4: Add Default Data (Optional) ✅

```sql
-- COPY ENTIRE CONTENTS OF: 04-seed-data.sql
-- Paste here and click RUN
```

**Wait for:** ✓ Success

---

### 4️⃣ Verify Setup (30 sec)

Run this verification query:

```sql
-- Verify tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**You should see:**
```
announcements
mosque_settings
prayer_overrides
prayer_schedule
slides
```

✅ **Perfect! Database is ready!**

---

### 5️⃣ Add to Vercel (1 min)

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add these two variables:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | Paste your Project URL from Step 2 |
| `VITE_SUPABASE_ANON_KEY` | Paste your Anon key from Step 2 |

4. Select **All environments** (Production, Preview, Development)
5. Click **Save**
6. **Redeploy your app** (Settings → Deployments → Redeploy)

---

## ✅ You're Done!

Your database is now set up and ready for real-time sync!

### What Happens Next?

Once you integrate the Supabase client in your app:
- ✅ All settings sync automatically across devices
- ✅ Changes update in real-time (no page refresh needed)
- ✅ Multiple displays stay in sync
- ✅ Admin panel can control all displays remotely

---

## 🆘 Having Issues?

**SQL errors?**
- Make sure you ran scripts in order (1, 2, 3, 4)
- Check you're in the correct project

**Can't find SQL Editor?**
- Left sidebar → SQL Editor (icon looks like `</>`)

**Real-time not working?**
- Run this check:
```sql
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```
Should return 5 rows (one for each table)

**Need to start over?**
```sql
-- Drop all tables and start fresh
DROP TABLE IF EXISTS mosque_settings CASCADE;
DROP TABLE IF EXISTS prayer_schedule CASCADE;
DROP TABLE IF EXISTS prayer_overrides CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS slides CASCADE;

-- Then re-run scripts 1-4
```

---

## 📞 Next Step

Your database is ready! Now you need to:
1. Install Supabase client: `npm install @supabase/supabase-js`
2. Create Supabase hooks to sync your React state
3. Integrate into your app

See `DATABASE_GUIDE.md` for integration code!
