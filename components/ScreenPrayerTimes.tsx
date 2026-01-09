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
      {smallSuffix && <span className="text-[0.35em] ml-2 font-sans font-bold uppercase tracking-wide opacity-80">{match[2]}</span>}
      {!smallSuffix && <span className="ml-2">{match[2]}</span>}
    </span>
  );
};

export const ScreenPrayerTimes: React.FC<ScreenPrayerTimesProps> = ({ prayers, jumuah, announcement }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeUntilIqamah, setTimeUntilIqamah] = useState<string>("");
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

    const nextPrayer = prayersList.find(p => p.time && p.time > now);

    if (nextPrayer && nextPrayer.time) {
      const diffMs = nextPrayer.time.getTime() - now.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const hrs = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      setTimeUntilIqamah(`${hrs > 0 ? hrs + ':' : ''}${mins < 10 ? '0' : ''}${mins}`);
    } else {
      setTimeUntilIqamah("--:--");
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(' ', '');
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

  return (
    <div className="w-full h-full flex flex-col font-serif text-white overflow-hidden">
      
      {/* === TOP HEADER: MOSQUE NAME === */}
      <div className="h-[12%] bg-mosque-navy/95 border-b-4 border-mosque-gold/50 flex items-center justify-center relative z-20 shadow-2xl">
          <div className="absolute inset-0 bg-black/20"></div>
          <h1 className="relative z-10 text-5xl xl:text-6xl font-serif text-mosque-gold font-bold uppercase tracking-[0.2em] drop-shadow-lg text-shadow">
            {MOSQUE_NAME}
          </h1>
      </div>

      {/* === MAIN CONTENT (SPLIT VIEW) === */}
      <div className="flex-1 flex overflow-hidden">
          
          {/* === LEFT COLUMN: PRAYER TABLE (62%) === */}
          <div className="w-[62%] flex flex-col border-r-4 border-black/30 relative z-10 shadow-xl">
            {/* Header Row */}
            <div className="h-16 flex items-end pb-2 bg-mosque-navy/40 border-b border-white/10">
              <div className="w-[28%]"></div> {/* Spacer for Name */}
              <div className="w-[36%] text-center border-l border-white/5">
                  <span className="text-lg font-sans font-bold tracking-[0.25em] uppercase text-white/60">Adhan</span>
              </div>
              <div className="w-[36%] text-center border-l border-white/5">
                  <span className="text-lg font-sans font-bold tracking-[0.25em] uppercase text-white/60">Iqamah</span>
              </div>
            </div>

            {/* Prayer Rows */}
            <div className="flex-1 flex flex-col bg-mosque-navy/20">
              {rows.map((row, idx) => {
                const isActive = idx === activeIndex;
                const bgClass = isActive ? 'bg-[#E5E5E5] scale-[1.02] z-10 shadow-y-lg' : 'bg-transparent';
                const textClass = isActive ? 'text-mosque-navy' : 'text-white';
                const borderClass = isActive ? 'border-mosque-navy/10' : 'border-white/10';
                
                return (
                  <div key={idx} className={`flex-1 flex items-center ${bgClass} ${textClass} border-b ${borderClass} transition-all duration-500 relative`}>
                    {/* Prayer Name */}
                    <div className="w-[28%] pl-12">
                        <span className={`block font-bold uppercase tracking-wider leading-none ${isActive ? 'text-5xl xl:text-6xl' : 'text-4xl xl:text-5xl opacity-90'}`}>
                          {row.name}
                        </span>
                    </div>
                    
                    {/* Start Time */}
                    <div className={`w-[36%] h-full flex items-center justify-center border-l ${borderClass}`}>
                        <TimeDisplay time={row.start} className={`${isActive ? 'text-6xl xl:text-7xl font-bold' : 'text-6xl xl:text-6xl font-light opacity-90'}`} />
                    </div>
                    
                    {/* Iqamah Time */}
                    <div className={`w-[36%] h-full flex items-center justify-center border-l ${borderClass} bg-black/5`}>
                        <TimeDisplay time={row.iqamah || ''} className={`${isActive ? 'text-7xl xl:text-8xl font-black' : 'text-7xl xl:text-7xl font-semibold'}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* === RIGHT COLUMN: INFO PANEL (38%) === */}
          <div className="w-[38%] bg-[#F0F0F0] text-mosque-navy flex flex-col z-10 shadow-2xl">
              
              {/* Date Section */}
              <div className="flex-[1.5] flex flex-col items-center justify-center border-b border-gray-300 py-2 space-y-2 bg-white">
                  <div className="text-2xl xl:text-3xl font-sans uppercase tracking-[0.15em] font-bold text-mosque-gold">{hijriDate}</div>
                  <div className="text-xl xl:text-2xl font-sans uppercase tracking-[0.15em] font-semibold text-mosque-navy/70">{formatDate(currentTime)}</div>
              </div>

              {/* Clock Section - Maximized */}
              <div className="flex-[4] flex flex-col items-center justify-center border-b border-gray-300 bg-[#E5E5E5] relative overflow-hidden">
                  <div className="text-[7rem] xl:text-[10rem] leading-none font-serif tracking-tighter text-mosque-navy font-medium drop-shadow-sm scale-y-110">
                    {formatTime(currentTime)}
                    <span className="text-4xl xl:text-6xl ml-4 font-sans font-bold tracking-wide text-mosque-gold">{(currentTime.getHours() >= 12 ? 'PM' : 'AM')}</span>
                  </div>
                  <div className="mt-6 flex flex-col items-center">
                    <span className="text-sm xl:text-base uppercase tracking-[0.3em] font-sans font-bold text-mosque-navy/60 mb-1">Next Prayer In</span>
                    <span className="font-mono text-5xl xl:text-6xl font-bold text-mosque-navy tabular-nums tracking-tight">{timeUntilIqamah}</span>
                  </div>
              </div>

              {/* Jumu'ah Section */}
              <div className="flex-[2.5] flex flex-col items-center justify-center py-4 bg-white border-b border-gray-300">
                <div className="text-2xl xl:text-3xl uppercase tracking-[0.2em] font-sans font-bold text-mosque-navy/80 mb-6 flex items-center gap-4">
                  <span className="h-px w-8 bg-mosque-gold"></span>
                  Jumu'ah
                  <span className="h-px w-8 bg-mosque-gold"></span>
                </div>
                <div className="flex w-full px-8 justify-around">
                    <div className="text-center group">
                      <div className="text-5xl xl:text-6xl font-serif font-bold mb-2 flex items-baseline text-mosque-navy group-hover:scale-110 transition-transform">
                        {jumuah.start.split(' ')[0]}
                        <span className="text-lg font-sans font-bold ml-1 text-mosque-gold">{jumuah.start.split(' ')[1]}</span>
                      </div>
                      <div className="text-xs xl:text-sm uppercase tracking-[0.25em] font-sans font-bold text-gray-400">Khutbah</div>
                    </div>
                    <div className="w-px h-16 bg-gray-200"></div>
                    <div className="text-center group">
                      <div className="text-5xl xl:text-6xl font-serif font-bold mb-2 flex items-baseline text-mosque-navy group-hover:scale-110 transition-transform">
                        {jumuah.iqamah.split(' ')[0]}
                        <span className="text-lg font-sans font-bold ml-1 text-mosque-gold">{jumuah.iqamah.split(' ')[1]}</span>
                      </div>
                      <div className="text-xs xl:text-sm uppercase tracking-[0.25em] font-sans font-bold text-gray-400">Iqamah</div>
                    </div>
                </div>
              </div>

              {/* Footer: Sunrise / Sunset */}
              <div className="bg-mosque-navy text-white p-6 xl:p-8 shadow-inner">
                <div className="flex items-center justify-between gap-8">
                    <div className="flex items-center gap-4">
                      <Sunrise className="w-8 h-8 xl:w-10 xl:h-10 text-mosque-gold" strokeWidth={2} />
                      <div className="flex flex-col">
                         <span className="text-xs uppercase tracking-widest opacity-60">Sunrise</span>
                         <span className="text-2xl xl:text-3xl font-serif font-bold">{prayers.sunrise}</span>
                      </div>
                    </div>
                    
                    <div className="h-10 w-px bg-white/10"></div>

                    <div className="flex items-center gap-4 text-right">
                      <div className="flex flex-col">
                         <span className="text-xs uppercase tracking-widest opacity-60">Sunset</span>
                         <span className="text-2xl xl:text-3xl font-serif font-bold">{prayers.sunset}</span>
                      </div>
                      <Sunset className="w-8 h-8 xl:w-10 xl:h-10 text-mosque-gold" strokeWidth={2} />
                    </div>
                </div>
              </div>
          </div>
      </div>

      {/* === BOTTOM FOOTER: ANNOUNCEMENT TICKER === */}
      <div className="h-16 xl:h-20 bg-white flex items-center overflow-hidden border-t-8 border-mosque-gold relative z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <div className="bg-mosque-gold text-mosque-navy px-8 h-full flex items-center justify-center z-10 font-black uppercase tracking-[0.15em] text-lg xl:text-xl shadow-2xl whitespace-nowrap min-w-[200px]">
             {announcement.title}
          </div>
          <div className="whitespace-nowrap animate-marquee flex items-center text-mosque-navy text-2xl xl:text-3xl font-semibold tracking-wide h-full w-full">
             <span className="mx-8 text-mosque-gold">•</span>
             {announcement.content} 
          </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
          padding-left: 100%;
        }
        .text-shadow {
          text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        }
      `}</style>
    </div>
  );
};