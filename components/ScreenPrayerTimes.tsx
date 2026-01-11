import React, { useEffect, useState, useMemo } from 'react';
import { DailyPrayers, Announcement, SlideConfig, AnnouncementSlideConfig, ScheduleSlideConfig, ExcelDaySchedule, ManualOverride } from '../types';
import { Sunrise, Sunset } from 'lucide-react';
import { MOSQUE_NAME } from '../constants';
import { AnimatePresence, motion } from 'framer-motion';
import { getScheduleForDate } from '../utils/scheduler';

interface ScreenPrayerTimesProps {
  prayers: DailyPrayers;
  jumuah: { start: string; iqamah: string };
  announcement: Announcement;
  slidesConfig: SlideConfig[];
  excelSchedule: Record<string, ExcelDaySchedule>;
  manualOverrides: ManualOverride[];
  maghribOffset: number;
  tickerBg: 'white' | 'navy';
}

const GeometricCorner = ({ className, rotate }: { className?: string, rotate?: number }) => (
  <div className={`absolute w-24 h-24 pointer-events-none ${className}`} style={{ zIndex: 0 }}>
    <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ transform: `rotate(${rotate || 0}deg)` }} className="overflow-visible">
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
           <stop offset="0%" stopColor="#D4AF37" />
           <stop offset="50%" stopColor="#FCD34D" />
           <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <filter id="cornerShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="2" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.4" />
        </filter>
      </defs>
      
      {/* 1. Main Outer Line */}
      <path 
        d="M 2,100 L 2,2 L 100,2" 
        fill="none" 
        stroke="url(#goldGradient)" 
        strokeWidth="3" 
        strokeLinecap="butt"
        filter="url(#cornerShadow)"
      />
      
      {/* 2. Inner Parallel Line (Thinner & Transparent) */}
      <path 
        d="M 12,100 L 12,12 L 100,12" 
        fill="none" 
        stroke="url(#goldGradient)" 
        strokeWidth="1.5" 
        filter="url(#cornerShadow)"
      />

      {/* 3. Corner Accent Block (Anchor) */}
      <rect x="0" y="0" width="14" height="14" fill="url(#goldGradient)" filter="url(#cornerShadow)" />
      
      {/* 4. Decorative Dot */}
      <circle cx="20" cy="20" r="3" fill="url(#goldGradient)" filter="url(#cornerShadow)" />

    </svg>
  </div>
);

const ElegantFrame = () => {
  return (
    <div className="absolute inset-0 z-50 pointer-events-none p-4">
       {/* Subtle full border connecting corners visually */}
       <div className="absolute inset-4 border border-mosque-gold/20 z-0"></div>
       
       <GeometricCorner className="top-0 left-0" rotate={0} />
       <GeometricCorner className="top-0 right-0" rotate={90} />
       <GeometricCorner className="bottom-0 right-0" rotate={180} />
       <GeometricCorner className="bottom-0 left-0" rotate={270} />
    </div>
  );
};

const TimeDisplay = ({ time, className = "", smallSuffix = true }: { time: string, className?: string, smallSuffix?: boolean }) => {
  if (!time) return null;
  // Match "5:27" and "AM" separately
  const match = time.match(/(\d+:\d+)\s?(AM|PM)/i);
  if (!match) return <span className={className}>{time}</span>;
  
  return (
    <span className={`font-serif flex items-baseline justify-center ${className}`}>
      {match[1]}
      {smallSuffix && <span className="text-[0.5em] ml-1 font-sans font-bold uppercase tracking-wide opacity-80">{match[2]}</span>}
      {!smallSuffix && <span className="ml-2">{match[2]}</span>}
    </span>
  );
};

/* --- SLIDES COMPONENT DEFINITIONS --- */

