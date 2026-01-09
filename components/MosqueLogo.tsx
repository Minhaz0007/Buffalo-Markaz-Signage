import React from 'react';

interface MosqueLogoProps {
  className?: string;
  theme?: 'light' | 'dark';
}

export const MosqueLogo: React.FC<MosqueLogoProps> = ({ className = "", theme = 'dark' }) => {
  const iconColor = theme === 'light' ? 'text-mosque-navy' : 'text-mosque-gold';
  const titleColor = theme === 'light' ? 'text-green-700' : 'text-mosque-gold';
  const subtitleColor = theme === 'light' ? 'text-gray-600' : 'text-white';

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Stylized Mosque Icon */}
      <div className="relative w-20 h-20 mb-3">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`${iconColor} w-full h-full`}>
           <path d="M2 22h20" />
           <path d="M4 22V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14" />
           <path d="M12 2v4" />
           <path d="M12 2a4 4 0 0 1 4 4" />
           <path d="M12 2a4 4 0 0 0-4 4" />
           <path d="M8 22v-5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v5" />
         </svg>
      </div>
      <div className="text-center">
        <h1 className={`${titleColor} font-bold text-xl uppercase tracking-wider font-serif leading-none mb-1`}>Buffalo</h1>
        <h2 className={`${subtitleColor} text-sm uppercase tracking-widest font-light`}>Markaz Masjid</h2>
      </div>
    </div>
  );
};