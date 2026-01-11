# Supabase Setup Guide for Buffalo Markaz Signage

This directory contains all SQL scripts needed to set up real-time database sync across multiple devices.

## 📋 Overview

The database will sync the following settings across all devices:
- ✅ Prayer schedule (Excel uploads)
- ✅ Manual prayer time overrides
- ✅ Announcements and ticker settings
- ✅ Theme preferences
- ✅ Maghrib offset
- ✅ Mobile alert settings
- ✅ Auto-alert settings
- ✅ Slideshow configuration

**Note:** Prayer times (auto-calculated by adhan library) don't need database sync - they calculate identically on each device!

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Create Supabase Project

1. Go to https://supabase.com/
2. Sign in with GitHub
3. Click "New Project"
4. Fill in:
   - **Name**: `buffalo-markaz-signage`
   - **Database Password**: (save this - you won't need it often)
   - **Region**: US East (closest to Buffalo)
5. Click "Create new project"
6. Wait 2 minutes for setup

### Step 2: Get Your API Keys

1. In Supabase dashboard → **Settings** → **API**
2. Copy these values (you'll need them later):
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon/Public Key**: `eyJhbGc...` (long string)

### Step 3: Run SQL Scripts

**IMPORTANT: Run these scripts IN ORDER**

1. Go to **SQL Editor** in Supabase dashboard
2. Click "New Query"
3. Copy and paste each script below in order
4. Click "Run" after each one

#### 3.1 - Schema (Required)
```sql
-- Copy contents from: 01-schema.sql
-- This creates all tables and indexes
```
**What it does:**
- Creates 5 tables: mosque_settings, prayer_schedule, prayer_overrides, announcements, slides
- Adds performance indexes
- Sets up auto-update triggers

#### 3.2 - Security (Required)
```sql
-- Copy contents from: 02-security.sql
-- This sets up Row Level Security policies
```
**What it does:**
- Enables Row Level Security on all tables
- Creates policies allowing public read/write (you can add auth later)
- Protects your data with Supabase security

#### 3.3 - Real-time (Required)
```sql
-- Copy contents from: 03-realtime.sql
-- This enables real-time subscriptions
```
**What it does:**
- Enables real-time updates on all tables
- Creates helper functions for bulk operations
- Sets up efficient queries

#### 3.4 - Seed Data (Optional)
```sql
-- Copy contents from: 04-seed-data.sql
-- This adds default settings
```
**What it does:**
- Populates database with default settings
- Adds default announcements
- Sets up default slideshow config
- **Optional**: Skip if you want to start fresh

### Step 4: Verify Setup

Run this query in SQL Editor to verify everything is working:

```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should return:
-- announcements
-- mosque_settings
-- prayer_overrides
-- prayer_schedule
-- slides

-- Check real-time is enabled
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';

-- Should return all 5 tables
```

---

## 📊 Database Schema

### Table: `mosque_settings`
Stores general app settings in flexible JSONB format.

| Column | Type | Description |
|--------|------|-------------|
| `mosque_id` | TEXT | Mosque identifier (default: 'buffalo-markaz') |
| `setting_key` | TEXT | Setting name (e.g., 'app_theme') |
| `setting_value` | JSONB | Setting value (any structure) |

**Stored Settings:**
- `app_theme` - Theme name (starry/lattice/arabesque)
- `maghrib_offset` - Minutes to offset Maghrib Iqamah
- `ticker_bg` - Ticker background (white/navy)
- `auto_alert_settings` - Auto-alert configuration
- `mobile_alert_settings` - Mobile alert configuration
- `announcement_title` - Ticker title text

### Table: `prayer_schedule`
Stores daily prayer times from Excel uploads.

| Column | Type | Description |
|--------|------|-------------|
| `date` | DATE | Prayer date (YYYY-MM-DD) |
| `fajr_start` | TEXT | Fajr start time (e.g., "5:30 AM") |
| `fajr_iqamah` | TEXT | Fajr Iqamah time |
| *(similar for dhuhr, asr, maghrib, isha)* | | |
| `jumuah_iqamah` | TEXT | Friday prayer Iqamah |

### Table: `prayer_overrides`
Manual overrides for specific date ranges.

| Column | Type | Description |
|--------|------|-------------|
| `override_id` | TEXT | Client-side ID |
| `prayer_key` | TEXT | Prayer name (fajr/dhuhr/asr/maghrib/isha/jumuah) |
| `start_date` | DATE | Override start date |
| `end_date` | DATE | Override end date |
| `start_time` | TEXT | Prayer start time |
| `iqamah_time` | TEXT | Iqamah time |

### Table: `announcements`
Ticker announcement items.

| Column | Type | Description |
|--------|------|-------------|
| `item_id` | TEXT | Client-side ID |
| `text` | TEXT | Announcement text |
| `color` | TEXT | Text color (hex) |
| `animation` | TEXT | Animation type (none/pulse/blink) |
| `display_order` | INTEGER | Sort order |

### Table: `slides`
Slideshow configuration.

| Column | Type | Description |
|--------|------|-------------|
| `slide_id` | TEXT | Client-side ID |
| `slide_type` | TEXT | Type (CLOCK/ANNOUNCEMENT/SCHEDULE) |
| `enabled` | BOOLEAN | Is slide active? |
| `duration` | INTEGER | Display duration (seconds) |
| `config` | JSONB | Slide-specific settings |

---

## 🔧 Helper Functions

### `get_all_settings(p_mosque_id)`
Returns all settings for a mosque.

```sql
SELECT * FROM get_all_settings('buffalo-markaz');
```

### `upsert_setting(p_mosque_id, p_setting_key, p_setting_value)`
Insert or update a setting.

```sql
SELECT upsert_setting(
  'buffalo-markaz',
  'app_theme',
  '"starry"'::jsonb
);
```

### `get_prayer_schedule(p_mosque_id, p_start_date, p_end_date)`
Get prayer schedule for date range.

```sql
SELECT * FROM get_prayer_schedule(
  'buffalo-markaz',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '30 days'
);
```

### `bulk_insert_schedule(p_mosque_id, p_schedule)`
Bulk insert prayer schedule (for Excel uploads).

```sql
SELECT bulk_insert_schedule(
  'buffalo-markaz',
  '[
    {
      "date": "2024-01-15",
      "fajr_start": "6:00 AM",
      "fajr_iqamah": "6:30 AM",
      ...
    }
  ]'::jsonb
);
```

---

## 🔒 Security Notes

### Current Setup: Public Access
- ✅ Good for: Single mosque, trusted network
- ❌ Risk: Anyone with your URL can modify settings

**Recommended for production:** Add authentication

### To Add Authentication Later:

1. **Enable Supabase Auth:**
   - Go to Authentication in Supabase dashboard
   - Enable email/password or magic link
   - Create admin users

2. **Update Policies:**
   Replace public policies with authenticated ones:

```sql
-- Remove old policy
DROP POLICY "Allow public write to settings" ON mosque_settings;

-- Add authenticated policy
CREATE POLICY "Authenticated users can write"
  ON mosque_settings
  FOR ALL
  TO authenticated
  USING (true);
```

3. **Add Role-Based Access (Optional):**

```sql
-- Only admins can write
CREATE POLICY "Admins can write"
  ON mosque_settings
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');
```

---

## 🧪 Testing Queries

### Check Current Settings:
```sql
SELECT * FROM mosque_settings WHERE mosque_id = 'buffalo-markaz';
```

### Check Announcements:
```sql
SELECT * FROM announcements
WHERE mosque_id = 'buffalo-markaz'
ORDER BY display_order;
```

### Check Today's Prayer Times:
```sql
SELECT * FROM prayer_schedule
WHERE mosque_id = 'buffalo-markaz'
AND date = CURRENT_DATE;
```

### Check Active Overrides:
```sql
SELECT * FROM prayer_overrides
WHERE mosque_id = 'buffalo-markaz'
AND CURRENT_DATE BETWEEN start_date AND end_date;
```

### Check Slides:
```sql
SELECT * FROM slides
WHERE mosque_id = 'buffalo-markaz'
ORDER BY display_order;
```

---

## 🔄 Real-Time Subscriptions

Once you integrate the Supabase client in your app, you can subscribe to real-time changes:

```typescript
// Example: Subscribe to settings changes
supabase
  .channel('settings-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'mosque_settings'
  }, (payload) => {
    console.log('Setting changed:', payload);
    // Update local state
  })
  .subscribe();
```

---

## 📝 Next Steps

After running these scripts:

1. ✅ Copy your Supabase URL and API key
2. ✅ Add them to Vercel environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. ✅ Install Supabase client: `npm install @supabase/supabase-js`
4. ✅ Integrate Supabase hooks in your React app (see integration guide)

---

## 🆘 Troubleshooting

**Error: "permission denied for table mosque_settings"**
- Solution: Make sure you ran script 02-security.sql

**Error: "table already exists"**
- Solution: This is fine if re-running scripts. Use DROP TABLE IF EXISTS before CREATE TABLE

**Real-time not working:**
- Check: `SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';`
- Should list all 5 tables

**No data showing:**
- Run seed data script (04-seed-data.sql)
- Or manually insert test data

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Real-time Subscriptions](https://supabase.com/docs/guides/realtime)
- [Supabase Client Docs](https://supabase.com/docs/reference/javascript/introduction)
