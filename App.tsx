import React, { useState, useEffect } from 'react';
import { ScreenPrayerTimes } from './components/ScreenPrayerTimes';
import { SettingsModal } from './components/SettingsModal';
import { DailyPrayers, Announcement, ExcelDaySchedule, ManualOverride, AnnouncementItem } from './types';
import { DEFAULT_PRAYER_TIMES, DEFAULT_JUMUAH_TIMES, DEFAULT_ANNOUNCEMENT } from './constants';
import { AnimatePresence, motion } from 'framer-motion';
import { Settings, Maximize, Minimize } from 'lucide-react';

// --- Background Components ---

const StarryBackground = React.memo(() => {
  // Generate a stable set of stars - INCREASED COUNT & SIZE
  const stars = React.useMemo(() => {
    return Array.from({ length: 150 }).map((_, i) => ({
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
             opacity: 0.4
           }}
         />
       ))}
    </div>
  );
});

const BackgroundManager = ({ theme }: { theme: string }) => {
  switch (theme) {
    case 'starry':
      return <StarryBackground />;

    case 'lattice':
      return (
        <div className="absolute inset-0 z-0 bg-mosque-navy overflow-hidden">
           <div className="absolute inset-0 bg-[#08152b]"></div>
           <div className="absolute inset-0 text-mosque-gold opacity-10">
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
          <div className="absolute inset-0 text-[#E2E8F0] opacity-[0.07]">
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
};

// --- Scheduler Logic ---

const getScheduleForDate = (
  dateStr: string, // YYYY-MM-DD
  excelSchedule: Record<string, ExcelDaySchedule>,
  manualOverrides: ManualOverride[]
): { prayers: DailyPrayers, jumuah: { start: string, iqamah: string } } => {
  
  // 1. Start with Default
  let newPrayers = { ...DEFAULT_PRAYER_TIMES };
  let newJumuah = { ...DEFAULT_JUMUAH_TIMES };

  // 2. Apply Excel (if exists for date)
  if (excelSchedule[dateStr]) {
    const day = excelSchedule[dateStr];
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
     if (dateStr >= override.startDate && dateStr <= override.endDate) {
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

  return { prayers: newPrayers, jumuah: newJumuah };
};

const App: React.FC = () => {
  // --- State ---
  const [displayedPrayerTimes, setDisplayedPrayerTimes] = useState<DailyPrayers>(DEFAULT_PRAYER_TIMES);
  const [displayedJumuahTimes, setDisplayedJumuahTimes] = useState(DEFAULT_JUMUAH_TIMES);
  const [systemAlert, setSystemAlert] = useState<string>("");
  const [currentTheme, setCurrentTheme] = useState<string>('arabesque');

  // Source Data
  const [excelSchedule, setExcelSchedule] = useState<Record<string, ExcelDaySchedule>>({});
  const [manualOverrides, setManualOverrides] = useState<ManualOverride[]>([]);
  
  const [announcement, setAnnouncement] = useState<Announcement>(DEFAULT_ANNOUNCEMENT);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Scaling Logic for Virtual Viewport (1920x1080)
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      const TARGET_WIDTH = 1920;
      const TARGET_HEIGHT = 1080;
      
      const scaleX = window.innerWidth / TARGET_WIDTH;
      const scaleY = window.innerHeight / TARGET_HEIGHT;
      
      // Use the smaller scale to fit content within the screen (contain)
      // This ensures 16:9 aspect ratio is preserved and content fits any TV
      setScale(Math.min(scaleX, scaleY));
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial calculation

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Logic: Priority Scheduler & Alerts ---
  
  useEffect(() => {
    const updateTimes = () => {
      const now = new Date();
      const todayKey = now.toISOString().split('T')[0];
      
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowKey = tomorrow.toISOString().split('T')[0];

      // Calculate Schedules
      const todaySchedule = getScheduleForDate(todayKey, excelSchedule, manualOverrides);
      const tomorrowSchedule = getScheduleForDate(tomorrowKey, excelSchedule, manualOverrides);

      // Set Display
      setDisplayedPrayerTimes(todaySchedule.prayers);
      setDisplayedJumuahTimes(todaySchedule.jumuah);

      // --- Change Detection Logic ---
      const changes: string[] = [];
      const norm = (t?: string) => t?.replace(/\s+/g, '').toUpperCase() || '';

      if (norm(todaySchedule.prayers.fajr.iqamah) !== norm(tomorrowSchedule.prayers.fajr.iqamah)) changes.push(`Fajr`);
      if (norm(todaySchedule.prayers.dhuhr.iqamah) !== norm(tomorrowSchedule.prayers.dhuhr.iqamah)) changes.push(`Dhuhr`);
      if (norm(todaySchedule.prayers.asr.iqamah) !== norm(tomorrowSchedule.prayers.asr.iqamah)) changes.push(`Asr`);
      if (norm(todaySchedule.prayers.maghrib.iqamah) !== norm(tomorrowSchedule.prayers.maghrib.iqamah)) changes.push(`Maghrib`);
      if (norm(todaySchedule.prayers.isha.iqamah) !== norm(tomorrowSchedule.prayers.isha.iqamah)) changes.push(`Isha`);

      if (tomorrow.getDay() === 5) { // 5 = Friday
         if (norm(todaySchedule.jumuah.iqamah) !== norm(tomorrowSchedule.jumuah.iqamah)) {
            changes.push(`Jumu'ah`);
         }
      }

      if (changes.length > 0) {
        setSystemAlert(`⚠️ NOTICE: Iqamah changes tomorrow for ${changes.join(', ')}`);
      } else {
        setSystemAlert("");
      }
    };

    updateTimes();
    const interval = setInterval(updateTimes, 60000); // Check every minute
    return () => clearInterval(interval);

  }, [excelSchedule, manualOverrides]);

  // Combine system alerts with manually added announcement items
  const effectiveAnnouncement: Announcement = React.useMemo(() => {
    let items = [...announcement.items];
    if (systemAlert) {
      const alertItem: AnnouncementItem = {
        id: 'sys-alert',
        text: systemAlert,
        color: '#F87171', // Red
        animation: 'pulse'
      };
      items = [alertItem, ...items];
    }
    return { ...announcement, items };
  }, [announcement, systemAlert]);

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
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden font-sans antialiased">
      {/* 
        VIRTUAL VIEWPORT CONTAINER 
        This div is strictly fixed to 1920x1080 px.
        We use CSS transform to scale it to fit the actual browser window.
        This guarantees the layout looks exactly the same on a 720p TV or a 4K TV.
      */}
      <div 
        style={{ 
          width: '1920px', 
          height: '1080px',
          transform: `scale(${scale})`,
          // transformOrigin: 'center center' is default for flex centering, but explicit helps
        }}
        className="relative shadow-2xl overflow-hidden bg-mosque-navy shrink-0"
      >
        
        <BackgroundManager theme={currentTheme} />

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
              <ScreenPrayerTimes 
                prayers={displayedPrayerTimes} 
                jumuah={displayedJumuahTimes} 
                announcement={effectiveAnnouncement} 
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls - Kept inside scaled view to maintain relative position */}
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
          currentTheme={currentTheme}
          setCurrentTheme={setCurrentTheme}
        />
        
      </div>
    </div>
  );
};

export default App;