import React, { useState, useEffect } from 'react';
import { ScreenPrayerTimes } from './components/ScreenPrayerTimes';
import { SettingsModal } from './components/SettingsModal';
import { ScreenType, DailyPrayers, Announcement, Event, AppSettings, ExcelDaySchedule, ManualOverride } from './types';
import { DEFAULT_PRAYER_TIMES, DEFAULT_JUMUAH_TIMES, DEFAULT_EVENTS, DEFAULT_ANNOUNCEMENT } from './constants';
import { AnimatePresence, motion } from 'framer-motion';
import { Settings, Maximize, Minimize } from 'lucide-react';

// --- Background Components ---

const ArabesquePatternSVG = () => (
  <svg width="100%" height="100%" className="absolute inset-0 opacity-[0.07] text-mosque-gold pointer-events-none z-0">
    <defs>
      <pattern id="arabesque-pattern" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
        <path d="M40 0 L50 20 L70 20 L55 35 L60 55 L40 45 L20 55 L25 35 L10 20 L30 20 Z" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M0 0 L10 20 L30 20 L15 35 L20 55 L0 45 L-20 55 L-15 35 L-30 20 L-10 20 Z" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.5" transform="translate(0,0)" />
        <path d="M80 0 L90 20 L110 20 L95 35 L100 55 L80 45 L60 55 L65 35 L50 20 L70 20 Z" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.5" transform="translate(0,0)" />
        <path d="M0 80 L10 100 L30 100 L15 115 L20 135 L0 125 L-20 135 L-15 115 L-30 100 L-10 100 Z" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.5" transform="translate(0,0)" />
        <path d="M80 80 L90 100 L110 100 L95 115 L100 135 L80 125 L60 135 L65 115 L50 100 L70 100 Z" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.5" transform="translate(0,0)" />
        <circle cx="40" cy="40" r="5" fill="currentColor" opacity="0.5" />
        <circle cx="0" cy="0" r="10" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="80" cy="0" r="10" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="0" cy="80" r="10" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="80" cy="80" r="10" fill="none" stroke="currentColor" strokeWidth="1" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#arabesque-pattern)" />
  </svg>
);

const BackgroundLayer: React.FC<{ type: ScreenType }> = ({ type }) => {
  return (
    <div className="absolute inset-0 z-0 bg-mosque-navy overflow-hidden">
       <div className="absolute inset-0 bg-gradient-to-br from-mosque-navy via-[#0F2942] to-black"></div>
       <ArabesquePatternSVG />
       <div className="absolute inset-0 bg-[radial-gradient(transparent_0%,rgba(0,0,0,0.6)_100%)] pointer-events-none"></div>
    </div>
  );
};

