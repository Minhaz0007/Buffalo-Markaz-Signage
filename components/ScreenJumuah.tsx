import React from 'react';

interface ScreenJumuahProps {
  jumuah: { start: string; iqamah: string };
}

export const ScreenJumuah: React.FC<ScreenJumuahProps> = ({ jumuah }) => {
  return (
    <div className="w-full h-full flex">
      {/* Left Panel: Title - Transparent for App background */}
      <div className="w-1/2 bg-transparent flex flex-col justify-center px-16 relative overflow-hidden">
         
         <div className="relative z-10">
             <div className="w-2 h-32 bg-mosque-gold mb-8"></div>
             <h1 className="text-8xl font-bold text-mosque-cream font-serif leading-tight drop-shadow-lg">
               JUMU'AH <br/> 
               <span className="text-mosque-gold">PRAYER</span>
             </h1>
             
             <div className="flex gap-20 mt-16">
               <div>
                  <div className="text-gray-400 text-sm uppercase tracking-widest mb-2">Khutbah Starts</div>
                  <div className="text-5xl text-white font-mono font-bold drop-shadow-md">{jumuah.start}</div>
               </div>
               <div>
                  <div className="text-gray-400 text-sm uppercase tracking-widest mb-2">Iqamah</div>
                  <div className="text-5xl text-mosque-gold font-mono font-bold drop-shadow-md">{jumuah.iqamah}</div>
               </div>
             </div>
         </div>
      </div>

      {/* Right Panel: Info - Opaque */}
      <div className="w-1/2 bg-mosque-gold flex flex-col justify-center items-center text-mosque-navy relative overflow-hidden z-10 shadow-2xl">
         {/* Detailed Mosque Illustration */}
         <div className="absolute bottom-0 w-full h-2/3 opacity-10 pointer-events-none">
            <svg viewBox="0 0 500 400" preserveAspectRatio="xMidYMax meet" className="w-full h-full fill-mosque-navy">
               {/* Main Dome */}
               <path d="M150,400 L150,250 Q250,150 350,250 L350,400 Z" />
               <circle cx="250" cy="190" r="10" />
               <rect x="248" y="160" width="4" height="20" />
               {/* Minarets */}
               <path d="M50,400 L50,150 L60,130 L70,150 L70,400 Z" />
               <path d="M430,400 L430,150 L440,130 L450,150 L450,400 Z" />
               {/* Decorative Arches */}
               <path d="M180,400 v-80 a70,70 0 0,1 140,0 v80" fill="none" stroke="currentColor" strokeWidth="10" opacity="0.5"/>
            </svg>
         </div>

         <div className="text-center z-10 p-12">
            <h3 className="text-lg font-bold uppercase tracking-[0.2em] mb-8">Friday Reminder</h3>
            
            <p className="max-w-2xl text-center text-3xl font-serif leading-relaxed">
               "O you who have believed, when the adhan is called for the prayer on the day of Jumu'ah, then proceed to the remembrance of Allah and leave trade."
            </p>
            <div className="w-32 h-1 bg-mosque-navy mx-auto my-8 opacity-50"></div>
            <div className="text-sm font-bold uppercase tracking-widest opacity-70">Surah Al-Jumu'ah 62:9</div>
         </div>
      </div>
    </div>
  );
};
