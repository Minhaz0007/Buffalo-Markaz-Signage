import { supabase, isSupabaseConfigured } from './supabase';
import { ExcelDaySchedule, ManualOverride, AnnouncementItem, SlideConfig, AutoAlertSettings, MobileSilentAlertSettings } from '../types';

// ============================================================
// EXCEL SCHEDULE OPERATIONS
// ============================================================

/**
 * Clears ALL Excel schedule data from the database
 * This ensures a fresh start when uploading a new year-round calendar
 */
export const clearExcelScheduleFromDatabase = async () => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured. Cannot clear database.');
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // Delete all rows from excel_schedule table
    const { error } = await supabase!
      .from('excel_schedule')
      .delete()
      .gte('date', '1900-01-01'); // Match all dates (effectively deletes everything)

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found (acceptable)
      throw error;
    }

    console.log('✅ Cleared all Excel schedule data from Supabase');
    return { success: true };
  } catch (error) {
    console.error('Error clearing Excel schedule from Supabase:', error);
    return { success: false, error };
  }
};

/**
 * Saves Excel schedule to database
 * WARNING: This uses upsert, which only updates/adds rows.
 * Use clearExcelScheduleFromDatabase() first to ensure a clean replacement.
 */
export const saveExcelScheduleToDatabase = async (schedule: Record<string, ExcelDaySchedule>) => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured. Data will only be stored in localStorage.');
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // Convert schedule object to array of rows
    const rows = Object.values(schedule).map(day => ({
      date: day.date,
      fajr_start: day.fajr.start,
      fajr_iqamah: day.fajr.iqamah,
      dhuhr_start: day.dhuhr.start,
      dhuhr_iqamah: day.dhuhr.iqamah,
      asr_start: day.asr.start,
      asr_iqamah: day.asr.iqamah,
      maghrib_start: day.maghrib.start,
      maghrib_iqamah: day.maghrib.iqamah,
      isha_start: day.isha.start,
      isha_iqamah: day.isha.iqamah,
      jumuah_iqamah: day.jumuahIqamah || null, // Only iqamah, start uses Dhuhr
    }));

    // Batch upsert (insert or update on conflict)
    const { error } = await supabase!
      .from('excel_schedule')
      .upsert(rows, { onConflict: 'date' });

    if (error) throw error;

    console.log(`✅ Saved ${rows.length} days to Supabase`);
    return { success: true };
  } catch (error) {
    console.error('Error saving Excel schedule to Supabase:', error);
    return { success: false, error };
  }
};

export const loadExcelScheduleFromDatabase = async (): Promise<{ success: boolean, data: Record<string, ExcelDaySchedule> }> => {
  if (!isSupabaseConfigured()) {
    return { success: false, data: {} };
  }

  try {
    const { data, error } = await supabase!
      .from('excel_schedule')
      .select('*')
      .order('date', { ascending: true });

    if (error) throw error;

    // Convert array to object keyed by date
    const schedule: Record<string, ExcelDaySchedule> = {};
    data?.forEach((row: any) => {
      schedule[row.date] = {
        date: row.date,
        fajr: { start: row.fajr_start, iqamah: row.fajr_iqamah },
        dhuhr: { start: row.dhuhr_start, iqamah: row.dhuhr_iqamah },
        asr: { start: row.asr_start, iqamah: row.asr_iqamah },
        maghrib: { start: row.maghrib_start, iqamah: row.maghrib_iqamah },
        isha: { start: row.isha_start, iqamah: row.isha_iqamah },
        jumuahIqamah: row.jumuah_iqamah, // Only iqamah, start uses Dhuhr
      };
    });

    console.log(`✅ Loaded ${Object.keys(schedule).length} days from Supabase`);
    return { success: true, data: schedule };
  } catch (error) {
    console.error('Error loading Excel schedule from Supabase:', error);
    return { success: false, data: {} };
  }
};

// ============================================================
// MANUAL OVERRIDES OPERATIONS
// ============================================================

export const saveManualOverridesToDatabase = async (overrides: ManualOverride[]) => {
  if (!isSupabaseConfigured()) return { success: false };

  try {
    // Delete all existing overrides first
    const { error: deleteError } = await supabase!
      .from('manual_overrides')
      .delete()
      .not('id', 'is', null);

    if (deleteError && deleteError.code !== 'PGRST116') {
      throw deleteError;
    }

    // Insert new overrides (only if there are any)
    if (overrides.length > 0) {
      const rows = overrides.map(o => ({
        prayer_key: o.prayerKey,
        start_date: o.startDate,
        end_date: o.endDate,
        start_time: o.start,
        iqamah_time: o.iqamah,
      }));

      const { error: insertError } = await supabase!
        .from('manual_overrides')
        .insert(rows);

      if (insertError) throw insertError;
    }

    console.log(`✅ Saved ${overrides.length} manual overrides to Supabase`);
    return { success: true };
  } catch (error) {
    console.error('Error saving manual overrides to Supabase:', error);
    return { success: false, error };
  }
};