const ClockSlide = ({ hours, minutes, seconds, displayAmPm, nextPrayerName, timeUntilIqamah, hijriDate, formatDate, currentTime, prayers }: any) => {
    return (
        <div className="w-full h-full flex flex-col relative z-10 p-6 animate-in fade-in duration-700">
            {/* 1. Clock Section - Top */}
            <div className="flex-[4] flex flex-col items-center justify-center border-b border-mosque-navy/10 relative overflow-hidden">
                <div className="flex items-baseline justify-center w-full px-2 mt-4 whitespace-nowrap">
                    <span className="text-[11.5rem] leading-[0.75] font-serif tracking-tighter text-mosque-navy font-bold drop-shadow-sm tabular-nums">
                        {hours}:{minutes}:{seconds}
                    </span>
                    <span className="text-8xl ml-6 font-sans font-bold uppercase tracking-widest text-mosque-gold">
                        {displayAmPm}
                    </span>
                </div>
                
                <div className="mt-8 flex flex-col items-center w-full">
                    <span className="text-4xl uppercase tracking-[0.3em] font-sans font-bold text-mosque-navy/60 mb-0">
                    {nextPrayerName} IN
                    </span>
                    <span className="font-serif text-[9.5rem] font-bold text-mosque-navy tabular-nums tracking-tight leading-none">
                    {timeUntilIqamah}
                    </span>
                </div>
            </div>

            {/* 2. Date Section - Middle */}
            <div className="flex-[1] flex flex-col items-center justify-center border-b border-mosque-navy/10 py-1 space-y-2 shrink-0 bg-white/30 backdrop-blur-sm rounded-lg my-2 shadow-inner">
                <div className="text-5xl font-sans uppercase tracking-[0.15em] font-bold text-mosque-gold drop-shadow-sm">{hijriDate}</div>
                <div className="text-4xl font-sans uppercase tracking-[0.15em] font-semibold text-mosque-navy/80">{formatDate(currentTime)}</div>
            </div>

            {/* 3. Footer: Sunrise / Sunset - Bottom */}
            <div className="flex-[3] shrink-0 flex flex-col justify-center relative">
                <div className="flex items-center justify-around h-full">
                    
                    {/* Sunrise Item */}
                    <div className="flex flex-col items-center justify-center">
                    <Sunrise className="w-24 h-24 text-mosque-gold mb-4 drop-shadow-md" strokeWidth={1.5} />
                    <span className="text-3xl uppercase tracking-[0.3em] font-bold text-mosque-navy/50 mb-1">Sunrise</span>
                    <span className="text-8xl font-serif font-bold text-mosque-navy tabular-nums tracking-tight">{prayers.sunrise.replace(/AM|PM/, '').trim()}</span>
                    <span className="text-5xl font-bold text-mosque-gold tracking-widest uppercase mt-2">AM</span>
                    </div>
                    
                    {/* Vertical Divider */}
                    <div className="h-40 w-px bg-gradient-to-b from-transparent via-mosque-navy/20 to-transparent"></div>

                    {/* Sunset Item */}
                    <div className="flex flex-col items-center justify-center">
                    <Sunset className="w-24 h-24 text-mosque-gold mb-4 drop-shadow-md" strokeWidth={1.5} />
                    <span className="text-3xl uppercase tracking-[0.3em] font-bold text-mosque-navy/50 mb-1">Sunset</span>
                    <span className="text-8xl font-serif font-bold text-mosque-navy tabular-nums tracking-tight">{prayers.sunset.replace(/AM|PM/, '').trim()}</span>
                    <span className="text-5xl font-bold text-mosque-gold tracking-widest uppercase mt-2">PM</span>
                    </div>

                </div>
            </div>
        </div>
    );
}

