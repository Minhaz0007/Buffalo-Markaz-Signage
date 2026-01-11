import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneOff, AlignJustify, VolumeX } from 'lucide-react';
import { MobileSilentAlertSettings } from '../types';

interface MobileSilentAlertProps {
  settings: MobileSilentAlertSettings;
  targetTime: Date; // The Iqamah time
  onComplete?: () => void;
  previewMode?: boolean;
}

export const MobileSilentAlert: React.FC<MobileSilentAlertProps> = ({ 
  settings, 
  targetTime,
  previewMode = false 
}) => {
  const [timeLeft, setTimeLeft] = useState<string>("00:00");
  const [isUrgent, setIsUrgent] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const hasBeeped = useRef(false);

  // Sound generator (Oscillator)
  const playBeep = () => {
    if (!settings.beepEnabled) return;
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      
      oscillator.start();
      
      // Beep-Beep-Beep pattern
      gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio Context failed", e);
    }
  };

  useEffect(() => {
    // Reset beep ref when component mounts or target changes
    hasBeeped.current = false;

    const timer = setInterval(() => {
      const now = new Date();
      const diff = targetTime.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft("IQAMAH");
        return;
      }

      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);

      // Urgent threshold (last 30 seconds)
      if (diff <= 30000 && !isUrgent) {
        setIsUrgent(true);
      }

      // Beep Trigger (at 30 seconds mark)
      if (settings.beepEnabled && Math.floor(diff / 1000) === 30 && !hasBeeped.current && !previewMode) {
        playBeep();
        hasBeeped.current = true;
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetTime, settings.beepEnabled, previewMode]);

  // Preview Mode: Play beep immediately if urgent simulation
  useEffect(() => {
    if (previewMode && settings.beepEnabled) {
       // Optional: Play a test beep on mount in preview
       // playBeep();
    }
  }, [previewMode]);

  const Icon = settings.icon === 'align-rows' ? AlignJustify : settings.icon === 'shhh' ? VolumeX : PhoneOff;

  // Animation variants
  const bgVariants = {
    static: { opacity: 1 },
    pulse: { 
      opacity: [1, 0.9, 1],
      transition: { duration: 2, repeat: Infinity }
    },
    flash: {
      backgroundColor: [settings.backgroundColor, '#000000', settings.backgroundColor],
      transition: { duration: 0.5, repeat: Infinity }
    }
  };

  const iconVariants = {
    pulse: { scale: [1, 1.1, 1], rotate: [0, -5, 5, 0], transition: { duration: 1.5, repeat: Infinity } },
    flash: { scale: [1, 1.2, 1], transition: { duration: 0.5, repeat: Infinity } },
    none: { scale: 1 }
  };

  return (
    <motion.div 
      className="w-full h-full flex flex-col items-center justify-between text-white overflow-hidden relative"
      style={{ backgroundColor: settings.backgroundColor }}
      animate={settings.animation === 'flash' && isUrgent ? 'flash' : settings.animation === 'pulse' ? 'pulse' : 'static'}
      variants={bgVariants}
    >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] pointer-events-none"></div>

        {/* --- UPPER HALF: COUNTDOWN --- */}
        <div className="flex-1 flex flex-col items-center justify-center w-full relative z-10 border-b-4 border-white/20">
            <div className="text-3xl font-bold uppercase tracking-[0.3em] mb-4 opacity-80">
                Iqamah In
            </div>
            <div className="text-[14rem] font-bold font-serif leading-none tracking-tighter tabular-nums drop-shadow-2xl">
                {timeLeft}
            </div>
        </div>

        {/* --- LOWER HALF: ALERT MESSAGE --- */}
        <div className="flex-1 flex flex-col items-center justify-center w-full relative z-10 p-12 text-center">
            
            <motion.div 
              className="mb-10 p-8 bg-white/20 rounded-full backdrop-blur-sm border-2 border-white/30"
              animate={settings.animation}
              variants={iconVariants}
            >
               <Icon className="w-40 h-40 text-white" strokeWidth={1.5} />
            </motion.div>

            <h2 className="text-7xl font-bold font-serif leading-tight drop-shadow-lg max-w-5xl">
                {settings.text}
            </h2>
        </div>
    </motion.div>
  );
};