export const loadManualOverridesFromDatabase = async (): Promise<{ success: boolean, data: ManualOverride[] }> => {
  if (!isSupabaseConfigured()) return { success: false, data: [] };

  try {
    const { data, error } = await supabase!
      .from('manual_overrides')
      .select('*')
      .order('start_date', { ascending: true });

    if (error) throw error;

    const overrides: ManualOverride[] = data?.map((row: any) => ({
      id: row.id,
      prayerKey: row.prayer_key,
      startDate: row.start_date,
      endDate: row.end_date,
      start: row.start_time,
      iqamah: row.iqamah_time,
    })) || [];

    console.log(`✅ Loaded ${overrides.length} manual overrides from Supabase`);
    return { success: true, data: overrides };
  } catch (error) {
    console.error('Error loading manual overrides from Supabase:', error);
    return { success: false, data: [] };
  }
};

// ============================================================
// ANNOUNCEMENT ITEMS OPERATIONS
// ============================================================

export const saveAnnouncementItemsToDatabase = async (items: AnnouncementItem[]) => {
  if (!isSupabaseConfigured()) return { success: false };

  try {
    // Delete all existing items first (using a condition that matches all rows)
    const { error: deleteError } = await supabase!
      .from('announcement_items')
      .delete()
      .gte('display_order', 0);

    if (deleteError && deleteError.code !== 'PGRST116') { // PGRST116 = no rows found (acceptable)
      throw deleteError;
    }

    // Insert new items (only if there are items to insert)
    if (items.length > 0) {
      const rows = items.map((item, index) => ({
        text: item.text,
        color: item.color,
        animation: item.animation,
        display_order: index,
      }));

      const { error: insertError } = await supabase!
        .from('announcement_items')
        .insert(rows);

      if (insertError) throw insertError;
    }

    console.log(`✅ Saved ${items.length} announcement items to Supabase`);
    return { success: true };
  } catch (error) {
    console.error('Error saving announcement items to Supabase:', error);
    return { success: false, error };
  }
};

export const loadAnnouncementItemsFromDatabase = async (): Promise<{ success: boolean, data: AnnouncementItem[] }> => {
  if (!isSupabaseConfigured()) return { success: false, data: [] };

  try {
    const { data, error } = await supabase!
      .from('announcement_items')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;

    const items: AnnouncementItem[] = data?.map((row: any) => ({
      id: row.id,
      text: row.text,
      color: row.color,
      animation: row.animation,
    })) || [];

    console.log(`✅ Loaded ${items.length} announcement items from Supabase`);
    return { success: true, data: items };
  } catch (error) {
    console.error('Error loading announcement items from Supabase:', error);
    return { success: false, data: [] };
  }
};

// ============================================================
// SLIDESHOW CONFIG OPERATIONS
// ============================================================

export const saveSlideshowConfigToDatabase = async (slides: SlideConfig[]) => {
  if (!isSupabaseConfigured()) return { success: false };

  try {
    // Delete all existing slides first
    const { error: deleteError } = await supabase!
      .from('slideshow_config')
      .delete()
      .not('id', 'is', null);

    if (deleteError && deleteError.code !== 'PGRST116') {
      throw deleteError;
    }

    // Insert new slides (only if there are any)
    if (slides.length > 0) {
      const rows = slides.map((slide, index) => ({
        slide_id: slide.id,
        slide_type: slide.type,
        enabled: slide.enabled,
        duration: slide.duration,
        display_order: index,
        content: slide.type === 'ANNOUNCEMENT' ? (slide as any).content : null,
        background_color: slide.type === 'ANNOUNCEMENT' ? (slide as any).styles.backgroundColor : null,
        text_color: slide.type === 'ANNOUNCEMENT' ? (slide as any).styles.textColor : null,
        text_animation: slide.type === 'ANNOUNCEMENT' ? (slide as any).styles.textAnimation : null,
        font_size: slide.type === 'ANNOUNCEMENT' ? (slide as any).styles.fontSize : null,
        days_to_show: slide.type === 'SCHEDULE' ? (slide as any).daysToShow : null,
      }));

      const { error: insertError } = await supabase!
        .from('slideshow_config')
        .insert(rows);

      if (insertError) throw insertError;
    }

    console.log(`✅ Saved ${slides.length} slideshow slides to Supabase`);
    return { success: true };
  } catch (error) {
    console.error('Error saving slideshow config to Supabase:', error);
    return { success: false, error };
  }
};

