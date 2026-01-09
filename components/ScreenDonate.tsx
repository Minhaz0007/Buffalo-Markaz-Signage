import React from 'react';
import QRCode from 'react-qr-code';
import { MapPin, Phone, Globe } from 'lucide-react';
import { ADDRESS, PHONE, WEBSITE } from '../constants';

export const ScreenDonate: React.FC = () => {
  return (
    <div className="w-full h-full flex bg-transparent">
      {/* Left Panel: QR Code - Opaque */}
      <div className="w-1/2 flex flex-col items-center justify-center p-12 bg-white relative overflow-hidden z-10 shadow-2xl">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-32 bg-mosque-gold/20 rounded-r-full"></div>
        
        {/* Mosque Silhouette Overlay */}
         <div className="absolute left-0 bottom-0 w-full h-1/2 opacity-5 pointer-events-none text-mosque-navy">
            <svg viewBox="0 0 400 200" preserveAspectRatio="none" className="w-full h-full fill-current">
              <path d="M0,200 L0,150 Q100,100 200,150 Q300,100 400,150 L400,200 Z" />
              <rect x="50" y="80" width="20" height="120" />
              <path d="M50,80 L60,60 L70,80" />
              <rect x="330" y="80" width="20" height="120" />
              <path d="M330,80 L340,60 L350,80" />
            </svg>
         </div>

        <div className="bg-white p-6 shadow-xl rounded-lg z-10 border-2 border-mosque-gold/20">
          <QRCode 
            value="https://www.buffalomarkaz.com/donate" 
            size={250} 
            fgColor="#0B1E3B"
          />
        </div>
        <div className="mt-8 font-bold text-2xl text-mosque-navy tracking-widest uppercase z-10">
           Scan to Donate
        </div>
      </div>

      {/* Right Panel: Info - Transparent for App background */}
      <div className="w-1/2 bg-transparent text-white flex flex-col justify-center p-16 relative">
          <div className="absolute top-16 right-0 bg-mosque-gold text-mosque-navy font-bold py-2 px-8 uppercase tracking-widest text-sm shadow-lg">
             Support & Donate
          </div>

          <div className="space-y-10 mt-12 backdrop-blur-sm bg-mosque-navy/30 p-8 rounded-xl border border-white/5">
             <div>
                <h3 className="text-xl text-mosque-gold font-bold mb-2">General Fund</h3>
                <p className="opacity-80 leading-relaxed text-sm">
                   General fund is used for mosque maintenance, utilities, and daily operations ensuring a clean space for prayer.
                </p>
             </div>

             <div>
                <h3 className="text-xl text-mosque-gold font-bold mb-2">Zakat</h3>
                <p className="opacity-80 leading-relaxed text-sm">
                   Zakat contributions are strictly distributed to the eligible recipients as per Islamic guidelines.
                </p>
             </div>

             <div className="border-t border-white/10 pt-8 space-y-4">
                <div className="flex items-center gap-4">
                   <MapPin className="text-mosque-gold w-5 h-5" />
                   <span className="font-light">{ADDRESS}</span>
                </div>
                <div className="flex items-center gap-4">
                   <Phone className="text-mosque-gold w-5 h-5" />
                   <span className="font-light">{PHONE}</span>
                </div>
                <div className="flex items-center gap-4">
                   <Globe className="text-mosque-gold w-5 h-5" />
                   <span className="font-light">{WEBSITE}</span>
                </div>
             </div>
          </div>
      </div>
    </div>
  );
};
