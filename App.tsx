import React, { useState, useEffect } from 'react';
import { ScreenPrayerTimes } from './components/ScreenPrayerTimes';
import { SettingsModal } from './components/SettingsModal';
import { DailyPrayers, Announcement, Event, AppSettings, ExcelDaySchedule, ManualOverride } from './types';
import { DEFAULT_PRAYER_TIMES, DEFAULT_JUMUAH_TIMES, DEFAULT_EVENTS, DEFAULT_ANNOUNCEMENT } from './constants';
import { AnimatePresence, motion } from 'framer-motion';
import { Settings, Maximize, Minimize } from 'lucide-react';

// --- Background Components ---

const MosqueSilhouetteSVG = () => (
  <div className="absolute inset-0 z-0 pointer-events-none text-mosque-gold opacity-10 flex items-end">
    <svg viewBox="0 0 1200 320" className="w-full h-[60%] fill-current" preserveAspectRatio="none">
        <path d="M0,320 L0,310 H50 Q100,280 150,310 H180 V200 L200,170 L220,200 V310 H350 Q480,150 610,310 H780 V200 L800,170 L820,200 V310 H850 Q900,280 950,310 H1200 V320 Z" />
        <circle cx="200" cy="170" r="4" />
        <circle cx="800" cy="170" r="4" />
        <path d="M480,200 Q610,80 740,200" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" />
    </svg>
  </div>
);

const BackgroundLayer: React.FC = () => {
  return (
    <div className="absolute inset-0 z-0 bg-mosque-navy overflow-hidden">
       <div className="absolute inset-0 bg-gradient-to-br from-mosque-navy via-[#0F2942] to-black"></div>
       
       <motion.div 
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ duration: 1.5 }}
           className="absolute inset-0"
       >
           <MosqueSilhouetteSVG />
       </motion.div>
       
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
  
  // Note: Events state kept for SettingsModal compatibility, though not displayed
  const [events, setEvents] = useState<Event[]>(DEFAULT_EVENTS);
  const [announcement, setAnnouncement] = useState<Announcement>(DEFAULT_ANNOUNCEMENT);
  
  const [appSettings, setAppSettings] = useState<AppSettings>({
    autoScroll: false, 
    scrollDuration: 15
  });

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
      if (excelSchedule[dateKey]) {
        const day = excelSchedule[dateKey];
        newPrayers.fajr = { name: 'Fajr', ...day.fajr };
        newPrayers.dhuhr = { name: 'Dhuhr', ...day.dhuhr };
        newPrayers.asr = { name: 'Asr', ...day.asr };
        newPrayers.maghrib = { name: 'Maghrib', ...day.maghrib };
        newPrayers.isha = { name: 'Isha', ...day.isha };
        
        if (day.jumuahIqamah) {
           newJumuah.iqamah = day.jumuahIqamah;
        }
      }

      // 3. Apply Manual Overrides (Highest Priority)
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

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden font-sans antialiased relative">
      <div className="w-full aspect-video max-h-screen relative shadow-2xl overflow-hidden bg-mosque-navy">
        <BackgroundLayer />

        <div className="relative z-10 w-full h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key="prayer-times"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="w-full h-full"
            >
              <ScreenPrayerTimes prayers={displayedPrayerTimes} jumuah={displayedJumuahTimes} announcement={announcement} />
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