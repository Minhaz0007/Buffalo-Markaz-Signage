import React, { useEffect, useState, useRef, useCallback } from 'react';
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

  // Sound generator (Oscillator) - wrapped in useCallback to prevent recreating on every render
  const playBeep = useCallback(() => {
    if (!settings.beepEnabled) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      // Ensure context is running (needed if resumed from suspended state)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const t = ctx.currentTime;

      // Calculate gain based on volume setting (0-100)
      // Normalize to 0.0 - 0.2 (0.2 is plenty loud for raw oscillator)
      const masterVolume = (settings.beepVolume || 75) / 100;
      const peakGain = masterVolume * 0.2;

      const playTone = (freq: number, startTime: number, duration: number, type: OscillatorType = 'sine') => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(freq, startTime);

        // Attack
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(peakGain, startTime + 0.05);
        // Decay
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      switch (settings.beepType) {
        case 'double':
            playTone(880, t, 0.15); // A5
            playTone(880, t + 0.2, 0.4); // A5
            break;
        case 'sonar':
            playTone(1200, t, 0.8, 'sine'); // High ping
            break;
        case 'soft':
            playTone(440, t, 1.5, 'sine'); // A4, long decay
            break;
        case 'single':
        default:
            playTone(880, t, 0.5, 'sine'); // Standard beep
            break;
      }

    } catch (e) {
      console.warn("Audio Context failed", e);
    }
  }, [settings.beepEnabled, settings.beepType, settings.beepVolume]);

  // Effect to handle the countdown
  useEffect(() => {
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
    }, 1000);

    return () => clearInterval(timer);
  }, [targetTime]);

  // Effect to handle the repeating audio loop
  useEffect(() => {
    if (!settings.beepEnabled) return;

    // Play immediately on mount/update
    playBeep();

    // Determine loop interval based on beep type to prevent overlapping mess
    let loopInterval = 2000; // default 2 seconds
    if (settings.beepType === 'soft') loopInterval = 3000;
    if (settings.beepType === 'sonar') loopInterval = 2500;
    if (settings.beepType === 'double') loopInterval = 2000;
    if (isUrgent) loopInterval = 1000; // Faster beeps when urgent

    const loop = setInterval(() => {
        playBeep();
    }, loopInterval);

    return () => clearInterval(loop);
  }, [playBeep, settings.beepEnabled, settings.beepType, isUrgent]);


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
            <div className="text-5xl font-bold uppercase tracking-[0.3em] mb-8 opacity-80">
                Iqamah In
            </div>
            <div className="text-[24rem] font-bold font-serif leading-none tracking-tighter tabular-nums drop-shadow-2xl">
                {timeLeft}
            </div>
        </div>

        {/* --- LOWER HALF: ALERT MESSAGE --- */}
        <div className="flex-1 flex flex-col items-center justify-center w-full relative z-10 p-8 text-center">
            
            <motion.div 
              className="mb-8 p-8 bg-white/20 rounded-full backdrop-blur-sm border-2 border-white/30"
              animate={settings.animation}
              variants={iconVariants}
            >
               <Icon className="w-52 h-52 text-white" strokeWidth={1.5} />
            </motion.div>

            <h2 className="text-8xl font-bold font-serif leading-tight drop-shadow-lg max-w-7xl">
                {settings.text}
            </h2>
        </div>
    </motion.div>
  );
};