const AnnouncementSlide = ({ config }: { config: AnnouncementSlideConfig }) => {
    const { styles, content } = config;
    
    // Gradient animation class
    const animationClass = styles.textAnimation === 'gradient-flow' 
       ? 'bg-gradient-to-r from-mosque-gold via-white to-mosque-gold bg-300% animate-gradient-text text-transparent bg-clip-text' 
       : styles.textAnimation === 'pulse' 
       ? 'animate-pulse' 
       : 'text-white';
    
    const fontSizeClass = styles.fontSize === 'huge' ? 'text-7xl leading-snug' 
                      : styles.fontSize === 'large' ? 'text-6xl leading-snug' 
                      : 'text-4xl leading-relaxed';

    return (
        <div 
           className="w-full h-full flex items-center justify-center p-12 text-center relative overflow-hidden"
           style={{ backgroundColor: styles.backgroundColor }}
        >
            <style>{`
               @keyframes gradient-text {
                 0% { background-position: 0% 50%; }
                 50% { background-position: 100% 50%; }
                 100% { background-position: 0% 50%; }
               }
               .animate-gradient-text {
                 animation: gradient-text 3s ease infinite;
               }
               .bg-300% { background-size: 300% 300%; }
            `}</style>
            
            {/* Background Texture if solid color is dark */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')]"></div>
            
            <div className={`font-serif font-bold ${fontSizeClass} whitespace-pre-line drop-shadow-md z-10`} style={{ color: styles.textAnimation === 'gradient-flow' ? undefined : styles.textColor }}>
               <span className={animationClass}>{content}</span>
            </div>
        </div>
    );
};

const ScheduleSlide = ({ config, excelSchedule, manualOverrides, maghribOffset }: { config: ScheduleSlideConfig, excelSchedule: any, manualOverrides: any, maghribOffset: number }) => {
    
    const scheduleData = useMemo(() => {
        const days = [];
        const start = new Date();
        // Start from Tomorrow (exclude today)
        start.setDate(start.getDate() + 1);
        
        // Show next 7 days statically
        const daysToDisplay = 7; 
        
        for(let i = 0; i < daysToDisplay; i++) {
           const d = new Date(start);
           d.setDate(start.getDate() + i);
           const dateKey = d.toISOString().split('T')[0];
           const { prayers } = getScheduleForDate(dateKey, excelSchedule, manualOverrides, maghribOffset);
           
           days.push({
              dateDisplay: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
              prayers
           });
        }
        return days;
    }, [config.daysToShow, excelSchedule, manualOverrides, maghribOffset]);

    // Simple Time formatter just for this table
    const fmt = (t: string) => t.replace(/(AM|PM)/, '').trim();

    return (
       <div className="w-full h-full bg-mosque-navy text-white flex flex-col overflow-hidden relative">
          {/* Header */}
          <div className="h-24 bg-mosque-gold/10 border-b border-mosque-gold/30 flex items-center shrink-0 z-20 shadow-lg">
             <div className="w-[16%] text-center text-mosque-gold font-bold uppercase tracking-widest text-xl">Date</div>
             {['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(p => (
                 <div key={p} className="flex-1 text-center text-white/80 font-bold uppercase tracking-wide text-base lg:text-lg">{p}</div>
             ))}
          </div>

          {/* Static Content - Flex Layout to fill space */}
          <div className="flex-1 flex flex-col">
              {scheduleData.map((day, idx) => (
                  <div key={`${day.dateDisplay}-${idx}`} className="flex-1 border-b border-white/5 flex items-center hover:bg-white/5 transition-colors">
                      {/* Date Column */}
                      <div className="w-[16%] flex flex-col items-center justify-center border-r border-white/5 h-full bg-black/20">
                         <span className="text-3xl font-bold text-mosque-gold whitespace-nowrap">{day.dateDisplay}</span>
                         <span className="text-lg font-bold uppercase tracking-widest text-white/50 mt-1">{day.dayName}</span>
                      </div>
                      
                      {[day.prayers.fajr, { start: day.prayers.sunrise, isSunrise: true }, day.prayers.dhuhr, day.prayers.asr, day.prayers.maghrib, day.prayers.isha].map((p: any, i) => (
                         <div key={i} className="flex-1 flex flex-col items-center justify-center h-full border-r border-white/5 last:border-0 relative">
                             {p.isSunrise ? (
                                // Sunrise: Show start time large
                                <span className="text-4xl font-bold font-serif text-mosque-gold tracking-tight">{fmt(p.start)}</span>
                             ) : (
                                <>
                                    {/* Start Time */}
                                    <span className="text-xl text-white/60 mb-1 font-sans font-medium tracking-tight">{fmt(p.start)}</span>
                                    {/* Iqamah Time */}
                                    {p.iqamah && (
                                        <span className="text-4xl font-bold font-serif tracking-tight leading-none text-white">{fmt(p.iqamah)}</span>
                                    )}
                                </>
                             )}
                         </div>
                      ))}
                  </div>
              ))}
          </div>
       </div>
    );
};

/* --- MAIN COMPONENT --- */

