# 🗄️ Supabase Setup Guide

This guide will help you set up Supabase for persistent data storage across devices and deployments.

## Why Supabase?

Without Supabase, your Excel schedule and settings are stored only in browser localStorage, which means:
- ❌ Data disappears when you clear browser cache
- ❌ Data doesn't sync across devices
- ❌ Data is lost when you redeploy or access from a different browser
- ❌ No backup or recovery

With Supabase:
- ✅ Excel schedules persist in cloud database
- ✅ Settings sync across all devices
- ✅ Data survives browser clears and redeployments
- ✅ Automatic backups and recovery
- ✅ Access from anywhere

---

## 📋 Step-by-Step Setup

### 1. Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign Up"**
3. Sign up with GitHub, Google, or email

### 2. Create a New Project

1. Click **"New Project"**
2. Choose your organization (or create one)
3. Enter project details:
   - **Name:** Buffalo Markaz Signage (or any name you like)
   - **Database Password:** Create a strong password (save this!)
   - **Region:** Choose closest to Buffalo, NY (e.g., East US, Virginia)
4. Click **"Create new project"**
5. Wait 2-3 minutes for project to initialize ⏳

### 3. Get Your API Credentials

1. Once the project is ready, go to **Project Settings** (gear icon in left sidebar)
2. Click **"API"** in the left menu
3. You'll see two important values:

   **Project URL:**
   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```

   **anon public key:** (long string starting with `eyJh...`)
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3...
   ```

4. **Keep this tab open** - you'll need these values in the next step!

### 4. Run the SQL Schema

1. In your Supabase project, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Open the file `supabase-schema.sql` in your project folder
4. **Copy ALL the contents** of that file
5. **Paste** into the Supabase SQL Editor
6. Click **"Run"** or press `Ctrl/Cmd + Enter`
7. You should see: **"Success. No rows returned"** ✅

This creates all the necessary database tables:
- ✅ `excel_schedule` - Prayer times from Excel
- ✅ `manual_overrides` - Manual schedule adjustments
- ✅ `announcement_items` - Ticker messages
- ✅ `slideshow_config` - Right panel slides
- ✅ `global_settings` - Theme, offsets, and alerts

### 5. Configure Your App

1. In your project folder, find the file `.env.example`
2. **Copy** it and rename the copy to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` in a text editor
4. Replace the placeholder values with your Supabase credentials:

   ```bash
   # Supabase Configuration
   VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3...
   ```

5. **Save the file** 💾

### 6. Restart Your App

If your app is running:
1. Stop the development server (`Ctrl + C`)
2. Start it again:
   ```bash
   npm run dev
   ```

For production build:
```bash
npm run build
```

---

## ✅ Verify It's Working

### Test 1: Upload Excel File

1. Open your app
2. Click **Settings** → **Schedule** tab
3. Upload an Excel file with prayer times
4. You should see: **"Success! Imported X days and saved to database."**
5. Check the browser console (F12) - you should see:
   ```
   ✅ Saved 365 days to Supabase
   ```

### Test 2: Check Database

1. Go to Supabase → **Table Editor**
2. Click **`excel_schedule`** table
3. You should see all your uploaded prayer times! 🎉

### Test 3: Cross-Device Sync

1. Upload Excel file on one device
2. Open the app on a different device or browser
3. The data should automatically load! ✅

---

## 🔒 Security Notes

### API Keys
- The `anon` key is **public** and safe to expose in frontend code
- It has restricted permissions (read/write to your tables only)
- Never share your **service_role** key (keep it secret!)

### Row Level Security (RLS)
The SQL schema includes commented RLS examples. If you want to restrict access:
1. Uncomment the RLS sections in `supabase-schema.sql`
2. Set up authentication (Supabase Auth)
3. Create policies based on authenticated users

For a single-mosque display, RLS is optional since the `anon` key already restricts access to your project only.

---

## 🛠️ Troubleshooting

### Problem: "Supabase not configured" message

**Solution:**
- Make sure `.env` file exists in project root
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set correctly
- Restart the development server after editing `.env`

### Problem: Excel data not saving to database

**Solution:**
1. Open browser console (F12)
2. Look for error messages
3. Verify SQL schema was run successfully
4. Check that tables exist in Supabase → Table Editor

### Problem: Data not loading on app start

**Solution:**
1. Check browser console for errors
2. Verify data exists in Supabase → Table Editor
3. Check that API keys are correct in `.env`

### Problem: Database shows data but app doesn't load it

**Solution:**
- Hard refresh the page (`Ctrl + Shift + R` or `Cmd + Shift + R`)
- Clear browser cache and reload
- Check console for any JavaScript errors

---

## 📊 Viewing Your Data

### Supabase Dashboard

Go to **Table Editor** to view/edit data directly:
- **excel_schedule** - View all prayer times by date
- **manual_overrides** - See active manual adjustments
- **announcement_items** - Check ticker messages
- **global_settings** - View all app settings

### SQL Queries

Use the **SQL Editor** to run custom queries:

```sql
-- View upcoming prayer times (next 7 days)
SELECT * FROM excel_schedule
WHERE date >= CURRENT_DATE
ORDER BY date
LIMIT 7;

-- View active manual overrides
SELECT * FROM manual_overrides
WHERE CURRENT_DATE BETWEEN start_date AND end_date;

-- Count total days loaded
SELECT COUNT(*) FROM excel_schedule;
```

---

## 🎯 What Gets Synced

| Data | Local Storage | Supabase | Notes |
|------|--------------|----------|-------|
| Excel Schedule | ✅ | ✅ | Year-round prayer times |
| Manual Overrides | ✅ | ✅ | Date-range adjustments |
| Announcement Items | ✅ | ✅ | Ticker messages |
| Slideshow Config | ✅ | ✅ | Right panel slides |
| Theme Settings | ✅ | ✅ | Visual appearance |
| Maghrib Offset | ✅ | ✅ | Sunset + minutes |
| Auto-Alert Settings | ✅ | ✅ | Change notifications |
| Mobile Silent Alert | ✅ | ✅ | Pre-Iqamah countdown |

---

## 💰 Pricing

Supabase offers a **generous free tier**:
- ✅ 500 MB database storage (more than enough!)
- ✅ 2 GB bandwidth per month
- ✅ 50,000 monthly active users
- ✅ Unlimited API requests
- ✅ No credit card required

For a single-mosque signage display, you'll stay well within the free tier! 🎉

---

## 🚀 Next Steps

Once Supabase is set up:

1. **Upload your year-round Excel calendar** - It will work for all future years
2. **Configure settings** - Everything syncs automatically
3. **Deploy to production** - Data persists across deployments
4. **Access from any device** - Your TV, phone, tablet, etc.

---

## 📞 Support

If you run into issues:
1. Check the [Supabase Documentation](https://supabase.com/docs)
2. Review the troubleshooting section above
3. Check browser console for error messages
4. Verify SQL schema was run correctly

---

## ✅ Success!

Once you see the console messages like:
```
🔄 Loading data from Supabase...
✅ Loaded 365 days from database
✅ Loaded global settings from database
✅ All data loaded from Supabase
```

**You're all set!** 🎉 Your data is now permanently stored and will sync across all devices.
