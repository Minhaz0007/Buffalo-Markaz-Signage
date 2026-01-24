# Supabase Database Migrations

This directory contains database migration files for the Buffalo Markaz Signage project.

## Quick Start

### Option 1: Automatic Migration with Supabase CLI (Recommended)

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Link your project to Supabase**:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

   To find your project ref:
   - Go to your Supabase dashboard
   - Look at the URL: `https://app.supabase.com/project/YOUR_PROJECT_REF`
   - Or go to Settings → General → Reference ID

3. **Run migrations**:
   ```bash
   supabase db push
   ```

   This will push all migration files to your database.

### Option 2: Manual Migration via SQL Editor

1. Go to your Supabase Dashboard → SQL Editor
2. Copy the contents of the migration file you want to run
3. Paste and execute in the SQL Editor

## Creating New Migrations

When you need to add new database changes:

1. **Create a new migration file** in `supabase/migrations/` with format:
   ```
   YYYYMMDD_description_of_change.sql
   ```

2. **Write your SQL migration**:
   ```sql
   -- Description of what this migration does

   ALTER TABLE table_name
   ADD COLUMN new_column_name TYPE DEFAULT value;
   ```

3. **Commit the migration file** with your code changes:
   ```bash
   git add supabase/migrations/
   git commit -m "feat: add database migration for X"
   ```

4. **Apply the migration**:
   - Use `supabase db push` (automated)
   - Or manually run in SQL Editor

## Migration Files

- `20260124_add_mobile_alert_disable_for_jumuah.sql` - Adds option to disable mobile silent alert for Jumuah prayer

## Environment-Specific Migrations

For different environments (dev, staging, production):

```bash
# Link to specific project
supabase link --project-ref PRODUCTION_PROJECT_REF

# Push migrations
supabase db push
```

## Rollback

If you need to undo a migration, create a new migration file that reverses the changes:

```sql
-- Rollback: Remove mobile_alert_disable_for_jumuah column
ALTER TABLE global_settings
DROP COLUMN IF EXISTS mobile_alert_disable_for_jumuah;
```

## Best Practices

1. ✅ Always use `IF NOT EXISTS` / `IF EXISTS` for idempotent migrations
2. ✅ Include descriptive comments in migration files
3. ✅ Test migrations on a staging database first
4. ✅ Never modify existing migration files - create new ones
5. ✅ Use timestamp-based naming for migration files
6. ✅ Version control all migration files with git