export const ScreenPrayerTimes: React.FC<ScreenPrayerTimesProps> = ({ 
    prayers, jumuah, announcement, 
    slidesConfig, 
    excelSchedule, manualOverrides, maghribOffset,
    tickerBg 
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeUntilIqamah, setTimeUntilIqamah] = useState<string>("");
  const [nextPrayerName, setNextPrayerName] = useState<string>("NEXT PRAYER");
  const [hijriDate, setHijriDate] = useState<string>("");
  const [isIqamahFreeze, setIsIqamahFreeze] = useState(false);
  
  // Slideshow Logic: If more than one slide is active, we cycle.
  const activeSlides = useMemo(() => slidesConfig.filter(s => s.enabled), [slidesConfig]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Determine if we should be cycling slides
  const isSlideshowActive = activeSlides.length > 1;

  useEffect(() => {
    // If freeze mode is active or only one slide (or zero), do not cycle
    if (!isSlideshowActive || isIqamahFreeze) {
        return; 
    }

    // Safety check: if index out of bounds (e.g. slide removed), reset to 0
    if (currentSlideIndex >= activeSlides.length) {
        setCurrentSlideIndex(0);
        return;
    }

    const activeSlide = activeSlides[currentSlideIndex];
    const duration = (activeSlide?.duration || 10) * 1000;
    
    const timer = setTimeout(() => {
        setCurrentSlideIndex((prev) => (prev + 1) % activeSlides.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [currentSlideIndex, isSlideshowActive, activeSlides, isIqamahFreeze]);


  // Calculate duration based on text length for consistent speed
  const textLength = announcement.items.reduce((acc, item) => acc + item.text.length, 0);
  const marqueeDuration = Math.max(20, 20 + (textLength / 10));

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      calculateNextIqamah(now);
      
      try {
        const hijri = new Intl.DateTimeFormat('en-US-u-ca-islamic', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }).format(now);
        setHijriDate(hijri.replace(' AH', '').toUpperCase());
      } catch (e) {
        setHijriDate("HIJRI DATE UNAVAILABLE");
      }

    }, 1000);
    return () => clearInterval(timer);
  }, [prayers]);

  const parseTime = (timeStr: string, now: Date): Date | null => {
    if (!timeStr) return null;
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    const date = new Date(now);
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const calculateNextIqamah = (now: Date) => {
    const prayersList = [
      { name: 'Fajr', time: parseTime(prayers.fajr.iqamah || '', now) },
      { name: 'Dhuhr', time: parseTime(prayers.dhuhr.iqamah || '', now) },
      { name: 'Asr', time: parseTime(prayers.asr.iqamah || '', now) },
      { name: 'Maghrib', time: parseTime(prayers.maghrib.iqamah || '', now) },
      { name: 'Isha', time: parseTime(prayers.isha.iqamah || '', now) },
    ];

    let nextPrayer = prayersList.find(p => p.time && p.time > now);
    
    // Check if we are in the 5-minute pre-Iqamah window
    let freeze = false;
    if (nextPrayer && nextPrayer.time) {
        const diffMs = nextPrayer.time.getTime() - now.getTime();
        const diffMinutes = diffMs / (1000 * 60);
        // Freeze if within 5 minutes of Iqamah
        if (diffMinutes <= 5 && diffMinutes > 0) {
            freeze = true;
        }
    }
    setIsIqamahFreeze(freeze);

    if (!nextPrayer) {
       setNextPrayerName("FAJR"); 
       setTimeUntilIqamah("--:--:--");
       return;
    }

    if (nextPrayer && nextPrayer.time) {
      setNextPrayerName(nextPrayer.name.toUpperCase());
      const diffMs = nextPrayer.time.getTime() - now.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      setTimeUntilIqamah(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
  };

  const formatTimeParts = (date: Date) => {
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
    const parts = timeStr.split(' ');
    const timeComponents = parts[0].split(':');
    return { hours: timeComponents[0], minutes: timeComponents[1], seconds: timeComponents[2], ampm: parts[1] };
  };

  const rows = [
    { name: 'Fajr', start: prayers.fajr.start, iqamah: prayers.fajr.iqamah },
    { name: 'Dhuhr', start: prayers.dhuhr.start, iqamah: prayers.dhuhr.iqamah },
    { name: 'Asr', start: prayers.asr.start, iqamah: prayers.asr.iqamah },
    { name: 'Maghrib', start: prayers.maghrib.start, iqamah: prayers.maghrib.iqamah },
    { name: 'Isha', start: prayers.isha.start, iqamah: prayers.isha.iqamah },
    { name: 'Jumu\'ah', start: jumuah.start, iqamah: jumuah.iqamah, isJumuah: true },
  ];

  const getActiveRowIndex = () => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const parseToMinutes = (timeStr: string) => {
       if (!timeStr) return -1;
       const [time, modifier] = timeStr.split(' ');
       let [hours, minutes] = time.split(':').map(Number);
       if (modifier === 'PM' && hours < 12) hours += 12;
       if (modifier === 'AM' && hours === 12) hours = 0;
       return hours * 60 + minutes;
    };
    return rows.findIndex((row, idx) => !row.isJumuah && parseToMinutes(row.iqamah || '') > currentMinutes);
  };
  
  const activeIndex = getActiveRowIndex();
  const { hours, minutes, seconds, ampm: displayAmPm } = formatTimeParts(currentTime);

  // --- Determine Active Content for Right Panel ---
  
  let RightPanelContent = <ClockSlide 
    hours={hours} minutes={minutes} seconds={seconds} displayAmPm={displayAmPm}
    nextPrayerName={nextPrayerName} timeUntilIqamah={timeUntilIqamah}
    hijriDate={hijriDate} formatDate={formatDate} currentTime={currentTime} prayers={prayers}
  />;

  // Use slideshow content ONLY if slideshow active, slides exist, AND we are not in the "Iqamah Freeze" window
  if (isSlideshowActive && activeSlides.length > 0 && !isIqamahFreeze) {
      const activeSlide = activeSlides[currentSlideIndex];
      // Safety check: activeSlide might be undefined if currentSlideIndex is stale/invalid
      if (activeSlide) {
        if (activeSlide.type === 'ANNOUNCEMENT') {
            RightPanelContent = <AnnouncementSlide config={activeSlide as AnnouncementSlideConfig} />;
        } else if (activeSlide.type === 'SCHEDULE') {
            RightPanelContent = <ScheduleSlide config={activeSlide as ScheduleSlideConfig} excelSchedule={excelSchedule} manualOverrides={manualOverrides} maghribOffset={maghribOffset} />;
        }
      }
      // ClockSlide is the default fallback above or if activeSlide is invalid
  }

  // Ticker style based on tickerBg prop
  const tickerContainerClass = tickerBg === 'navy' 
      ? 'bg-mosque-navy border-t-4 border-mosque-gold' 
      : 'bg-white border-t-8 border-mosque-gold';
  
  const tickerTextClass = tickerBg === 'navy' ? 'text-white' : 'text-mosque-navy';

  return (
    <div className="w-full h-full flex flex-col font-serif text-white overflow-hidden">
      
      {/* === TOP HEADER: MOSQUE NAME === */}
      <div className="h-[10%] bg-mosque-navy/95 border-b-4 border-mosque-gold/50 flex items-center justify-center relative z-20 shadow-2xl shrink-0">
          <div className="absolute inset-0 bg-black/20"></div>
          <h1 className="relative z-10 text-6xl font-serif text-mosque-gold font-bold uppercase tracking-[0.2em] drop-shadow-lg">
            {MOSQUE_NAME}
          </h1>
      </div>

      {/* === MAIN CONTENT (SPLIT VIEW) === */}
      <div className="flex-1 flex overflow-hidden h-full">
          
          {/* === LEFT COLUMN: PRAYER TABLE (60%) === */}
          <div className="w-[60%] flex flex-col border-r-4 border-black/30 relative z-10 shadow-xl h-full">
            {/* Header Row */}
            <div className="h-20 flex items-end pb-2 bg-mosque-navy/40 border-b border-white/10 shrink-0">
              <div className="w-[34%] text-center border-white/5">
                  <span className="text-3xl font-sans font-bold tracking-[0.2em] uppercase text-white/60">Salah</span>
              </div>
              <div className="w-[33%] text-center border-l border-white/5">
                  <span className="text-3xl font-sans font-bold tracking-[0.2em] uppercase text-white/60">Starts</span>
              </div>
              <div className="w-[33%] text-center border-l border-white/5">
                  <span className="text-3xl font-sans font-bold tracking-[0.2em] uppercase text-white/60">Iqamah</span>
              </div>
            </div>

            {/* Prayer Rows */}
            <div className="flex-1 flex flex-col bg-mosque-navy/20 h-full">
              {rows.map((row, idx) => {
                const isActive = idx === activeIndex;
                const isJumuah = !!row.isJumuah;
                const bgClass = isActive ? 'bg-[#E5E5E5] scale-[1.02] z-10 shadow-y-lg' : 'bg-transparent';
                const borderClass = isActive ? 'border-mosque-navy/10' : 'border-white/10';
                
                let nameColor = isActive ? 'text-mosque-navy' : 'text-white opacity-90';
                let timeColor = isActive ? 'text-mosque-navy' : 'text-white';
                
                // Jumuah Styling Logic - Gold Gradient
                if (isJumuah) {
                    const goldGradient = 'bg-[linear-gradient(to_right,#D4AF37,#FFFFFF,#D4AF37,#FFFFFF,#D4AF37)]';
                    nameColor = `${goldGradient} bg-[length:200%_auto] animate-text-shine text-transparent bg-clip-text`;
                    timeColor = `${goldGradient} bg-[length:200%_auto] animate-text-shine text-transparent bg-clip-text`;
                }

                const iqamahBgClass = isActive ? '' : 'bg-black/5';
                const nameSize = isActive ? 'text-6xl' : 'text-5xl';
                const timeSize = isActive ? 'text-8xl font-black' : 'text-7xl font-bold';

                return (
                  <div key={idx} className={`flex-1 flex items-center ${bgClass} border-b ${borderClass} transition-all duration-700 ease-out relative`}>
                    <div className="w-[34%] flex items-center justify-center">
                        <span className={`block font-bold uppercase tracking-wider leading-none transition-all duration-500 ${nameSize} ${nameColor}`}>
                          {row.name}
                        </span>
                    </div>
                    <div className={`w-[33%] h-full flex items-center justify-center border-l ${borderClass}`}>
                        <TimeDisplay time={row.start} className={`transition-all duration-500 ${timeSize} ${timeColor}`} />
                    </div>
                    <div className={`w-[33%] h-full flex items-center justify-center border-l ${borderClass} ${iqamahBgClass}`}>
                        <TimeDisplay time={row.iqamah || ''} className={`transition-all duration-500 ${timeSize} ${timeColor}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* === RIGHT COLUMN: SLIDESHOW CONTAINER (40%) === */}
          <div className="w-[40%] bg-[#E5E5E5] text-mosque-navy flex flex-col z-10 shadow-2xl h-full relative overflow-hidden">
              {/* Frame now moved to top level of this container with z-50 to ensure it overlays everything including colored announcements */}
              <ElegantFrame />
              <div className="w-full h-full relative z-10">
                 <AnimatePresence mode="wait">
                    <motion.div
                       key={(!isSlideshowActive || isIqamahFreeze) ? 'static-clock' : activeSlides[currentSlideIndex]?.id}
                       initial={{ opacity: 0, x: 20 }}
                       animate={{ opacity: 1, x: 0 }}
                       exit={{ opacity: 0, x: -20 }}
                       transition={{ duration: 0.5 }}
                       className="w-full h-full"
                    >
                       {RightPanelContent}
                    </motion.div>
                 </AnimatePresence>
              </div>
          </div>
      </div>

      {/* === BOTTOM FOOTER: ANNOUNCEMENT TICKER === */}
      <div className={`h-[10%] ${tickerContainerClass} relative z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] shrink-0 overflow-hidden transition-colors duration-500`}>
          <div className="absolute left-0 top-0 bottom-0 bg-mosque-gold text-mosque-navy px-8 flex items-center justify-center z-20 font-black uppercase tracking-[0.15em] text-4xl shadow-[10px_0_20px_rgba(0,0,0,0.2)] min-w-[380px]">
             {announcement.title}
          </div>
          <div className="absolute inset-0 z-10 flex items-center overflow-hidden">
            <div 
                className={`whitespace-nowrap animate-marquee flex items-center ${tickerTextClass} text-5xl font-semibold tracking-wide w-full pl-[100%]`}
                style={{ animationDuration: `${marqueeDuration}s`, willChange: 'transform' }}
            >
               {announcement.items.map((item) => (
                   <React.Fragment key={item.id}>
                     <span style={{ color: item.color }} className="mx-8">•</span>
                     <span style={{ color: item.color }} className={item.animation === 'pulse' ? 'animate-text-pulse' : item.animation === 'blink' ? 'animate-text-blink' : ''}>
                        {item.text}
                     </span>
                   </React.Fragment>
               ))}
            </div>
          </div>
      </div>

      <style>{`
        @keyframes marquee { 0% { transform: translate3d(0, 0, 0); } 100% { transform: translate3d(-100%, 0, 0); } }
        @keyframes textPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(0.98); } }
        @keyframes textBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes text-shine {
            0% { background-position: 0% 50%; }
            100% { background-position: 100% 50%; }
        }
        .animate-marquee { animation-name: marquee; animation-timing-function: linear; animation-iteration-count: infinite; transform: translateZ(0); }
        .animate-text-pulse { animation: textPulse 2s infinite ease-in-out; display: inline-block; }
        .animate-text-blink { animation: textBlink 1s infinite steps(1); display: inline-block; }
        .animate-text-shine {
            animation: text-shine 3s linear infinite;
        }
      `}</style>
    </div>
  );
};
