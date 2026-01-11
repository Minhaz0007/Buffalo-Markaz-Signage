# Vercel Supabase Environment Variables Setup

## CRITICAL: Why Your Excel Data Keeps Disappearing

If your Excel prayer schedule data disappears after deployments or when accessing from different devices, **it's because Supabase environment variables are NOT configured in Vercel**.

Without these variables:
- ❌ Data only saves to browser localStorage (local to ONE device)
- ❌ Data is lost when you clear browser cache
- ❌ Data does NOT sync across devices
- ❌ Each deployment starts with empty data

With Supabase configured:
- ✅ Data saves to cloud database (Supabase PostgreSQL)
- ✅ Data persists forever (year-round calendar for 10,000 years!)
- ✅ Data syncs across ALL devices automatically
- ✅ Survives all deployments, browser changes, cache clears

## Step-by-Step: Configure Vercel Environment Variables

### Step 1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Click on your project (Buffalo Markaz Prayer Times)
3. Click **Settings** (gear icon) in the left sidebar
4. Click **API** under Project Settings
5. You'll see two values you need:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (under Project API keys)

**Copy these values** - you'll need them in the next step.

### Step 2: Add Environment Variables to Vercel

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Click on your **Buffalo Markaz Signage** project
3. Click **Settings** tab at the top
4. Click **Environment Variables** in the left sidebar
5. Add the following variables:

#### Variable 1: VITE_SUPABASE_URL
```
Name: VITE_SUPABASE_URL
Value: https://your-project-id.supabase.co
Environment: Production, Preview, Development (check ALL three)
```

#### Variable 2: VITE_SUPABASE_ANON_KEY
```
Name: VITE_SUPABASE_ANON_KEY
Value: your_anon_key_from_supabase
Environment: Production, Preview, Development (check ALL three)
```

6. Click **Save** for each variable

### Step 3: Redeploy Your Application

After adding the environment variables, you MUST redeploy:

**Option A: Trigger Redeployment from Vercel**
1. Go to **Deployments** tab in Vercel
2. Click the **...** menu on the latest deployment
3. Click **Redeploy**
4. Check "Use existing Build Cache" is OFF
5. Click **Redeploy**

**Option B: Push a New Commit**
```bash
git commit --allow-empty -m "Trigger redeployment with Supabase env vars"
git push origin main
```

### Step 4: Verify It's Working

After redeployment:

1. Open your Vercel app in a browser
2. Press **F12** to open Developer Console
3. Look for these messages in the Console:
   - ✅ `Loading data from Supabase...`
   - ✅ `Loaded X days from Supabase`
   - ✅ `All data loaded from Supabase`

4. If you see this instead:
   - ⚠️ `Supabase is NOT configured! Data will only be stored in localStorage.`
   - **This means environment variables are NOT working** - go back to Step 2

5. Upload your Excel file in Settings
6. Look for success message:
   - ✅ `Success! Imported 366 days and saved to cloud database. Data will persist across all devices.`
   - If you see: ⚠️ `LOCAL ONLY - Supabase not configured` - environment variables are missing

7. **Test persistence:**
   - Close browser completely
   - Open a NEW browser (or private/incognito window)
   - Go to your Vercel URL
   - Check if the prayer times from Excel are still there
   - If YES - ✅ Cloud sync is working!
   - If NO - ❌ Go back to Step 2 and verify environment variables

### Step 5: Verify Supabase Database

Check that data is actually in Supabase:

1. Go to Supabase dashboard
2. Click **Table Editor** in left sidebar
3. You should see these tables:
   - `excel_schedule` - Should have ~365 rows (your year-round calendar)
   - `manual_overrides` - Your manual prayer time overrides
   - `announcement_items` - Ticker messages
   - `slideshow_config` - Slideshow slides
   - `global_settings` - App settings (theme, maghrib offset, etc.)

4. Click on `excel_schedule` table
5. You should see all 365+ days of prayer times
6. If the table is EMPTY - the environment variables are not configured correctly

## Common Issues and Solutions

### Issue 1: "Environment variables are set but data still disappears"

**Solution:**
1. Make sure you selected **ALL THREE environments** (Production, Preview, Development) when adding variables
2. Trigger a full redeployment (not just a restart)
3. Clear your browser cache and reload the page

