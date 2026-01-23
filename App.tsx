import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
function usePersistentState<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  // Initialize state function to avoid reading from LS on every render
  const [state, setState] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Write to LS whenever state changes
  useEffect(() => {
    const saveData = () => {
      try {
        window.localStorage.setItem(key, JSON.stringify(state));
      } catch (error) {
        console.warn(`Error writing localStorage key "${key}":`, error);
      }
    };

    // Use requestIdleCallback to avoid blocking the main thread during UI updates
    if ('requestIdleCallback' in window) {
      const handle = (window as any).requestIdleCallback(saveData);
      return () => (window as any).cancelIdleCallback(handle);
    } else {
      const handle = setTimeout(saveData, 500);
      return () => clearTimeout(handle);
    }
  }, [key, state]);

  return [state, setState];
}

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
  template: "⚠️ NOTICE: Iqamah changes tomorrow for {prayers}",
  color: "#ef4444", // Red-500
  animation: "pulse"
};

const App: React.FC = () => {
  // --- State (Persistent for Offline Mode) ---
  const [excelSchedule, setExcelSchedule] = usePersistentState<Record<string, ExcelDaySchedule>>('schedule_data', {});
  const scheduleIndex = useMemo(() => buildScheduleIndex(excelSchedule), [excelSchedule]);

  const [manualOverrides, setManualOverrides] = usePersistentState<ManualOverride[]>('manual_overrides', []);
  const [announcement, setAnnouncement] = usePersistentState<Announcement>('announcement_config', DEFAULT_ANNOUNCEMENT);
  const [currentTheme, setCurrentTheme] = usePersistentState<string>('app_theme', 'starry');
  const [maghribOffset, setMaghribOffset] = usePersistentState<number>('maghrib_offset', 10);
  
  // New Configs
  const [autoAlertSettings, setAutoAlertSettings] = usePersistentState<AutoAlertSettings>('auto_alert_settings', DEFAULT_AUTO_ALERTS);
  const [mobileAlertSettings, setMobileAlertSettings] = usePersistentState<MobileSilentAlertSettings>('mobile_alert_settings', DEFAULT_MOBILE_SILENT_ALERT);
  const [tickerBg, setTickerBg] = usePersistentState<'white' | 'navy'>('ticker_bg', 'white');
  
  // Slideshow State
  const [slidesConfig, setSlidesConfig] = usePersistentState<SlideConfig[]>('slides_config', DEFAULT_SLIDES);

  // --- Ephemeral State ---
  const [displayedPrayerTimes, setDisplayedPrayerTimes] = useState<DailyPrayers>(DEFAULT_PRAYER_TIMES);
  const [displayedJumuahTimes, setDisplayedJumuahTimes] = useState(DEFAULT_JUMUAH_TIMES);
  const [systemAlert, setSystemAlert] = useState<string>("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1);
  
  // Alert Logic State
  const [isMobileAlertActive, setIsMobileAlertActive] = useState(false);
  const [alertTargetTime, setAlertTargetTime] = useState<Date | null>(null);
  const [isPreviewAlert, setIsPreviewAlert] = useState(false);

  // Supabase sync state
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Load data from Supabase on mount
  useEffect(() => {
    const loadFromDatabase = async () => {
      console.log('🔄 Loading data from Supabase...');

      // Load Excel schedule
      const dbExcelSchedule = await loadExcelScheduleFromDatabase();
      if (Object.keys(dbExcelSchedule).length > 0) {
        setExcelSchedule(dbExcelSchedule);
        console.log(`✅ Loaded ${Object.keys(dbExcelSchedule).length} days from database`);
      }

      // Load manual overrides
      const dbManualOverrides = await loadManualOverridesFromDatabase();
      if (dbManualOverrides.length > 0) {
        setManualOverrides(dbManualOverrides);
        console.log(`✅ Loaded ${dbManualOverrides.length} manual overrides from database`);
      }

      // Load announcement items
      const dbAnnouncementItems = await loadAnnouncementItemsFromDatabase();
      if (dbAnnouncementItems.length > 0) {
        console.log(`📥 Loading ${dbAnnouncementItems.length} announcement items from Supabase, overwriting any local changes`);
        setAnnouncement(prev => {
          const prevCount = prev.items.length;
          if (prevCount > 0 && prevCount !== dbAnnouncementItems.length) {
            console.warn(`⚠️ Local had ${prevCount} announcements, Supabase has ${dbAnnouncementItems.length}. Using Supabase data.`);
          }
          return { ...prev, items: dbAnnouncementItems };
        });
        console.log(`✅ Loaded ${dbAnnouncementItems.length} announcement items from database`);
      } else {
        console.log(`ℹ️ No announcement items found in Supabase, keeping local data`);
      }

      // Load slideshow config
      const dbSlidesConfig = await loadSlideshowConfigFromDatabase();
      if (dbSlidesConfig && dbSlidesConfig.length > 0) {
        setSlidesConfig(dbSlidesConfig);
        console.log(`✅ Loaded ${dbSlidesConfig.length} slideshow slides from database`);
      }

      // Load global settings
      const dbGlobalSettings = await loadGlobalSettingsFromDatabase();
      if (dbGlobalSettings) {
        setCurrentTheme(dbGlobalSettings.theme);
        setTickerBg(dbGlobalSettings.tickerBg);
        setMaghribOffset(dbGlobalSettings.maghribOffset);
        setAutoAlertSettings(dbGlobalSettings.autoAlertSettings);
        setMobileAlertSettings(dbGlobalSettings.mobileAlertSettings);
        console.log('✅ Loaded global settings from database');
      }

      setIsDataLoaded(true);
      console.log('✅ All data loaded from Supabase');

      // Warn if Supabase is not configured
      if (!isSupabaseConfigured()) {
        console.warn('⚠️ Supabase is NOT configured! Data will only be stored in localStorage.');
        console.warn('⚠️ To enable cloud sync, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
        setSystemAlert('⚠️ Cloud sync disabled - data stored locally only. Check Supabase configuration.');
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
        const dbManualOverrides = await loadManualOverridesFromDatabase();
        setManualOverrides(dbManualOverrides);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'excel_schedule' }, async () => {
        const dbExcelSchedule = await loadExcelScheduleFromDatabase();
        if (Object.keys(dbExcelSchedule).length > 0) {
          setExcelSchedule(dbExcelSchedule);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcement_items' }, async () => {
        const dbAnnouncementItems = await loadAnnouncementItemsFromDatabase();
        setAnnouncement(prev => ({ ...prev, items: dbAnnouncementItems }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'slideshow_config' }, async () => {
        const dbSlidesConfig = await loadSlideshowConfigFromDatabase();
        if (dbSlidesConfig && dbSlidesConfig.length > 0) {
          setSlidesConfig(dbSlidesConfig);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'global_settings' }, async () => {
        const dbGlobalSettings = await loadGlobalSettingsFromDatabase();
        if (dbGlobalSettings) {
          setCurrentTheme(dbGlobalSettings.theme);
          setTickerBg(dbGlobalSettings.tickerBg);
          setMaghribOffset(dbGlobalSettings.maghribOffset);
          setAutoAlertSettings(dbGlobalSettings.autoAlertSettings);
          setMobileAlertSettings(dbGlobalSettings.mobileAlertSettings);
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
  useEffect(() => {
    if (!isDataLoaded) return;
    if (Object.keys(excelSchedule).length === 0) return; // Don't save empty schedule
    saveExcelScheduleToDatabase(excelSchedule);
  }, [excelSchedule, isDataLoaded]);

  // Save manual overrides to Supabase whenever they change (after initial load)
  useEffect(() => {
    if (!isDataLoaded) return;
    saveManualOverridesToDatabase(manualOverrides);
  }, [manualOverrides, isDataLoaded]);

  // Save announcement items to Supabase whenever they change (after initial load)
  useEffect(() => {
    if (!isDataLoaded) return;
    console.log(`💾 Saving ${announcement.items.length} announcement items to Supabase`);
    saveAnnouncementItemsToDatabase(announcement.items).then(result => {
      if (result.success) {
        console.log(`✅ Successfully saved ${announcement.items.length} announcements to Supabase`);
      } else {
        console.error(`❌ Failed to save announcements to Supabase:`, result.error);
      }
    });
  }, [announcement.items, isDataLoaded]);

  // Save slideshow config to Supabase whenever it changes (after initial load)
  useEffect(() => {
    if (!isDataLoaded) return;
    saveSlideshowConfigToDatabase(slidesConfig);
  }, [slidesConfig, isDataLoaded]);

  // Save global settings to Supabase whenever they change (after initial load)
  useEffect(() => {
    if (!isDataLoaded) return;
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
  
  // Helper to parse time string to Date object for today
  const parseTime = (timeStr: string | undefined): Date | null => {
    if (!timeStr) return null;
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  useEffect(() => {
    const updateTimes = () => {
      const now = new Date();
      const todayKey = now.toISOString().split('T')[0];

      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowKey = tomorrow.toISOString().split('T')[0];

      // Calculate Schedules
      const todaySchedule = getScheduleForDate(todayKey, excelSchedule, manualOverrides, maghribOffset, scheduleIndex);
      const tomorrowSchedule = getScheduleForDate(tomorrowKey, excelSchedule, manualOverrides, maghribOffset, scheduleIndex);

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

      // --- Change Detection Logic ---
      // NOTE: Maghrib is excluded because it changes daily (tied to sunset + offset)
      const changes: string[] = [];
      const norm = (t?: string) => t?.replace(/\s+/g, '').toUpperCase() || '';
      const pushChange = (label: string, time?: string) => {
        if (time) {
          changes.push(`${label} Salah is at ${time}`);
        }
      };

      if (norm(todaySchedule.prayers.fajr.iqamah) !== norm(tomorrowSchedule.prayers.fajr.iqamah)) {
        pushChange('Fajr', tomorrowSchedule.prayers.fajr.iqamah);
      }
      if (norm(todaySchedule.prayers.dhuhr.iqamah) !== norm(tomorrowSchedule.prayers.dhuhr.iqamah)) {
        pushChange('Dhuhr', tomorrowSchedule.prayers.dhuhr.iqamah);
      }
      if (norm(todaySchedule.prayers.asr.iqamah) !== norm(tomorrowSchedule.prayers.asr.iqamah)) {
        pushChange('Asr', tomorrowSchedule.prayers.asr.iqamah);
      }
      // SKIP MAGHRIB - it changes daily by design (sunset + offset), no alert needed
      if (norm(todaySchedule.prayers.isha.iqamah) !== norm(tomorrowSchedule.prayers.isha.iqamah)) {
        pushChange('Isha', tomorrowSchedule.prayers.isha.iqamah);
      }

      if (tomorrow.getDay() === 5) { // 5 = Friday
         if (norm(todaySchedule.jumuah.iqamah) !== norm(tomorrowSchedule.jumuah.iqamah)) {
            pushChange(`Jumu'ah`, tomorrowSchedule.jumuah.iqamah);
         }
      }

      if (changes.length > 0 && autoAlertSettings.enabled) {
        const alertText = `⚠️ Attention: From tomorrow, ${changes.join(', ')}`;
        setSystemAlert(alertText);
      } else {
        setSystemAlert("");
      }

      // --- Mobile Silent Alert Logic ---
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
         if (now.getDay() === 5 && todaySchedule.jumuah.iqamah) {
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

    updateTimes();
    const interval = setInterval(updateTimes, 1000); // Check every second for accurate alert triggering
    return () => clearInterval(interval);

  }, [excelSchedule, manualOverrides, maghribOffset, autoAlertSettings, mobileAlertSettings, isPreviewAlert]);

  // Combine system alerts with manually added announcement items
  const effectiveAnnouncement: Announcement = React.useMemo(() => {
    let items = [...announcement.items];
    if (systemAlert) {
      const alertItem: AnnouncementItem = {
        id: 'sys-alert',
        text: systemAlert,
        color: autoAlertSettings.color,
        animation: autoAlertSettings.animation
      };
      items = [alertItem, ...items];
    }
    return { ...announcement, items };
  }, [announcement, systemAlert, autoAlertSettings]);

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
                    prayers={displayedPrayerTimes} 
                    jumuah={displayedJumuahTimes} 
                    announcement={effectiveAnnouncement}
                    slidesConfig={slidesConfig}
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
