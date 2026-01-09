import React, { useEffect, useState } from 'react';
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
      {smallSuffix && <span className="text-[0.4em] ml-1 font-sans font-bold uppercase tracking-wide opacity-80">{match[2]}</span>}
      {!smallSuffix && <span className="ml-2">{match[2]}</span>}
    </span>
  );
};

export const ScreenPrayerTimes: React.FC<ScreenPrayerTimesProps> = ({ prayers, jumuah, announcement }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeUntilIqamah, setTimeUntilIqamah] = useState<string>("");
  const [nextPrayerName, setNextPrayerName] = useState<string>("NEXT PRAYER");
  const [hijriDate, setHijriDate] = useState<string>("");

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
       // Just to prevent empty state, we can point to Fajr or keep standard text
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
    // Returns HH:MM:SS and AM/PM parts
    const timeStr = date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true 
    });
    // timeStr format: "10:24:45 AM"
    const parts = timeStr.split(' ');
    return { time: parts[0], ampm: parts[1] };
  };

  const rows = [
    { name: 'Fajr', start: prayers.fajr.start, iqamah: prayers.fajr.iqamah },
    { name: 'Dhuhr', start: prayers.dhuhr.start, iqamah: prayers.dhuhr.iqamah },
    { name: 'Asr', start: prayers.asr.start, iqamah: prayers.asr.iqamah },
    { name: 'Maghrib', start: prayers.maghrib.start, iqamah: prayers.maghrib.iqamah },
    { name: 'Isha', start: prayers.isha.start, iqamah: prayers.isha.iqamah },
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
    
    return rows.findIndex(row => parseToMinutes(row.iqamah || '') > currentMinutes);
  };
  
  const activeIndex = getActiveRowIndex();
  const { time: displayTime, ampm: displayAmPm } = formatTimeParts(currentTime);

  return (
    <div className="w-full h-full flex flex-col font-serif text-white overflow-hidden">
      
      {/* === TOP HEADER: MOSQUE NAME === */}
      <div className="h-[10%] bg-mosque-navy/95 border-b-4 border-mosque-gold/50 flex items-center justify-center relative z-20 shadow-2xl shrink-0">
          <div className="absolute inset-0 bg-black/20"></div>
          <h1 className="relative z-10 text-4xl xl:text-5xl font-serif text-mosque-gold font-bold uppercase tracking-[0.2em] drop-shadow-lg glow">
            {MOSQUE_NAME}
          </h1>
      </div>

      {/* === MAIN CONTENT (SPLIT VIEW) === */}
      <div className="flex-1 flex overflow-hidden h-full">
          
          {/* === LEFT COLUMN: PRAYER TABLE (60%) === */}
          <div className="w-[60%] flex flex-col border-r-4 border-black/30 relative z-10 shadow-xl h-full">
            {/* Header Row */}
            <div className="h-20 flex items-end pb-4 bg-mosque-navy/40 border-b border-white/10 shrink-0">
              <div className="w-[34%] text-center border-white/5">
                  <span className="text-2xl xl:text-3xl font-sans font-bold tracking-[0.2em] uppercase text-white/60">Salah</span>
              </div>
              <div className="w-[33%] text-center border-l border-white/5">
                  <span className="text-2xl xl:text-3xl font-sans font-bold tracking-[0.2em] uppercase text-white/60">Starts</span>
              </div>
              <div className="w-[33%] text-center border-l border-white/5">
                  <span className="text-2xl xl:text-3xl font-sans font-bold tracking-[0.2em] uppercase text-white/60">Iqamah</span>
              </div>
            </div>

            {/* Prayer Rows */}
            <div className="flex-1 flex flex-col bg-mosque-navy/20 h-full">
              {rows.map((row, idx) => {
                const isActive = idx === activeIndex;
                const bgClass = isActive ? 'bg-[#E5E5E5] scale-[1.02] z-10 shadow-y-lg' : 'bg-transparent';
                const textClass = isActive ? 'text-mosque-navy' : 'text-white';
                const borderClass = isActive ? 'border-mosque-navy/10' : 'border-white/10';
                
                return (
                  <div key={idx} className={`flex-1 flex items-center ${bgClass} ${textClass} border-b ${borderClass} transition-all duration-500 relative`}>
                    {/* Prayer Name */}
                    <div className="w-[34%] flex items-center justify-center">
                        <span className={`block font-bold uppercase tracking-wider leading-none ${isActive ? 'text-5xl xl:text-6xl' : 'text-4xl xl:text-5xl opacity-90'}`}>
                          {row.name}
                        </span>
                    </div>
                    
                    {/* Start Time */}
                    <div className={`w-[33%] h-full flex items-center justify-center border-l ${borderClass}`}>
                        <TimeDisplay time={row.start} className={`${isActive ? 'text-7xl xl:text-8xl font-black' : 'text-6xl xl:text-7xl font-bold'}`} />
                    </div>
                    
                    {/* Iqamah Time */}
                    <div className={`w-[33%] h-full flex items-center justify-center border-l ${borderClass} bg-black/5`}>
                        <TimeDisplay time={row.iqamah || ''} className={`${isActive ? 'text-7xl xl:text-8xl font-black' : 'text-6xl xl:text-7xl font-bold'}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* === RIGHT COLUMN: INFO PANEL (40%) === */}
          <div className="w-[40%] bg-[#F0F0F0] text-mosque-navy flex flex-col z-10 shadow-2xl h-full">
              
              {/* Date Section */}
              <div className="flex-[1.5] flex flex-col items-center justify-center border-b border-gray-300 py-1 space-y-1 bg-white shrink-0">
                  <div className="text-2xl xl:text-3xl font-sans uppercase tracking-[0.15em] font-bold text-mosque-gold">{hijriDate}</div>
                  <div className="text-xl xl:text-2xl font-sans uppercase tracking-[0.15em] font-semibold text-mosque-navy/70">{formatDate(currentTime)}</div>
              </div>

              {/* Clock Section - Fitted for HH:MM:SS */}
              <div className="flex-[4] flex flex-col items-center justify-center border-b border-gray-300 bg-[#E5E5E5] relative overflow-hidden">
                  <div className="flex items-baseline justify-center w-full px-2">
                     <span className="text-[5.5rem] xl:text-[7rem] leading-none font-serif tracking-tighter text-mosque-navy font-medium drop-shadow-sm tabular-nums">
                        {displayTime}
                     </span>
                     <span className="text-3xl xl:text-5xl ml-3 font-sans font-bold tracking-wide text-mosque-gold">
                        {displayAmPm}
                     </span>
                  </div>
                  
                  <div className="mt-6 flex flex-col items-center w-full">
                    <span className="text-base xl:text-lg uppercase tracking-[0.3em] font-sans font-bold text-mosque-navy/60 mb-1">
                      {nextPrayerName} IN
                    </span>
                    <span className="font-serif text-5xl xl:text-6xl font-bold text-mosque-navy tabular-nums tracking-tight">
                       {timeUntilIqamah}
                    </span>
                  </div>
              </div>

              {/* Jumu'ah Section */}
              <div className="flex-[2.5] flex flex-col items-center justify-center py-2 bg-white border-b border-gray-300 shrink-0">
                <div className="text-2xl xl:text-3xl uppercase tracking-[0.2em] font-sans font-bold text-mosque-navy/80 mb-4 flex items-center gap-6">
                  <span className="h-1 w-8 bg-mosque-gold"></span>
                  Jumu'ah
                  <span className="h-1 w-8 bg-mosque-gold"></span>
                </div>
                <div className="flex w-full px-4 justify-around">
                    <div className="text-center group">
                      <div className="text-6xl xl:text-7xl font-serif font-bold mb-1 flex items-baseline text-mosque-navy group-hover:scale-110 transition-transform">
                        {jumuah.start.split(' ')[0]}
                        <span className="text-xl font-sans font-bold ml-1 text-mosque-gold">{jumuah.start.split(' ')[1]}</span>
                      </div>
                      <div className="text-lg xl:text-xl uppercase tracking-[0.2em] font-sans font-bold text-gray-400">Khutbah</div>
                    </div>
                    <div className="w-px h-16 bg-gray-200"></div>
                    <div className="text-center group">
                      <div className="text-6xl xl:text-7xl font-serif font-bold mb-1 flex items-baseline text-mosque-navy group-hover:scale-110 transition-transform">
                        {jumuah.iqamah.split(' ')[0]}
                        <span className="text-xl font-sans font-bold ml-1 text-mosque-gold">{jumuah.iqamah.split(' ')[1]}</span>
                      </div>
                      <div className="text-lg xl:text-xl uppercase tracking-[0.2em] font-sans font-bold text-gray-400">Iqamah</div>
                    </div>
                </div>
              </div>

              {/* Footer: Sunrise / Sunset */}
              <div className="bg-mosque-navy text-white p-5 xl:p-6 shadow-inner shrink-0">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Sunrise className="w-10 h-10 xl:w-12 xl:h-12 text-mosque-gold" strokeWidth={2} />
                      <div className="flex flex-col">
                         <span className="text-lg xl:text-xl uppercase tracking-widest opacity-60 font-semibold">Sunrise</span>
                         <span className="text-4xl xl:text-5xl font-serif font-bold">{prayers.sunrise}</span>
                      </div>
                    </div>
                    
                    <div className="h-12 w-px bg-white/10"></div>

                    <div className="flex items-center gap-4 text-right">
                      <div className="flex flex-col">
                         <span className="text-lg xl:text-xl uppercase tracking-widest opacity-60 font-semibold">Sunset</span>
                         <span className="text-4xl xl:text-5xl font-serif font-bold">{prayers.sunset}</span>
                      </div>
                      <Sunset className="w-10 h-10 xl:w-12 xl:h-12 text-mosque-gold" strokeWidth={2} />
                    </div>
                </div>
              </div>
          </div>
      </div>

      {/* === BOTTOM FOOTER: ANNOUNCEMENT TICKER === */}
      <div className="h-[8%] xl:h-[10%] bg-white flex items-center overflow-hidden border-t-8 border-mosque-gold relative z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] shrink-0">
          <div className="bg-mosque-gold text-mosque-navy px-8 h-full flex items-center justify-center z-10 font-black uppercase tracking-[0.15em] text-xl xl:text-2xl shadow-2xl whitespace-nowrap min-w-[250px]">
             {announcement.title}
          </div>
          <div className="whitespace-nowrap animate-marquee flex items-center text-mosque-navy text-3xl xl:text-4xl font-semibold tracking-wide h-full w-full">
             <span className="mx-8 text-mosque-gold">•</span>
             {announcement.content} 
          </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        @keyframes glowPulse {
          0% { text-shadow: 0 0 10px rgba(212, 175, 55, 0.5), 0 0 20px rgba(212, 175, 55, 0.3); }
          50% { text-shadow: 0 0 20px rgba(212, 175, 55, 0.8), 0 0 40px rgba(212, 175, 55, 0.6), 0 0 60px rgba(212, 175, 55, 0.4); }
          100% { text-shadow: 0 0 10px rgba(212, 175, 55, 0.5), 0 0 20px rgba(212, 175, 55, 0.3); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
          padding-left: 100%;
        }
        .text-shadow {
          text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        }
        .glow {
          animation: glowPulse 3s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};