export const loadSlideshowConfigFromDatabase = async (): Promise<{ success: boolean, data: SlideConfig[] }> => {
  if (!isSupabaseConfigured()) return { success: false, data: [] };

  try {
    const { data, error } = await supabase!
      .from('slideshow_config')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;

    const slides: SlideConfig[] = data?.map((row: any) => {
      if (row.slide_type === 'CLOCK') {
        return {
          id: row.slide_id,
          type: 'CLOCK',
          enabled: row.enabled,
          duration: row.duration,
        };
      } else if (row.slide_type === 'ANNOUNCEMENT') {
        return {
          id: row.slide_id,
          type: 'ANNOUNCEMENT',
          enabled: row.enabled,
          duration: row.duration,
          content: row.content,
          styles: {
            backgroundColor: row.background_color,
            textColor: row.text_color,
            textAnimation: row.text_animation,
            fontSize: row.font_size,
          },
        };
      } else {
        return {
          id: row.slide_id,
          type: 'SCHEDULE',
          enabled: row.enabled,
          duration: row.duration,
          daysToShow: row.days_to_show,
        };
      }
    }) || [];

    console.log(`✅ Loaded ${slides.length} slideshow slides from Supabase`);
    return { success: true, data: slides };
  } catch (error) {
    console.error('Error loading slideshow config from Supabase:', error);
    return { success: false, data: [] };
  }
};

// ============================================================
// GLOBAL SETTINGS OPERATIONS
// ============================================================

export const saveGlobalSettingsToDatabase = async (settings: {
  theme: string;
  tickerBg: 'white' | 'navy';
  maghribOffset: number;
  autoAlertSettings: AutoAlertSettings;
  mobileAlertSettings: MobileSilentAlertSettings;
}) => {
  if (!isSupabaseConfigured()) return { success: false };

  try {
    const row = {
      id: 1, // Single row
      theme: settings.theme,
      ticker_bg: settings.tickerBg,
      maghrib_offset: settings.maghribOffset,
      auto_alert_enabled: settings.autoAlertSettings.enabled,
      auto_alert_template: settings.autoAlertSettings.template,
      auto_alert_color: settings.autoAlertSettings.color,
      auto_alert_animation: settings.autoAlertSettings.animation,
      mobile_alert_enabled: settings.mobileAlertSettings.enabled,
      mobile_alert_mode: settings.mobileAlertSettings.mode,
      mobile_alert_trigger_minutes: settings.mobileAlertSettings.triggerMinutes,
      mobile_alert_background_color: settings.mobileAlertSettings.backgroundColor,
      mobile_alert_text: settings.mobileAlertSettings.text,
      mobile_alert_icon: settings.mobileAlertSettings.icon,
      mobile_alert_animation: settings.mobileAlertSettings.animation,
      mobile_alert_beep_enabled: settings.mobileAlertSettings.beepEnabled,
      mobile_alert_beep_type: settings.mobileAlertSettings.beepType,
      mobile_alert_beep_volume: settings.mobileAlertSettings.beepVolume,
      mobile_alert_disable_for_jumuah: settings.mobileAlertSettings.disableForJumuah,
    };

    const { error } = await supabase!
      .from('global_settings')
      .upsert(row, { onConflict: 'id' });

    if (error) throw error;

    console.log('✅ Saved global settings to Supabase');
    return { success: true };
  } catch (error) {
    console.error('Error saving global settings to Supabase:', error);
    return { success: false, error };
  }
};

export const loadGlobalSettingsFromDatabase = async () => {
  if (!isSupabaseConfigured()) return { success: false, data: null };

  try {
    const { data, error } = await supabase!
      .from('global_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) throw error;

    if (!data) return { success: true, data: null };

    const settings = {
      theme: data.theme,
      tickerBg: data.ticker_bg,
      maghribOffset: data.maghrib_offset,
      autoAlertSettings: {
        enabled: data.auto_alert_enabled,
        template: data.auto_alert_template,
        color: data.auto_alert_color,
        animation: data.auto_alert_animation,
      },
      mobileAlertSettings: {
        enabled: data.mobile_alert_enabled,
        mode: data.mobile_alert_mode,
        triggerMinutes: data.mobile_alert_trigger_minutes,
        backgroundColor: data.mobile_alert_background_color,
        text: data.mobile_alert_text,
        icon: data.mobile_alert_icon,
        animation: data.mobile_alert_animation,
        beepEnabled: data.mobile_alert_beep_enabled,
        beepType: data.mobile_alert_beep_type,
        beepVolume: data.mobile_alert_beep_volume,
        disableForJumuah: data.mobile_alert_disable_for_jumuah ?? true, // Default to true if not present
      },
    };

    console.log('✅ Loaded global settings from Supabase');
    return { success: true, data: settings };
  } catch (error) {
    console.error('Error loading global settings from Supabase:', error);
    return { success: false, data: null };
  }
};
