import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ScreenPrayerTimes } from './components/ScreenPrayerTimes';
import { SettingsModal } from './components/SettingsModal';
import { DailyPrayers, Announcement, ExcelDaySchedule, ManualOverride, AnnouncementItem, SlideConfig, AutoAlertSettings, MobileSilentAlertSettings } from './types';
import { DEFAULT_PRAYER_TIMES, DEFAULT_JUMUAH_TIMES, DEFAULT_ANNOUNCEMENT, DEFAULT_MOBILE_SILENT_ALERT } from './constants';
import { AnimatePresence, motion } from 'framer-motion';
import { Settings, Maximize, Minimize } from 'lucide-react';
import { getScheduleForDate, buildScheduleIndex } from './utils/scheduler';
import { MobileSilentAlert } from './components/MobileSilentAlert';
import { AutoUpdate } from './components/AutoUpdate';
import {
  loadExcelScheduleFromDatabase,
  loadManualOverridesFromDatabase,
  loadAnnouncementItemsFromDatabase,
  loadSlideshowConfigFromDatabase,
  loadGlobalSettingsFromDatabase,
  saveExcelScheduleToDatabase,
  saveManualOverridesToDatabase,
  saveAnnouncementItemsToDatabase,
  saveSlideshowConfigToDatabase,
  saveGlobalSettingsToDatabase,
} from './utils/database';
import { isSupabaseConfigured, supabase } from './utils/supabase';
import { prayerTimesEqual } from './utils/performance';
import { ErrorBoundary } from './components/ErrorBoundary';
import { toEasternDateStr, toEasternMinutes, findEasternMidnightMs } from './utils/easternTime';

// --- Background Components ---

const StarryBackground = React.memo(() => {
  // Generate a stable set of stars - optimized count for performance
  const stars = React.useMemo(() => {
    return Array.from({ length: 100 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 3 + 2, // Increased to 2px - 5px range (approx 20% bigger + variance)
      duration: Math.random() * 3 + 2, // 2s to 5s
      delay: Math.random() * 5 // 0s to 5s delay
    }));
  }, []);

  return (
    <div className="absolute inset-0 z-0 bg-[#02040a] overflow-hidden">
       {/* Deep gradient sky */}
       <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_#0B1E3B_0%,_#02040a_60%,_#000000_100%)]"></div>
       
       <style>{`
         @keyframes star-twinkle {
           0%, 100% { opacity: 0.3; transform: scale(0.8); }
           50% { opacity: 0.8; transform: scale(1.1); box-shadow: 0 0 5px rgba(255, 255, 255, 0.5); }
         }
       `}</style>
       
       {stars.map((star) => (
         <div
           key={star.id}
           className="absolute rounded-full bg-white"
           style={{
             left: `${star.left}%`,
             top: `${star.top}%`,
             width: `${star.size}px`,
             height: `${star.size}px`,
             animation: `star-twinkle ${star.duration}s ease-in-out infinite`,
             animationDelay: `-${star.delay}s`,
             opacity: 0.4,
             willChange: 'opacity, transform',
             transform: 'translateZ(0)' // Force GPU acceleration
           }}
         />
       ))}
    </div>
  );
});

const BackgroundManager = React.memo(({ theme }: { theme: string }) => {
  switch (theme) {
    case 'starry':
      return <StarryBackground />;

    case 'lattice':
      return (
        <div className="absolute inset-0 z-0 bg-mosque-navy overflow-hidden">
           <div className="absolute inset-0 bg-[#08152b]"></div>
           <div className="absolute inset-0 text-mosque-gold opacity-10" style={{ transform: 'translateZ(0)' }}>
              <svg width="100%" height="100%">
                <pattern id="lattice" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                   <path d="M30 0 L60 30 L30 60 L0 30 Z" fill="none" stroke="currentColor" strokeWidth="1" />
                   <circle cx="30" cy="30" r="2" fill="currentColor" />
                   <path d="M0 0 L10 10 M60 0 L50 10 M60 60 L50 50 M0 60 L10 50" stroke="currentColor" strokeWidth="1" />
                </pattern>
                <rect width="100%" height="100%" fill="url(#lattice)" />
              </svg>
           </div>
           <div className="absolute inset-0 bg-gradient-to-t from-mosque-navy via-transparent to-mosque-navy opacity-80"></div>
        </div>
      );

    case 'arabesque':
    default:
      return (
        <div className="absolute inset-0 z-0 bg-[#0B1E3B] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#112442] to-[#050F1E]"></div>
          {/* Uniform Subtle Arabesque */}
          <div className="absolute inset-0 text-[#E2E8F0] opacity-[0.07]" style={{ transform: 'translateZ(0)' }}>
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="subtle-arabesque" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                   {/* Minimalist 8-point geometry */}
                   <path d="M50 0 L100 50 L50 100 L0 50 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                   <path d="M50 15 L85 50 L50 85 L15 50 Z" fill="none" stroke="currentColor" strokeWidth="0.5" />
                   <circle cx="50" cy="50" r="4" fill="currentColor" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#subtle-arabesque)" />
            </svg>
          </div>
          {/* Strong vignette to keep focus on content */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)] pointer-events-none"></div>
        </div>
      );
  }
});

