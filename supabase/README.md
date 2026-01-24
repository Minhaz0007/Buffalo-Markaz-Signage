# Supabase Database Migrations

This directory contains database migration files for the Buffalo Markaz Signage project.

## 🚀 Recommended: Fully Automated Migrations

**GitHub Actions automatically runs migrations whenever you push to the main branch!**

👉 **See [.github/MIGRATION_SETUP.md](../.github/MIGRATION_SETUP.md) for one-time setup instructions**

Once set up, you just:
1. Create a migration file in `supabase/migrations/`
2. Commit and push to Git
3. **Done!** Migrations run automatically ✨

---

## Alternative Methods

### Option 1: Manual Migration via SQL Editor (Quickest for one-off)

1. Go to your Supabase Dashboard → SQL Editor
2. Copy the contents of the migration file you want to run
3. Paste and execute in the SQL Editor

### Option 2: Local Supabase CLI (For manual control)

1. **Install Supabase CLI**:
   ```bash
   brew install supabase/tap/supabase  # Mac
   scoop install supabase              # Windows
   ```

2. **Link your project** (one-time):
   ```bash
   npm run db:link
   # Enter your project reference ID when prompted
   ```

3. **Run migrations**:
   ```bash
   npm run db:migrate
   ```

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
