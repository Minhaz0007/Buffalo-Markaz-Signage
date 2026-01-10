import React, { useEffect, useState, useRef } from 'react';
import { DailyPrayers, Announcement } from '../types';
import { Sunrise, Sunset } from 'lucide-react';
import { MOSQUE_NAME } from '../constants';

interface ScreenPrayerTimesProps {
  prayers: DailyPrayers;
  jumuah: { start: string; iqamah: string };
  announcement: Announcement;
}

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

export const ScreenPrayerTimes: React.FC<ScreenPrayerTimesProps> = ({ prayers, jumuah, announcement }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeUntilIqamah, setTimeUntilIqamah] = useState<string>("");
  const [nextPrayerName, setNextPrayerName] = useState<string>("NEXT PRAYER");
  const [hijriDate, setHijriDate] = useState<string>("");
  
  // Calculate duration based on text length for consistent speed
  const textLength = announcement.items.reduce((acc, item) => acc + item.text.length, 0);
  // Base duration: 20s + 1s per 10 characters. Minimum 20s.
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
    
    // If no prayer left today, assuming Fajr tomorrow (simplified logic for display)
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
      
      setTimeUntilIqamah(
        `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
  };

  const formatTimeParts = (date: Date) => {
    const timeStr = date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true 
    });
    // timeStr format: "10:24:45 AM"
    const parts = timeStr.split(' ');
    // Split the time part to separate seconds for styling
    const timeComponents = parts[0].split(':');
    return { 
      hours: timeComponents[0],
      minutes: timeComponents[1],
      seconds: timeComponents[2],
      ampm: parts[1] 
    };
  };

  const rows = [
    { name: 'Fajr', start: prayers.fajr.start, iqamah: prayers.fajr.iqamah },
    { name: 'Dhuhr', start: prayers.dhuhr.start, iqamah: prayers.dhuhr.iqamah },
    { name: 'Asr', start: prayers.asr.start, iqamah: prayers.asr.iqamah },
    { name: 'Maghrib', start: prayers.maghrib.start, iqamah: prayers.maghrib.iqamah },
    { name: 'Isha', start: prayers.isha.start, iqamah: prayers.isha.iqamah },
    // Jumu'ah added as the 6th row
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
    
    // Find first prayer where Iqamah is in the future.
    return rows.findIndex((row, idx) => !row.isJumuah && parseToMinutes(row.iqamah || '') > currentMinutes);
  };
  
  const activeIndex = getActiveRowIndex();
  const { hours, minutes, seconds, ampm: displayAmPm } = formatTimeParts(currentTime);

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
                
                // Active State Styling
                const bgClass = isActive ? 'bg-[#E5E5E5] scale-[1.02] z-10 shadow-y-lg' : 'bg-transparent';
                const borderClass = isActive ? 'border-mosque-navy/10' : 'border-white/10';
                
                // Text Colors
                let nameColor = isActive ? 'text-mosque-navy' : 'text-white opacity-90';
                let timeColor = isActive ? 'text-mosque-navy' : 'text-white';

                // Override for Jumuah
                if (isJumuah) {
                    nameColor = 'text-mosque-gold';
                    timeColor = 'text-mosque-gold';
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

          {/* === RIGHT COLUMN: INFO PANEL (40%) === */}
          <div className="w-[40%] bg-[#E5E5E5] text-mosque-navy flex flex-col z-10 shadow-2xl h-full relative">
              
              {/* 1. Clock Section - Top */}
              <div className="flex-[3.5] flex flex-col items-center justify-center border-b border-mosque-navy/5 relative overflow-hidden pt-8 z-10">
                  <div className="flex items-baseline justify-center w-full px-2 mt-4 whitespace-nowrap">
                     <span className="text-[13rem] leading-[0.8] font-serif tracking-tighter text-mosque-navy font-bold drop-shadow-sm tabular-nums">
                        {hours}:{minutes}:{seconds}
                     </span>
                     <span className="text-8xl ml-4 font-sans font-bold tracking-wide text-mosque-gold">
                        {displayAmPm}
                     </span>
                  </div>
                  
                  <div className="mt-8 flex flex-col items-center w-full">
                    <span className="text-4xl uppercase tracking-[0.3em] font-sans font-bold text-mosque-navy/60 mb-2">
                      {nextPrayerName} IN
                    </span>
                    <span className="font-serif text-[7rem] font-bold text-mosque-navy tabular-nums tracking-tight leading-none">
                       {timeUntilIqamah}
                    </span>
                  </div>
              </div>

              {/* 2. Date Section - Middle */}
              <div className="flex-[1.5] flex flex-col items-center justify-center border-b border-mosque-navy/5 py-1 space-y-2 shrink-0 bg-white/50 backdrop-blur-sm z-10">
                  <div className="text-5xl font-sans uppercase tracking-[0.15em] font-bold text-mosque-gold drop-shadow-sm">{hijriDate}</div>
                  <div className="text-4xl font-sans uppercase tracking-[0.15em] font-semibold text-mosque-navy/80">{formatDate(currentTime)}</div>
              </div>

              {/* 3. Footer: Sunrise / Sunset - Bottom - Redesigned to Match Clock */}
              <div className="flex-[3] p-8 shrink-0 flex flex-col justify-center relative pb-12 z-10">
                <div className="flex items-center justify-around h-full px-8">
                    
                    {/* Sunrise Item */}
                    <div className="flex flex-col items-center justify-center">
                      <Sunrise className="w-24 h-24 text-mosque-gold mb-6 drop-shadow-md" strokeWidth={1.5} />
                      <span className="text-3xl uppercase tracking-[0.3em] font-bold text-mosque-navy/50 mb-2">Sunrise</span>
                      <span className="text-8xl font-serif font-bold text-mosque-navy tabular-nums tracking-tight">{prayers.sunrise.replace(/AM|PM/, '').trim()}</span>
                      <span className="text-xl font-bold text-mosque-gold tracking-widest uppercase mt-1">AM</span>
                    </div>
                    
                    {/* Vertical Divider */}
                    <div className="h-48 w-px bg-gradient-to-b from-transparent via-mosque-navy/20 to-transparent"></div>

                    {/* Sunset Item */}
                    <div className="flex flex-col items-center justify-center">
                      <Sunset className="w-24 h-24 text-mosque-gold mb-6 drop-shadow-md" strokeWidth={1.5} />
                      <span className="text-3xl uppercase tracking-[0.3em] font-bold text-mosque-navy/50 mb-2">Sunset</span>
                      <span className="text-8xl font-serif font-bold text-mosque-navy tabular-nums tracking-tight">{prayers.sunset.replace(/AM|PM/, '').trim()}</span>
                      <span className="text-xl font-bold text-mosque-gold tracking-widest uppercase mt-1">PM</span>
                    </div>

                </div>
              </div>
          </div>
      </div>

      {/* === BOTTOM FOOTER: ANNOUNCEMENT TICKER === */}
      {/* Container is relative to allow absolute positioning of the header */}
      <div className="h-[10%] bg-white border-t-8 border-mosque-gold relative z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] shrink-0 overflow-hidden">
          
          {/* Header: Absolute overlay on the left - Z-20 to sit on top of scrolling text */}
          <div className="absolute left-0 top-0 bottom-0 bg-mosque-gold text-mosque-navy px-8 flex items-center justify-center z-20 font-black uppercase tracking-[0.15em] text-4xl shadow-[10px_0_20px_rgba(0,0,0,0.2)] min-w-[380px]">
             {announcement.title}
          </div>
          
          {/* Ticker: Full width container, text scrolls from right to left, passing BEHIND the header */}
          <div className="absolute inset-0 z-10 flex items-center overflow-hidden">
            <div 
                className="whitespace-nowrap animate-marquee flex items-center text-mosque-navy text-5xl font-semibold tracking-wide w-full pl-[100%]"
                style={{ 
                  animationDuration: `${marqueeDuration}s`,
                  willChange: 'transform' // GPU Hint
                }}
            >
               {announcement.items.map((item, idx) => {
                 // Determine animation class
                 const animClass = item.animation === 'pulse' ? 'animate-text-pulse' : item.animation === 'blink' ? 'animate-text-blink' : '';
                 return (
                   <React.Fragment key={item.id}>
                     {/* Bullet Point separator inherits color from the item it precedes */}
                     <span style={{ color: item.color }} className="mx-8">•</span>
                     <span style={{ color: item.color }} className={animClass}>
                        {item.text}
                     </span>
                   </React.Fragment>
                 );
               })}
            </div>
          </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translate3d(0, 0, 0); } 
          100% { transform: translate3d(-100%, 0, 0); }
        }
        @keyframes textPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.98); }
        }
        @keyframes textBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .animate-marquee {
          animation-name: marquee;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          /* Force GPU acceleration */
          transform: translateZ(0);
        }
        .animate-text-pulse {
           animation: textPulse 2s infinite ease-in-out;
           display: inline-block;
        }
        .animate-text-blink {
           animation: textBlink 1s infinite steps(1);
           display: inline-block;
        }
      `}</style>
    </div>
  );
};