// --- Custom Hooks ---

// Hook for persistent state (Offline capability)
// usePersistentState intentionally removed.
// Supabase is the single source of truth. All state is loaded from Supabase on
// mount and kept in sync via Realtime subscriptions. localStorage is NOT used
// as a cache because stale local data causes different devices to show different
// content (the exact problem this change fixes).

const DEFAULT_SLIDES: SlideConfig[] = [
  { id: 'clock-main', type: 'CLOCK', enabled: true, duration: 15 },
  { 
    id: 'special-announcement', 
    type: 'ANNOUNCEMENT', 
    enabled: false, 
    duration: 10,
    content: "Special Event Tonight!\nJoin us for dinner after Isha.",
    styles: {
      backgroundColor: '#0B1E3B',
      textColor: '#FFFFFF',
      textAnimation: 'gradient-flow',
      fontSize: 'large'
    }
  },
  { id: 'schedule-list', type: 'SCHEDULE', enabled: false, duration: 10, daysToShow: 7 }
];

const DEFAULT_AUTO_ALERTS: AutoAlertSettings = {
  enabled: true,
  template: "⚠️ NOTICE: Iqamah changes tomorrow for {prayers} to {new time}",
  color: "#ef4444", // Red-500
  animation: "pulse"
};

const App: React.FC = () => {
  // --- State (Supabase is the single source of truth — no localStorage cache) ---
  const [excelSchedule, setExcelSchedule] = useState<Record<string, ExcelDaySchedule>>({});
  const scheduleIndex = useMemo(() => buildScheduleIndex(excelSchedule || {}), [excelSchedule]);

  const [manualOverrides, setManualOverrides] = useState<ManualOverride[]>([]);
  const [announcement, setAnnouncement] = useState<Announcement>(DEFAULT_ANNOUNCEMENT);
  const [currentTheme, setCurrentTheme] = useState<string>('starry');
  const [maghribOffset, setMaghribOffset] = useState<number>(10);

  // New Configs
  const [autoAlertSettings, setAutoAlertSettings] = useState<AutoAlertSettings>(DEFAULT_AUTO_ALERTS);
  const [mobileAlertSettings, setMobileAlertSettings] = useState<MobileSilentAlertSettings>(DEFAULT_MOBILE_SILENT_ALERT);
  const [tickerBg, setTickerBg] = useState<'white' | 'navy'>('white');

  // Slideshow State
  const [slidesConfig, setSlidesConfig] = useState<SlideConfig[]>(DEFAULT_SLIDES);

  // Ref: tracks which tables were just updated from a Realtime event so the
  // auto-save effects skip writing back to Supabase (prevents save-back loops
  // where Device B re-saves what it just received, triggering Device A again).
  const isRemoteUpdate = useRef<Set<string>>(new Set());

  // --- Ephemeral State ---
  const [displayedPrayerTimes, setDisplayedPrayerTimes] = useState<DailyPrayers>(DEFAULT_PRAYER_TIMES);
  const [displayedJumuahTimes, setDisplayedJumuahTimes] = useState(DEFAULT_JUMUAH_TIMES);
  const [scheduleAlert, setScheduleAlert] = useState<string>("");
  const [connectionAlert, setConnectionAlert] = useState<string>("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1);
  
  // Alert Logic State
  const [isMobileAlertActive, setIsMobileAlertActive] = useState(false);
  const [alertTargetTime, setAlertTargetTime] = useState<Date | null>(null);
  const [isPreviewAlert, setIsPreviewAlert] = useState(false);

  // Supabase sync state
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Current time in minutes-since-midnight (Eastern timezone), updated every minute
  // by the clock interval below. Used by the schedule-alert effect to decide which
  // prayers have already passed so it can switch from "today override" → "tomorrow change" alerts.
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState<number>(() => toEasternMinutes(new Date()));

  // Hide the persistent #nav-splash div (rendered in index.html) once React
  // has mounted and painted its first frame.  The splash covers the screen on
  // page load and after every navigation so the GPU compositor always has a
  // navy frame to show — preventing the green flash on HDMI extended displays.
  useEffect(() => {
    const splash = document.getElementById('nav-splash');
    if (splash) splash.style.display = 'none';
  }, []);

  // Load data from Supabase on mount
  useEffect(() => {
    const loadFromDatabase = async () => {
      console.log('🔄 Loading data from Supabase...');

      // Load Excel schedule
      const { success: successExcel, data: dbExcelSchedule } = await loadExcelScheduleFromDatabase();
      if (successExcel) {
        setExcelSchedule(dbExcelSchedule);
        console.log(`✅ Loaded ${Object.keys(dbExcelSchedule).length} days from database`);
      }

      // Load manual overrides
      const { success: successOverrides, data: dbManualOverrides } = await loadManualOverridesFromDatabase();
      if (successOverrides) {
        setManualOverrides(dbManualOverrides);
        console.log(`✅ Loaded ${dbManualOverrides.length} manual overrides from database`);
      }

      // Load announcement items
      const { success: successAnnounce, data: dbAnnouncementItems } = await loadAnnouncementItemsFromDatabase();
      if (successAnnounce) {
        console.log(`📥 Loading ${dbAnnouncementItems.length} announcement items from Supabase, overwriting any local changes`);
        setAnnouncement(prev => ({ ...prev, items: dbAnnouncementItems }));
        console.log(`✅ Loaded ${dbAnnouncementItems.length} announcement items from database`);
      } else {
        console.log(`ℹ️ Announcement load failed or not configured, keeping local data`);
      }

      // Load slideshow config
      const { success: successSlides, data: dbSlidesConfig } = await loadSlideshowConfigFromDatabase();
      if (successSlides) {
        setSlidesConfig(dbSlidesConfig);
        console.log(`✅ Loaded ${dbSlidesConfig.length} slideshow slides from database`);
      }

      // Load global settings
      const { success: successGlobal, data: dbGlobalSettings } = await loadGlobalSettingsFromDatabase();
      if (successGlobal && dbGlobalSettings) {
        setCurrentTheme(dbGlobalSettings.theme);
        setTickerBg(dbGlobalSettings.tickerBg);
        setMaghribOffset(dbGlobalSettings.maghribOffset);
        setAutoAlertSettings(dbGlobalSettings.autoAlertSettings);
        setMobileAlertSettings(dbGlobalSettings.mobileAlertSettings);
        console.log('✅ Loaded global settings from database');
      }

      // Mark all tables as remote-updated so the save effects don't write
      // the freshly-loaded Supabase data back to Supabase when isDataLoaded
      // flips to true (which would re-trigger save effects for all deps).
      isRemoteUpdate.current.add('excel_schedule');
      isRemoteUpdate.current.add('manual_overrides');
      isRemoteUpdate.current.add('announcement_items');
      isRemoteUpdate.current.add('slideshow_config');
      isRemoteUpdate.current.add('global_settings');
      setIsDataLoaded(true);
      console.log('✅ All data loaded from Supabase');

      // Warn if Supabase is not configured
      if (!isSupabaseConfigured()) {
        console.warn('⚠️ Supabase is NOT configured! Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
        setConnectionAlert('⚠️ Cloud sync disabled — Supabase not configured. All devices must connect to Supabase for sync to work.');
      }
    };

    loadFromDatabase();
  }, []); // Run once on mount

  // Subscribe to Supabase realtime updates to sync settings across devices
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    const channel = supabase
      .channel('settings-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manual_overrides' }, async () => {
        const { success, data } = await loadManualOverridesFromDatabase();
        if (success) {
          isRemoteUpdate.current.add('manual_overrides');
          setManualOverrides(data);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'excel_schedule' }, async () => {
        const { success, data } = await loadExcelScheduleFromDatabase();
        if (success) {
          isRemoteUpdate.current.add('excel_schedule');
          setExcelSchedule(data);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcement_items' }, async () => {
        const { success, data } = await loadAnnouncementItemsFromDatabase();
        if (success) {
          isRemoteUpdate.current.add('announcement_items');
          setAnnouncement(prev => ({ ...prev, items: data }));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'slideshow_config' }, async () => {
        const { success, data } = await loadSlideshowConfigFromDatabase();
        if (success) {
          isRemoteUpdate.current.add('slideshow_config');
          setSlidesConfig(data);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'global_settings' }, async () => {
        const { success, data } = await loadGlobalSettingsFromDatabase();
        if (success && data) {
          isRemoteUpdate.current.add('global_settings');
          setCurrentTheme(data.theme);
          setTickerBg(data.tickerBg);
          setMaghribOffset(data.maghribOffset);
          setAutoAlertSettings(data.autoAlertSettings);
          setMobileAlertSettings(data.mobileAlertSettings);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    setAnnouncement,
    setAutoAlertSettings,
    setCurrentTheme,
    setExcelSchedule,
    setMaghribOffset,
    setManualOverrides,
    setMobileAlertSettings,
    setSlidesConfig,
    setTickerBg,
  ]);

  // Save Excel schedule to Supabase whenever it changes (after initial load)
  // Skip if the change arrived from a Realtime event (data already in Supabase).
  useEffect(() => {
    if (!isDataLoaded) return;
    if (Object.keys(excelSchedule).length === 0) return;
    if (isRemoteUpdate.current.has('excel_schedule')) {
      isRemoteUpdate.current.delete('excel_schedule');
      return;
    }
    saveExcelScheduleToDatabase(excelSchedule);
  }, [excelSchedule, isDataLoaded]);

  // Save manual overrides to Supabase whenever they change (after initial load)
  useEffect(() => {
    if (!isDataLoaded) return;
    if (isRemoteUpdate.current.has('manual_overrides')) {
      isRemoteUpdate.current.delete('manual_overrides');
      return;
    }
    saveManualOverridesToDatabase(manualOverrides).then(result => {
      if (!result.success) {
        setSaveError("⚠️ Database Error: Manual overrides not saved. Run SQL script.");
      } else {
        setSaveError(null);
      }
    });
  }, [manualOverrides, isDataLoaded]);

  // Save announcement items to Supabase whenever they change (after initial load)
  useEffect(() => {
    if (!isDataLoaded) return;
    if (isRemoteUpdate.current.has('announcement_items')) {
      isRemoteUpdate.current.delete('announcement_items');
      return;
    }
    saveAnnouncementItemsToDatabase(announcement.items);
  }, [announcement.items, isDataLoaded]);

  // Save slideshow config to Supabase whenever it changes (after initial load)
  useEffect(() => {
    if (!isDataLoaded) return;
    if (isRemoteUpdate.current.has('slideshow_config')) {
      isRemoteUpdate.current.delete('slideshow_config');
      return;
    }
    saveSlideshowConfigToDatabase(slidesConfig);
  }, [slidesConfig, isDataLoaded]);

  // Save global settings to Supabase whenever they change (after initial load)
  useEffect(() => {
    if (!isDataLoaded) return;
    if (isRemoteUpdate.current.has('global_settings')) {
      isRemoteUpdate.current.delete('global_settings');
      return;
    }
    saveGlobalSettingsToDatabase({
      theme: currentTheme,
      tickerBg,
      maghribOffset,
      autoAlertSettings,
      mobileAlertSettings,
    });
  }, [currentTheme, tickerBg, maghribOffset, autoAlertSettings, mobileAlertSettings, isDataLoaded]);

  // Scaling Logic for Virtual Viewport (1920x1080)
  useEffect(() => {
    const handleResize = () => {
      const TARGET_WIDTH = 1920;
      const TARGET_HEIGHT = 1080;
      
      const scaleX = window.innerWidth / TARGET_WIDTH;
      const scaleY = window.innerHeight / TARGET_HEIGHT;
      
      // Use the smaller scale to fit content within the screen (contain)
      setScale(Math.min(scaleX, scaleY));
    };

    window.addEventListener('resize', handleResize);
    handleResize(); 

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Logic: Priority Scheduler & Alerts ---
  
  // Track current date string to trigger daily updates (Eastern timezone, not UTC)
  const [todayDateStr, setTodayDateStr] = useState(() => toEasternDateStr(new Date()));

  // UTC millisecond timestamp of midnight (00:00) in Eastern timezone for today.
  // Recomputed once per day when todayDateStr changes. Used by parseTime to convert
  // Eastern prayer time strings into absolute Date objects regardless of device timezone.
  const todayEasternMidnightMs = useMemo(() => findEasternMidnightMs(todayDateStr), [todayDateStr]);

  // Memoized Schedule Calculation - Separation of Concerns
  const { todaySchedule, tomorrowSchedule } = useMemo(() => {
    const todayDate = new Date(todayDateStr + 'T12:00:00');
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowDateStr = toEasternDateStr(tomorrowDate);

    const tSchedule = getScheduleForDate(todayDateStr, excelSchedule || {}, manualOverrides || [], maghribOffset, scheduleIndex);
    const tmSchedule = getScheduleForDate(tomorrowDateStr, excelSchedule || {}, manualOverrides || [], maghribOffset, scheduleIndex);

    return { todaySchedule: tSchedule, tomorrowSchedule: tmSchedule };
  }, [todayDateStr, excelSchedule, manualOverrides, maghribOffset, scheduleIndex]);

  // Update Display State & System Alerts (Only when schedule changes)
  useEffect(() => {
    // Set Display - Only update if values actually changed (prevent unnecessary re-renders)
    setDisplayedPrayerTimes(prev => {
      const next = todaySchedule.prayers;
      // Efficient comparison of prayer time values
      if (prayerTimesEqual(prev, next)) {
        return prev; // Return same reference if values unchanged
      }
      return next;
    });
    setDisplayedJumuahTimes(prev => {
      const next = todaySchedule.jumuah;
      if (prev.start === next.start && prev.iqamah === next.iqamah) {
        return prev;
      }
      return next;
    });

    // ── Change Detection Logic (per-prayer, time-aware) ──────────────────────
    //
    // PRIORITY: manual override > Excel schedule > auto-calculated time
    //           (enforced upstream by getScheduleForDate / scheduler.ts)
    //
    // BEHAVIOR per prayer:
    //   • Before iqamah time has passed today:
    //       - If a manual override is active for this prayer → show "today" alert
    //         so the congregation knows the time has changed for this salah.
    //       - No override → no alert (regular scheduled time, nothing to announce).
    //   • After iqamah time has passed today (congregation has already prayed):
    //       - Drop any "today" override alert — it's no longer relevant.
    //       - Compare today's iqamah with tomorrow's iqamah.
    //       - If they differ → show the template-based "tomorrow" alert so
    //         people know what to expect for the next occurrence.
    //
    // This means the ticker stays clean during the day and only shows useful,
    // forward-looking information once each prayer is done.

    if (!autoAlertSettings.enabled) {
      setScheduleAlert("");
      return;
    }

    // Helper: time string → minutes since midnight (-1 if unparseable)
    const toMins = (timeStr?: string): number => {
      if (!timeStr) return -1;
      const n = timeStr.trim().replace(/\s+/g, ' ').toUpperCase();
      const m = n.match(/(\d{1,2}):(\d{2})\s?(AM|PM)?/);
      if (!m) return -1;
      let h = parseInt(m[1]);
      const min = parseInt(m[2]);
      const ap  = m[3];
      if (ap === 'PM' && h < 12) h += 12;
      if (ap === 'AM' && h === 12) h = 0;
      return h * 60 + min;
    };

    const template = autoAlertSettings.template ||
      "⚠️ NOTICE: Iqamah changes tomorrow for {prayers} to {new time}";

    // Collect active manual overrides for TODAY, deduplicated by prayer key
    // (Map ensures even if two rows cover the same prayer, only one alert fires).
    const activeOverrides = new Map<string, ManualOverride>();
    (manualOverrides || []).forEach(o => {
      if (todayDateStr >= o.startDate && todayDateStr <= o.endDate) {
        activeOverrides.set(o.prayerKey, o);
      }
    });

    const alerts: string[] = [];

    // Per-prayer evaluation: decides what (if anything) to add to the ticker.
    const evalPrayer = (
      displayName: string,
      prayerKey:   string,
      todayIqamah: string | undefined,
      tmrwIqamah:  string | undefined,
    ) => {
      const todayMins = toMins(todayIqamah);
      const tmrwMins  = toMins(tmrwIqamah);
      const hasPassed = todayMins !== -1 && currentTimeMinutes >= todayMins;

      if (!hasPassed) {
        // ── Prayer is still ahead today ───────────────────────────────────────
        // Only alert if an admin has manually overridden this salah's time,
        // so the congregation sees the updated iqamah before they come to pray.
        const override = activeOverrides.get(prayerKey);
        if (override) {
          alerts.push(`${displayName} iqamah is at ${override.iqamah} today`);
        }
        // No override → regular schedule → no alert needed.
      } else {
        // ── Prayer has already happened today ─────────────────────────────────
        // Override alert is no longer useful (people already prayed at that time).
        // Instead, look ahead: if tomorrow's time differs from today's, warn now.
        if (tmrwMins !== -1 && tmrwMins !== todayMins) {
          const alert = template
            .replace('{prayers}', displayName)
            .replace('{new time}', tmrwIqamah!);
          alerts.push(alert);
        }
      }
    };

    // Evaluate the four daily prayers (Maghrib is always skipped — it changes
    // every day by design as sunset + offset, so alerting would be noise).
    evalPrayer('Fajr',  'fajr',  todaySchedule.prayers.fajr.iqamah,  tomorrowSchedule.prayers.fajr.iqamah);
    evalPrayer('Dhuhr', 'dhuhr', todaySchedule.prayers.dhuhr.iqamah, tomorrowSchedule.prayers.dhuhr.iqamah);
    evalPrayer('Asr',   'asr',   todaySchedule.prayers.asr.iqamah,   tomorrowSchedule.prayers.asr.iqamah);
    evalPrayer('Isha',  'isha',  todaySchedule.prayers.isha.iqamah,  tomorrowSchedule.prayers.isha.iqamah);

    // Jumu'ah handling:
    //   • If TODAY is Friday: evaluate Jumu'ah as a regular prayer.
    //   • If TOMORROW is Friday: after Isha passes, remind about tomorrow's
    //     Jumu'ah time (it might differ if Dhuhr iqamah changed).
    const todayDate    = new Date(todayDateStr + 'T12:00:00');
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);

    if (todayDate.getDay() === 5) {
      // Today is Friday — treat Jumu'ah like any other prayer.
      evalPrayer("Jumu'ah", 'jumuah', todaySchedule.jumuah.iqamah, tomorrowSchedule.jumuah.iqamah);
    } else if (tomorrowDate.getDay() === 5) {
      // Tomorrow is Friday — after Isha show tomorrow's Jumu'ah time if changed.
      const ishaMinutes = toMins(todaySchedule.prayers.isha.iqamah);
      const ishaHasPassed = ishaMinutes !== -1 && currentTimeMinutes >= ishaMinutes;
      if (ishaHasPassed) {
        const todayJumuahMins = toMins(todaySchedule.jumuah.iqamah);
        const tmrwJumuahMins  = toMins(tomorrowSchedule.jumuah.iqamah);
        if (tmrwJumuahMins !== -1 && tmrwJumuahMins !== todayJumuahMins) {
          const alert = template
            .replace('{prayers}', "Jumu'ah")
            .replace('{new time}', tomorrowSchedule.jumuah.iqamah!);
          alerts.push(alert);
        }
      }
    }

    setScheduleAlert(alerts.join(' • ') || "");
  }, [todaySchedule, tomorrowSchedule, autoAlertSettings, todayDateStr, manualOverrides, currentTimeMinutes]);

  // Helper to parse time string to Date object for today in Eastern timezone.
  // Offsets from today's Eastern midnight so the result is correct regardless
  // of the device's system timezone.
  const parseTime = useCallback((timeStr: string | undefined): Date | null => {
    if (!timeStr) return null;
    const match = timeStr.match(/(\d+):(\d+)\s?(AM|PM)/i);
    if (!match) return null;
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return new Date(todayEasternMidnightMs + (hours * 60 + minutes) * 60 * 1000);
  }, [todayEasternMidnightMs]);

  // Frequent Update Loop (Timer)
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const currentIsoDate = toEasternDateStr(now);

      // 0. Keep currentTimeMinutes in sync (triggers schedule-alert re-evaluation
      //    exactly once per minute, which is when "has this prayer passed?" changes).
      const newMins = toEasternMinutes(now);
      setCurrentTimeMinutes(prev => prev !== newMins ? newMins : prev);

      // 1. Check for Midnight Transition (Eastern timezone)
      if (currentIsoDate !== todayDateStr) {
        setTodayDateStr(currentIsoDate);
        return; // State update will trigger re-render and schedule update
      }

      // 2. Mobile Silent Alert Logic
      if (mobileAlertSettings.enabled && !isPreviewAlert) {
        const prayersList = [
          todaySchedule.prayers.fajr,
          todaySchedule.prayers.dhuhr,
          todaySchedule.prayers.asr,
          todaySchedule.prayers.maghrib,
          todaySchedule.prayers.isha
        ];

        // Determine which Iqamah is coming up
        const iqamahTimes = prayersList
          .map(p => parseTime(p.iqamah))
          .filter(Boolean) as Date[];

        // Special case for Jumuah on Friday
        // Skip if disableForJumuah is enabled
        if (now.getDay() === 5 && todaySchedule.jumuah.iqamah && !mobileAlertSettings.disableForJumuah) {
          const jTime = parseTime(todaySchedule.jumuah.iqamah);
          if (jTime) iqamahTimes.push(jTime);
        }

        // Find the next active iqamah or currently happening one
        const upcoming = iqamahTimes.find(time => {
          const diff = time.getTime() - now.getTime();
          // Check if within trigger window AND not yet passed
          const triggerMs = mobileAlertSettings.triggerMinutes * 60 * 1000;
          return diff > 0 && diff <= triggerMs;
        });

        if (upcoming) {
          setIsMobileAlertActive(true);
          setAlertTargetTime(upcoming);
        } else {
          setIsMobileAlertActive(false);
          setAlertTargetTime(null);
        }
      }
    };

    tick();
    const interval = setInterval(tick, 1000); // Check every second for accurate alert triggering
    return () => clearInterval(interval);

  }, [todayDateStr, mobileAlertSettings, isPreviewAlert, todaySchedule, parseTime]);

  // Combine system alerts with manually added announcement items
  const effectiveAnnouncement: Announcement = React.useMemo(() => {
    const base = announcement || DEFAULT_ANNOUNCEMENT;
    let items = Array.isArray(base.items) ? [...base.items] : [];
    const systemAlerts = [];

    if (scheduleAlert) {
      systemAlerts.push({
        id: 'schedule-alert',
        text: scheduleAlert,
        color: autoAlertSettings.color,
        animation: autoAlertSettings.animation
      });
    }

    if (connectionAlert) {
      systemAlerts.push({
        id: 'connection-alert',
        text: connectionAlert,
        color: '#fbbf24', // Amber-400 for warnings
        animation: 'none'
      });
    }

    if (systemAlerts.length > 0) {
      items = [...systemAlerts, ...items];
    }
    if (saveError) {
      const errorItem: AnnouncementItem = {
        id: 'save-error',
        text: saveError,
        color: '#ef4444', // Red
        animation: 'pulse'
      };
      items = [errorItem, ...items];
    }
    return { ...base, items };
  }, [announcement, scheduleAlert, connectionAlert, autoAlertSettings, saveError]);

  // --- Fullscreen & Shortcuts ---
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false));
      }
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        toggleFullscreen();
      }
      if (e.key === 'Escape') {
        if (isSettingsOpen) setIsSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, toggleFullscreen]);

  // Determine if Fullscreen Alert should show
  // Show if: (Active in time window OR Preview Mode) AND (Mode is Fullscreen)
  const showFullscreenAlert = (isMobileAlertActive || isPreviewAlert) && mobileAlertSettings.mode === 'fullscreen';
  // If preview is active, use a fake target time (now + 2 minutes)
  const effectiveTargetTime = isPreviewAlert ? new Date(Date.now() + 120000) : alertTargetTime;

  // Defensive Props: Ensure critical data arrays/objects are valid to prevent crashes
  const safeSlidesConfig = Array.isArray(slidesConfig) ? slidesConfig : DEFAULT_SLIDES;
  // Use effectiveAnnouncement (which includes system alerts) but ensure it is robustly constructed above
  // Ensure we have minimal valid prayer data to prevent crashes
  const safeDisplayedPrayers = displayedPrayerTimes && displayedPrayerTimes.fajr ? displayedPrayerTimes : DEFAULT_PRAYER_TIMES;

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden font-sans antialiased selection:bg-mosque-gold selection:text-mosque-navy">
      {/* 
        VIRTUAL VIEWPORT CONTAINER 
        Hardware accelerated scaling container
      */}
      <div 
        style={{ 
          width: '1920px', 
          height: '1080px',
          transform: `scale(${scale})`,
          willChange: 'transform'
        }}
        className="relative shadow-2xl overflow-hidden bg-mosque-navy shrink-0"
      >
        
        <BackgroundManager theme={currentTheme} />

        <div className="relative z-10 w-full h-full">
          <ErrorBoundary fallback={
            <div className="w-full h-full flex items-center justify-center text-white bg-mosque-navy p-8 text-center">
               <div>
                  <h1 className="text-4xl font-bold text-red-500 mb-4">Display Error</h1>
                  <p className="text-xl mb-4">The signage encountered a critical error.</p>
                  <button onClick={() => window.location.reload()} className="px-6 py-3 bg-mosque-gold text-mosque-navy font-bold rounded">
                    Reload Application
                  </button>
               </div>
            </div>
          }>
            <AnimatePresence mode="wait">
              {/* Fullscreen Alert Overlay */}
              {showFullscreenAlert && effectiveTargetTime ? (
                  <motion.div
                      key="fullscreen-alert"
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute inset-0 z-50"
                  >
                      <MobileSilentAlert
                          settings={mobileAlertSettings}
                          targetTime={effectiveTargetTime}
                          previewMode={isPreviewAlert}
                      />
                  </motion.div>
              ) : (
                  <motion.div
                    key="prayer-times"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="w-full h-full"
                  >
                    <ScreenPrayerTimes
                      prayers={safeDisplayedPrayers}
                      jumuah={displayedJumuahTimes}
                      announcement={effectiveAnnouncement} // Use effectiveAnnouncement (includes alerts)
                      slidesConfig={safeSlidesConfig} // Use safe slides config
                      excelSchedule={excelSchedule}
                      manualOverrides={manualOverrides}
                      maghribOffset={maghribOffset}
                      tickerBg={tickerBg}
                      // Alert props for panel mode
                      isAlertActive={isMobileAlertActive || isPreviewAlert}
                      alertSettings={mobileAlertSettings}
                      nextIqamahTime={effectiveTargetTime}
                      scheduleIndex={scheduleIndex}
                    />
                  </motion.div>
              )}
            </AnimatePresence>
          </ErrorBoundary>
        </div>

        {/* Controls */}
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className={`absolute bottom-4 right-4 z-50 p-4 bg-mosque-navy hover:bg-mosque-gold text-mosque-gold hover:text-mosque-navy border-2 border-mosque-gold rounded-full transition-all duration-300 shadow-2xl ${isFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          title="Settings"
        >
          <Settings className="w-8 h-8" />
        </button>

        <button 
          onClick={toggleFullscreen}
          className={`absolute bottom-24 right-4 z-50 p-4 bg-mosque-navy hover:bg-mosque-gold text-mosque-gold hover:text-mosque-navy border-2 border-mosque-gold rounded-full transition-all duration-300 shadow-2xl ${isFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          title="Toggle Full Screen (Ctrl + F)"
        >
          {isFullscreen ? <Minimize className="w-8 h-8" /> : <Maximize className="w-8 h-8" />}
        </button>

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          excelSchedule={excelSchedule}
          setExcelSchedule={setExcelSchedule}
          manualOverrides={manualOverrides}
          setManualOverrides={setManualOverrides}
          announcement={announcement}
          setAnnouncement={setAnnouncement}
          currentTheme={currentTheme}
          setCurrentTheme={setCurrentTheme}
          maghribOffset={maghribOffset}
          setMaghribOffset={setMaghribOffset}
          autoAlertSettings={autoAlertSettings}
          setAutoAlertSettings={setAutoAlertSettings}
          tickerBg={tickerBg}
          setTickerBg={setTickerBg}
          slidesConfig={slidesConfig}
          setSlidesConfig={setSlidesConfig}
          mobileAlertSettings={mobileAlertSettings}
          setMobileAlertSettings={setMobileAlertSettings}
          setIsPreviewAlert={setIsPreviewAlert}
          scheduleIndex={scheduleIndex}
        />

        {/* Auto-update component for Vercel deployments */}
        <AutoUpdate />

      </div>
    </div>
  );
};

export default App;