### Issue 2: "Excel upload says 'saved to database' but data is gone after refresh"

**Solution:**
1. Check the actual Supabase table (Step 5 above)
2. If table is empty, your environment variables are not being read
3. Make sure variable names are EXACTLY:
   - `VITE_SUPABASE_URL` (not `SUPABASE_URL`)
   - `VITE_SUPABASE_ANON_KEY` (not `SUPABASE_ANON_KEY`)
   - Vite requires the `VITE_` prefix!

### Issue 3: "Works locally but not on Vercel"

**Solution:**
1. Your local `.env` file works, but Vercel doesn't have access to it
2. You MUST add environment variables in Vercel dashboard
3. `.env` file is gitignored and doesn't deploy to Vercel

### Issue 4: "Data syncs but gets overwritten"

**Solution:**
1. This is a different issue - likely multiple people uploading different Excel files
2. The app now has auto-save on ALL changes
3. Last upload wins (by design - this is the year-round calendar)

## Security Notes

✅ **Safe to use `anon` key in frontend**: The `anon` (anonymous) public key is designed to be exposed in frontend applications. Supabase has Row Level Security (RLS) policies to protect your data.

⚠️ **Never use `service_role` key in frontend**: Only use the `anon public` key (NOT the `service_role` secret key).

## Architecture: How Data Persistence Works

```
┌─────────────────────────────────────────────────────────────┐
│ Upload Excel File in Settings                                │
│ ↓                                                            │
│ 1. Parse Excel file                                          │
│ 2. Save to React state (excelSchedule)                       │
│ 3. Save to localStorage (offline backup)                     │
│ 4. Save to Supabase (cloud sync) ← REQUIRES ENV VARS        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ App Loads (Any Device, Any Time)                             │
│ ↓                                                            │
│ 1. Try to load from Supabase (cloud) ← REQUIRES ENV VARS    │
│ 2. Fallback to localStorage if Supabase fails                │
│ 3. Display prayer times                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Any Settings Change (Manual Override, Announcement, etc.)    │
│ ↓                                                            │
│ 1. Update React state                                        │
│ 2. Auto-save to Supabase ← REQUIRES ENV VARS                │
│ 3. Auto-save to localStorage                                 │
└─────────────────────────────────────────────────────────────┘
```

## What's Changed in This Update

### NEW: Auto-Save for Excel Schedule ✅
- Previously: Excel only saved to Supabase when uploaded
- Now: Excel auto-saves to Supabase whenever excelSchedule state changes
- Benefit: Guaranteed cloud persistence

### NEW: Supabase Configuration Warnings ✅
- App now detects if Supabase is not configured
- Shows clear warning in console and system alert
- Upload status shows "LOCAL ONLY" if Supabase missing

### NEW: Better Status Messages ✅
- Clear feedback when Excel is saved to cloud
- Explicit warning if cloud save fails
- Console logs show exactly what's happening

## Testing Checklist

After configuring Supabase environment variables in Vercel:

- [ ] Redeployed application with new env vars
- [ ] Console shows "Loading data from Supabase"
- [ ] No warnings about "Supabase not configured"
- [ ] Uploaded Excel file shows "saved to cloud database"
- [ ] Checked Supabase table has 365+ rows
- [ ] Closed browser and reopened - data still there
- [ ] Opened from different device - data syncs
- [ ] Cleared browser cache - data still there
- [ ] Made new deployment - data survives

## Summary

The root cause of your data disappearing is:
1. **Missing Supabase environment variables in Vercel**
2. Without them, data only saves to browser localStorage
3. localStorage doesn't sync across devices or survive deployments

The solution:
1. **Add environment variables to Vercel** (Step 2 above)
2. **Redeploy** (Step 3)
3. **Verify** (Step 4-5)

Once configured correctly:
- Excel schedule persists forever ✅
- Data syncs across all devices ✅
- Year-round calendar works indefinitely ✅
- No data loss after deployments ✅

## Need Help?

If you've followed all steps and data still doesn't persist:

1. Take a screenshot of:
   - Vercel environment variables page
   - Browser console after loading app
   - Supabase excel_schedule table
   - Upload success message

2. Check for typos in variable names (must be exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`)

3. Verify you redeployed AFTER adding environment variables
