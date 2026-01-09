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
      {smallSuffix && <span className="text-[0.4em] ml-1 font-sans font-bold uppercase tracking-wide">{match[2]}</span>}
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
      
      // Calculate Hijri Date dynamically
      // Using Intl.DateTimeFormat with u-ca-islamic extension
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

  // Helper to parse "HH:MM AM/PM"
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
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase();
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

  // Logic to highlight the "active" or "next" prayer
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
    
    // Find the first prayer where Iqamah hasn't passed yet
    return rows.findIndex(row => parseToMinutes(row.iqamah || '') > currentMinutes);
  };
  
  const activeIndex = getActiveRowIndex();

  return (
    <div className="w-full h-full flex flex-col font-serif text-white overflow-hidden">
      
      {/* === TOP HEADER: MOSQUE NAME === */}
      <div className="h-[10%] bg-mosque-navy/90 border-b-2 border-mosque-gold/50 flex items-center justify-center relative z-20 shadow-lg">
          <div className="absolute inset-0 bg-black/20"></div>
          <h1 className="relative z-10 text-4xl font-serif text-mosque-gold font-bold uppercase tracking-[0.2em] drop-shadow-md">
            {MOSQUE_NAME}
          </h1>
      </div>

      {/* === MAIN CONTENT (SPLIT VIEW) === */}
      <div className="flex-1 flex overflow-hidden">
          
          {/* === LEFT COLUMN: PRAYER TABLE (65%) === */}
          <div className="w-[65%] flex flex-col border-r-4 border-black/20 relative z-10">
            {/* Header Row */}
            <div className="h-20 flex items-end pb-4 bg-transparent border-b border-white/10">
              <div className="w-[25%]"></div> {/* Spacer for Name */}
              <div className="w-[37.5%] text-center border-l border-white/10">
                  <span className="text-sm font-sans font-bold tracking-[0.2em] uppercase text-white/80">Starts</span>
              </div>
              <div className="w-[37.5%] text-center border-l border-white/10">
                  <span className="text-sm font-sans font-bold tracking-[0.2em] uppercase text-white/80">Iqamah</span>
              </div>
            </div>

            {/* Prayer Rows */}
            <div className="flex-1 flex flex-col">
              {rows.map((row, idx) => {
                const isActive = idx === activeIndex;
                const bgClass = isActive ? 'bg-[#E5E5E5]' : 'bg-transparent';
                const textClass = isActive ? 'text-mosque-navy' : 'text-white';
                const borderClass = isActive ? 'border-mosque-navy/10' : 'border-white/10';
                
                return (
                  <div key={idx} className={`flex-1 flex items-center ${bgClass} ${textClass} border-b ${borderClass} transition-colors duration-500`}>
                    {/* Prayer Name */}
                    <div className="w-[25%] pl-10">
                        <span className="text-3xl font-bold uppercase tracking-wider">{row.name}</span>
                    </div>
                    
                    {/* Start Time */}
                    <div className={`w-[37.5%] h-full flex items-center justify-center border-l ${borderClass}`}>
                        <TimeDisplay time={row.start} className="text-5xl" />
                    </div>
                    
                    {/* Iqamah Time */}
                    <div className={`w-[37.5%] h-full flex items-center justify-center border-l ${borderClass}`}>
                        <TimeDisplay time={row.iqamah || ''} className="text-6xl font-bold" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* === RIGHT COLUMN: INFO PANEL (35%) === */}
          <div className="w-[35%] bg-[#E5E5E5] text-mosque-navy flex flex-col z-10 shadow-2xl">
              
              {/* Date Section */}
              <div className="flex-[2] flex flex-col items-center justify-center border-b border-mosque-navy/10 py-4 space-y-1">
                  <div className="text-xl font-sans uppercase tracking-widest font-semibold opacity-90 text-mosque-gold">{hijriDate}</div>
                  <div className="text-xl font-sans uppercase tracking-widest font-semibold opacity-90 text-mosque-navy/80">{formatDate(currentTime)}</div>
              </div>

              {/* Clock Section */}
              <div className="flex-[3] flex flex-col items-center justify-center border-b border-mosque-navy/10 py-4">
                  <div className="text-[6rem] leading-none font-serif tracking-tighter">
                    {formatTime(currentTime)}<span className="text-4xl ml-2">{(currentTime.getHours() >= 12 ? 'PM' : 'AM')}</span>
                  </div>
                  <div className="mt-4 text-xl uppercase tracking-widest font-sans font-semibold">
                    Next Iqamah in <span className="font-serif text-2xl font-bold ml-2">{timeUntilIqamah}</span>
                  </div>
              </div>

              {/* Jumu'ah Section */}
              <div className="flex-[2] flex flex-col items-center justify-center py-4 bg-[#E5E5E5]">
                <div className="text-2xl uppercase tracking-widest font-sans mb-4">Jumu'ah</div>
                <div className="flex w-full px-8 justify-between">
                    <div className="text-center">
                      <div className="text-4xl font-serif font-medium mb-1 flex items-baseline">
                        {jumuah.start.split(' ')[0]}<span className="text-base font-sans font-bold ml-1">{jumuah.start.split(' ')[1]}</span>
                      </div>
                      <div className="text-xs uppercase tracking-widest font-sans opacity-70">Starts</div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-serif font-bold mb-1 flex items-baseline">
                        {jumuah.iqamah.split(' ')[0]}<span className="text-base font-sans font-bold ml-1">{jumuah.iqamah.split(' ')[1]}</span>
                      </div>
                      <div className="text-xs uppercase tracking-widest font-sans opacity-70">Jumu'ah</div>
                    </div>
                </div>
              </div>

              {/* Footer: Sunrise / Sunset */}
              <div className="bg-mosque-navy text-white p-6">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <Sunrise className="w-6 h-6 text-mosque-gold" strokeWidth={1.5} />
                          <span className="text-lg uppercase tracking-widest font-sans font-light">Sunrise</span>
                      </div>
                      <div className="text-2xl font-serif">{prayers.sunrise}</div>
                    </div>
                    
                    <div className="w-full h-px bg-white/20"></div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <Sunset className="w-6 h-6 text-mosque-gold" strokeWidth={1.5} />
                          <span className="text-lg uppercase tracking-widest font-sans font-light">Sunset</span>
                      </div>
                      <div className="text-2xl font-serif">{prayers.sunset}</div>
                    </div>
                </div>
              </div>
          </div>
      </div>

      {/* === BOTTOM FOOTER: ANNOUNCEMENT TICKER === */}
      <div className="h-12 bg-white flex items-center overflow-hidden border-t-4 border-mosque-gold relative z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.3)]">
          <div className="bg-mosque-gold text-mosque-navy px-6 h-full flex items-center z-10 font-bold uppercase tracking-widest text-sm shadow-md">
             {announcement.title}
          </div>
          <div className="whitespace-nowrap animate-marquee flex items-center text-mosque-navy text-lg font-medium tracking-wide">
             <span className="mx-4">•</span>
             {announcement.content} 
             <span className="mx-4">•</span>
             Please silence your cell phones
             <span className="mx-4">•</span>
             Keep the masjid clean
             <span className="mx-4">•</span>
             Donate generously for the new carpet project
          </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
          padding-left: 100%; /* Start off-screen */
        }
      `}</style>
    </div>
  );
};
