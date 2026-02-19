
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanSlate() {
  console.log('🧹 Starting database cleanup...');

  try {
    // 1. Delete all announcement items
    const { error: annError } = await supabase
      .from('announcement_items')
      .delete()
      .gte('id', 0); // Delete all rows where id >= 0

    if (annError) {
      console.error('❌ Error clearing announcement_items:', annError);
    } else {
      console.log('✅ Cleared announcement_items table.');
    }

    // 2. Delete all manual overrides
    const { error: overrideError } = await supabase
      .from('manual_overrides')
      .delete()
      .gte('id', 0); // Delete all rows where id >= 0

    if (overrideError) {
      console.error('❌ Error clearing manual_overrides:', overrideError);
    } else {
      console.log('✅ Cleared manual_overrides table.');
    }

    // 3. Reset global settings to defaults
    // We update the row with id=1
    const { error: settingsError } = await supabase
      .from('global_settings')
      .update({
        auto_alert_enabled: true,
        auto_alert_template: "⚠️ NOTICE: Iqamah changes tomorrow for {prayers}",
        auto_alert_color: "#ef4444",
        auto_alert_animation: "pulse",
        mobile_alert_enabled: true,
        mobile_alert_mode: 'panel',
        mobile_alert_trigger_minutes: 0.5,
        mobile_alert_background_color: '#ef4444',
        mobile_alert_text: 'Please silence your cell phones.',
        mobile_alert_icon: 'phone-off',
        mobile_alert_animation: 'pulse',
        mobile_alert_beep_enabled: true,
        mobile_alert_beep_type: 'single',
        mobile_alert_beep_volume: 75,
        mobile_alert_disable_for_jumuah: true,
        theme: 'starry',
        ticker_bg: 'white',
        maghrib_offset: 10
      })
      .eq('id', 1);

    if (settingsError) {
      console.error('❌ Error resetting global_settings:', settingsError);
      // Try insert if update fails (maybe row doesn't exist)
       const { error: insertError } = await supabase
        .from('global_settings')
        .upsert({
            id: 1,
            auto_alert_enabled: true,
            auto_alert_template: "⚠️ NOTICE: Iqamah changes tomorrow for {prayers}",
            auto_alert_color: "#ef4444",
            auto_alert_animation: "pulse",
            mobile_alert_enabled: true,
            mobile_alert_mode: 'panel',
            mobile_alert_trigger_minutes: 0.5,
            mobile_alert_background_color: '#ef4444',
            mobile_alert_text: 'Please silence your cell phones.',
            mobile_alert_icon: 'phone-off',
            mobile_alert_animation: 'pulse',
            mobile_alert_beep_enabled: true,
            mobile_alert_beep_type: 'single',
            mobile_alert_beep_volume: 75,
            mobile_alert_disable_for_jumuah: true,
            theme: 'starry',
            ticker_bg: 'white',
            maghrib_offset: 10
        });
        if (insertError) {
             console.error('❌ Error inserting default global_settings:', insertError);
        } else {
             console.log('✅ Created default global_settings.');
        }

    } else {
      console.log('✅ Reset global_settings to defaults.');
    }

    console.log('✨ Cleanup complete!');

  } catch (err) {
    console.error('Unexpected error during cleanup:', err);
    process.exit(1);
  }
}

cleanSlate();
