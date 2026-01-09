import React, { useEffect, useState } from 'react';
import { Announcement, Event } from '../types';
import { MosqueLogo } from './MosqueLogo';
import { fetchDailyWisdom } from '../services/geminiService';

interface ScreenEventsProps {
  announcement: Announcement;
  events: Event[];
}

export const ScreenEvents: React.FC<ScreenEventsProps> = ({ announcement, events }) => {
  const [wisdom, setWisdom] = useState<string>("Loading daily wisdom...");

  useEffect(() => {
    fetchDailyWisdom().then(setWisdom);
  }, []);

  return (
    <div className="w-full h-full flex bg-transparent">
      {/* Left Sidebar - Branding & Graphic (Opaque White) */}
      <div className="w-1/3 bg-white relative flex flex-col z-10 shadow-2xl">
        <div className="p-8 pb-0">
            <MosqueLogo className="items-start !text-left" />
        </div>
        
        {/* Decorative Curve */}
        <div className="absolute top-0 right-0 bottom-0 w-32 bg-mosque-navy" style={{ clipPath: 'ellipse(100% 100% at 100% 50%)' }}></div>
        <div className="absolute top-0 right-0 bottom-0 w-24 bg-mosque-gold opacity-20" style={{ clipPath: 'ellipse(100% 100% at 100% 50%)' }}></div>
        
        <div className="mt-auto p-8 pr-12 z-10">
           <div className="text-xs font-bold text-mosque-navy uppercase tracking-widest mb-2">Daily Wisdom</div>
           <p className="text-lg italic text-gray-600 font-serif leading-relaxed">
             "{wisdom}"
           </p>
        </div>
      </div>

      {/* Main Content Area - Transparent to show App background */}
      <div className="flex-1 flex flex-col p-16 justify-center relative overflow-hidden bg-transparent">
        
        {/* Events List */}
        <div className="space-y-8 mb-16 z-10">
          <h2 className="text-mosque-gold text-sm font-bold uppercase tracking-widest mb-6 border-b border-white/10 pb-2">Upcoming Events</h2>
          {events.map((event) => (
            <div key={event.id} className="flex items-center justify-between border-b border-white/10 pb-4 backdrop-blur-sm bg-black/10 p-4 rounded-lg">
              <span className="text-3xl text-white font-light">{event.title}</span>
              <span className="text-2xl text-mosque-gold font-bold">{event.date}</span>
            </div>
          ))}
        </div>

        {/* Main Announcement Banner */}
        <div className="relative z-10 mt-auto">
          <div className="inline-block bg-mosque-gold text-mosque-navy font-bold px-6 py-2 uppercase tracking-widest text-sm mb-0 rounded-t-lg">
            {announcement.title}
          </div>
          <div className="bg-white/10 backdrop-blur-md p-10 border-l-8 border-mosque-gold rounded-r-lg shadow-2xl">
            <p className="text-4xl text-white font-serif leading-snug">
              {announcement.content}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