const App: React.FC = () => {
  // --- State ---
  // Computed display state (derived from schedules)
  const [displayedPrayerTimes, setDisplayedPrayerTimes] = useState<DailyPrayers>(DEFAULT_PRAYER_TIMES);
  const [displayedJumuahTimes, setDisplayedJumuahTimes] = useState(DEFAULT_JUMUAH_TIMES);

  // Source Data
  const [excelSchedule, setExcelSchedule] = useState<Record<string, ExcelDaySchedule>>({});
  const [manualOverrides, setManualOverrides] = useState<ManualOverride[]>([]);
  
  const [events, setEvents] = useState<Event[]>(DEFAULT_EVENTS);
  const [announcement, setAnnouncement] = useState<Announcement>(DEFAULT_ANNOUNCEMENT);
  
  const [appSettings, setAppSettings] = useState<AppSettings>({
    autoScroll: false, 
    scrollDuration: 15
  });

  const [currentScreenIndex, setCurrentScreenIndex] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // --- Logic: Priority Scheduler ---
  
  useEffect(() => {
    const updateTimes = () => {
      const today = new Date();
      const dateKey = today.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // 1. Start with Default
      let newPrayers = { ...DEFAULT_PRAYER_TIMES };
      let newJumuah = { ...DEFAULT_JUMUAH_TIMES };

      // 2. Apply Excel (if exists for today)
      // Note: Excel currently provides Iqamah. We also use it for Start if available, 
      // otherwise we might default Start or keep previous. 
      // In this app, we'll assume Excel row provides the "Day's Standard".
      if (excelSchedule[dateKey]) {
        const day = excelSchedule[dateKey];
        newPrayers.fajr = { name: 'Fajr', ...day.fajr };
        newPrayers.dhuhr = { name: 'Dhuhr', ...day.dhuhr };
        newPrayers.asr = { name: 'Asr', ...day.asr };
        newPrayers.maghrib = { name: 'Maghrib', ...day.maghrib };
        newPrayers.isha = { name: 'Isha', ...day.isha };
        
        if (day.jumuahIqamah) {
           newJumuah.iqamah = day.jumuahIqamah;
           // Keep default start for Jumuah unless we have logic to change it
        }
      }

      // 3. Apply Manual Overrides (Highest Priority)
      // Check if today falls within any override range
      manualOverrides.forEach(override => {
         if (dateKey >= override.startDate && dateKey <= override.endDate) {
            if (override.prayerKey === 'jumuah') {
                newJumuah = { start: override.start, iqamah: override.iqamah };
            } else {
                // It's a daily prayer
                const key = override.prayerKey as keyof Omit<DailyPrayers, 'sunrise'|'sunset'>;
                if (newPrayers[key]) {
                    newPrayers[key] = {
                        ...newPrayers[key],
                        start: override.start,
                        iqamah: override.iqamah
                    };
                }
            }
         }
      });

      // 4. Update Display State
      setDisplayedPrayerTimes(newPrayers);
      setDisplayedJumuahTimes(newJumuah);
    };

    // Run immediately and then every minute
    updateTimes();
    const interval = setInterval(updateTimes, 60000);
    return () => clearInterval(interval);

  }, [excelSchedule, manualOverrides]);


  // --- Fullscreen & Shortcuts ---
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false));
      }
    }
  };

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
  }, [isSettingsOpen]);

  const renderScreen = () => {
    return <ScreenPrayerTimes prayers={displayedPrayerTimes} jumuah={displayedJumuahTimes} announcement={announcement} />;
  };

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden font-sans antialiased relative">
      <div className="w-full aspect-video max-h-screen relative shadow-2xl overflow-hidden bg-mosque-navy">
        <BackgroundLayer type={ScreenType.PRAYER_TIMES} />

        <div className="relative z-10 w-full h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key="main-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="w-full h-full"
            >
              {renderScreen()}
            </motion.div>
          </AnimatePresence>
        </div>

        <button 
          onClick={() => setIsSettingsOpen(true)}
          className={`absolute bottom-4 right-4 z-50 p-3 bg-black/20 hover:bg-black/80 text-white/30 hover:text-white rounded-full transition-all duration-300 backdrop-blur-sm ${isFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          title="Settings"
        >
          <Settings className="w-6 h-6" />
        </button>

        <button 
          onClick={toggleFullscreen}
          className={`absolute bottom-20 right-4 z-50 p-3 bg-black/20 hover:bg-black/80 text-white/30 hover:text-white rounded-full transition-all duration-300 backdrop-blur-sm ${isFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          title="Toggle Full Screen (Ctrl + F)"
        >
          {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
        </button>

        <SettingsModal 
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          // We pass setters for the Source Data, not the displayed data
          excelSchedule={excelSchedule}
          setExcelSchedule={setExcelSchedule}
          manualOverrides={manualOverrides}
          setManualOverrides={setManualOverrides}
          
          announcement={announcement}
          setAnnouncement={setAnnouncement}
          events={events}
          setEvents={setEvents}
          appSettings={appSettings}
          setAppSettings={setAppSettings}
        />
        
      </div>
    </div>
  );
};

export default App;