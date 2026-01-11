# Database & Real-Time Sync Guide

## Do You Need Supabase/Database?

**Short Answer**: It depends on your use case.

## Current Setup (No Database)

Your app currently uses **localStorage** for storing settings:
- ✅ Prayer time customizations (Excel uploads, manual overrides)
- ✅ Announcements
- ✅ Theme preferences
- ✅ Mobile alert settings
- ✅ Slideshow configurations

### How It Works Now:
- Each device stores its own settings locally in the browser
- Settings persist across browser refreshes
- **Prayer times auto-calculate** (no sync needed - same for all devices)
- **Not synced across different devices/browsers**

---

## Scenarios

### Scenario 1: Single Display (No Database Needed) ✅

**Use Case:**
- One TV/monitor showing the signage
- Admin configures settings on the same device

**Recommendation**: **You don't need a database**
- localStorage is perfect for this
- Simple, no additional cost
- No internet dependency for settings (only for Gemini AI quotes)
- Prayer times auto-calculate on the device

**Pros:**
- ✅ Zero cost
- ✅ Works offline (except Gemini AI)
- ✅ No setup complexity
- ✅ Fast (no network calls)

**Cons:**
- ❌ Settings lost if browser cache is cleared
- ❌ Can't control from another device

---

### Scenario 2: Multiple Displays (Database Recommended) 📊

**Use Case:**
- Multiple TVs/displays across the mosque
- Want same announcements/settings on all screens
- Admin controls from office computer/phone
- Multiple locations (different rooms/buildings)

**Recommendation**: **Add Supabase for real-time sync**

**Benefits:**
- ✅ Update announcements from anywhere
- ✅ All displays sync instantly
- ✅ Central management
- ✅ Mobile admin app possible
- ✅ Settings backed up in cloud

---

## Option A: Continue Without Database

**Best for**: Single display setups

**No changes needed** - your app is ready to deploy as-is!

**Export/Import Feature** (Already Available):
- Use Settings → Schedule → Upload Excel
- Save your settings by downloading schedule
- Import on new device if needed

---

## Option B: Add Supabase for Real-Time Sync

**Best for**: Multiple displays or remote management

### What Gets Synced:
1. Announcements (ticker items)
2. Manual prayer time overrides
3. Theme settings
4. Mobile alert settings
5. Slideshow configurations
6. Excel schedule uploads

### What Doesn't Need Sync:
- **Prayer times** - Auto-calculated on each device (already synced by astronomy!)
- **Current time** - Each device uses its own clock
- **Gemini AI quotes** - Cached per device

### Implementation Steps:

#### Step 1: Create Supabase Project (5 minutes)

1. Go to https://supabase.com/
2. Create free account
3. Create new project:
   - Project name: `buffalo-markaz-signage`
   - Database password: (save this!)
   - Region: Choose closest to Buffalo (US East)
4. Wait 2 minutes for project setup

#### Step 2: Get API Keys

1. In Supabase dashboard → Settings → API
2. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon/Public Key**: `eyJhbGc...` (long string)

#### Step 3: Create Database Schema

In Supabase → SQL Editor, run this:

```sql
-- Settings table for storing app configuration
CREATE TABLE mosque_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mosque_id TEXT DEFAULT 'buffalo-markaz' NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mosque_id, setting_key)
);

-- Enable Row Level Security
ALTER TABLE mosque_settings ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access (public displays)
CREATE POLICY "Allow public read access"
  ON mosque_settings
  FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous write access (for now - you can add authentication later)
CREATE POLICY "Allow public write access"
  ON mosque_settings
  FOR ALL
  TO anon
  USING (true);

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE mosque_settings;

-- Create index for faster queries
CREATE INDEX idx_mosque_settings_key ON mosque_settings(mosque_id, setting_key);
```

#### Step 4: Install Supabase Client

```bash
npm install @supabase/supabase-js
```

#### Step 5: Add Environment Variables

Add to Vercel (and `.env.local` for local dev):
```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

#### Step 6: Create Supabase Hook

I can create this file for you if you want to proceed with Supabase.

---

## Cost Comparison

### Without Database (Current Setup)
- **Cost**: $0/month
- **Maintenance**: None
- **Complexity**: Low

### With Supabase
- **Cost**: $0/month (up to 500MB database, 2GB bandwidth)
- **Paid tier**: $25/month if you need more (unlikely for a mosque)
- **Maintenance**: Minimal
- **Complexity**: Medium

---

## My Recommendation

### For Most Mosques: **Start Without Database**

**Reasons:**
1. **Prayer times already auto-sync** via astronomy (no database needed!)
2. **Single display is most common** - localStorage is perfect
3. **Zero cost** and simpler
4. **Announcements don't change that often** - easy to update on the display itself
5. **You can always add Supabase later** if needs change

### Add Database Later If:
- You add a second display
- You want mobile admin control
- Announcements change frequently
- You want centralized management
- Multiple masjid locations

---

## Quick Decision Guide

**Choose NO DATABASE if:**
- ✅ Single display
- ✅ Updates done on the display itself
- ✅ Want simplicity
- ✅ Budget-conscious

**Choose SUPABASE if:**
- ✅ Multiple displays
- ✅ Remote management needed
- ✅ Frequent announcement updates
- ✅ Want mobile admin app
- ✅ Multiple buildings/rooms

---

## What I Can Do For You

### Option 1: Deploy Now (No Database)
- Already ready to go!
- Just follow DEPLOYMENT.md

### Option 2: Add Supabase Integration
Let me know and I'll:
1. Create Supabase service file
2. Create sync hooks
3. Update components to use real-time sync
4. Add authentication (optional)
5. Create admin panel (optional)

**Estimated time to add**: 30-45 minutes

---

## Final Thoughts

Since **prayer times are already auto-calculated** on each device (thanks to the adhan library), you're already getting the most important "sync" for free! The only things that need manual syncing are customizations and announcements.

For most single-display mosque setups, I recommend **starting without a database** and adding it later only if you need it.
