import React, { useState, useMemo } from 'react';
import { X, Settings as SettingsIcon, Upload, Calendar as CalendarIcon, Plus, Trash2, Edit2, AlertTriangle, LayoutDashboard, MessageSquare, Palette, CheckCircle2, Zap, Type, ChevronLeft, ChevronRight, Moon, Clock, Sparkles, Wind, PlayCircle, StopCircle, Layers, Lock, PhoneOff, Eye, Volume2, Save, Music, Monitor, LayoutTemplate, Info, Sun, Pencil } from 'lucide-react';
import { Announcement, ExcelDaySchedule, ManualOverride, AnnouncementItem, SlideConfig, AnnouncementSlideConfig, AutoAlertSettings, MobileSilentAlertSettings, HijriSettings, HIJRI_MONTHS } from '../types';
import { getHijriDateFromSettings, getHijriAnchorStatus } from '../utils/hijriDate';
import { toEasternDateStr } from '../utils/easternTime';
import { ALERT_MESSAGES } from '../constants';
import * as XLSX from 'xlsx';
import { saveExcelScheduleToDatabase, clearExcelScheduleFromDatabase } from '../utils/database';
import { ScheduleIndex } from '../utils/scheduler';
import { isSupabaseConfigured } from '../utils/supabase';
import { calculatePrayerTimes } from '../utils/prayerCalculator';

// --- Types ---
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  excelSchedule: Record<string, ExcelDaySchedule>;
  setExcelSchedule: (schedule: Record<string, ExcelDaySchedule>) => void;
  manualOverrides: ManualOverride[];
  setManualOverrides: (overrides: ManualOverride[]) => void;
  announcement: Announcement;
  setAnnouncement: (a: Announcement) => void;
  currentTheme: string;
  setCurrentTheme: (theme: string) => void;
  maghribOffset: number;
  setMaghribOffset: (offset: number) => void;
  sunriseOffset: number;
  setSunriseOffset: (offset: number) => void;
  sunsetOffset: number;
  setSunsetOffset: (offset: number) => void;
  
  autoAlertSettings: AutoAlertSettings;
  setAutoAlertSettings: (settings: AutoAlertSettings) => void;
  
  tickerBg: 'white' | 'navy';
  setTickerBg: (bg: 'white' | 'navy') => void;

  slidesConfig: SlideConfig[];
  setSlidesConfig: (config: SlideConfig[]) => void;

  mobileAlertSettings: MobileSilentAlertSettings;
  setMobileAlertSettings: (settings: MobileSilentAlertSettings) => void;
  setIsPreviewAlert: (isPreview: boolean) => void;
  scheduleIndex?: ScheduleIndex;
  hijriSettings: HijriSettings;
  setHijriSettings: (settings: HijriSettings) => void;
  fajrAngle: 15 | 18;
  setFajrAngle: (angle: 15 | 18) => void;
  ishaAngle: 15 | 18;
  setIshaAngle: (angle: 15 | 18) => void;
  fajrStartOffset: number;
  setFajrStartOffset: (v: number) => void;
  fajrIqamahOffset: number;
  setFajrIqamahOffset: (v: number) => void;
  dhuhrStartOffset: number;
  setDhuhrStartOffset: (v: number) => void;
  dhuhrIqamahOffset: number;
  setDhuhrIqamahOffset: (v: number) => void;
  asrStartOffset: number;
  setAsrStartOffset: (v: number) => void;
  asrIqamahOffset: number;
  setAsrIqamahOffset: (v: number) => void;
  ishaStartOffset: number;
  setIshaStartOffset: (v: number) => void;
  ishaIqamahOffset: number;
  setIshaIqamahOffset: (v: number) => void;
  onSaveScheduleChanges?: (changed: Record<string, ExcelDaySchedule>) => void;
}

// --- Reusable UI Components (SCALED UP FOR 1920x1080) ---

const Toggle = ({ checked, onChange, label, description }: { checked: boolean, onChange: (c: boolean) => void, label?: string, description?: string }) => (
  <div className="flex items-center justify-between group cursor-pointer" onClick={() => onChange(!checked)}>
    <div className="flex flex-col">
        {label && <span className="text-white font-medium text-2xl group-hover:text-mosque-gold transition-colors">{label}</span>}
        {description && <span className="text-white/50 text-xl mt-2">{description}</span>}
    </div>
    <div className={`w-24 h-14 rounded-full relative transition-colors duration-300 shadow-inner flex-shrink-0 ml-8 ${checked ? 'bg-mosque-gold' : 'bg-white/10'}`}>
       <div className={`absolute top-2 bottom-2 w-10 bg-white rounded-full transition-all duration-300 shadow-md ${checked ? 'translate-x-12' : 'translate-x-2'}`}></div>
    </div>
  </div>
);

const SectionHeader = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
    <div className="flex items-center gap-8 mb-10 pb-8 border-b border-white/10">
        <div className="p-6 rounded-3xl bg-gradient-to-br from-mosque-gold/20 to-transparent border border-white/5 text-mosque-gold shadow-lg">
            <Icon className="w-12 h-12" />
        </div>
        <div>
            <h2 className="text-5xl font-bold text-white font-serif tracking-wide">{title}</h2>
            <p className="text-white/50 text-2xl mt-2">{description}</p>
        </div>
    </div>
);

const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`bg-white/5 border border-white/10 rounded-3xl p-10 hover:border-white/20 transition-all shadow-sm ${className}`}>
        {children}
    </div>
);

const ColorPickerPreset = ({ value, onChange }: { value: string, onChange: (c: string) => void }) => {
    const presets = ['#D4AF37', '#0B1E3B', '#FFFFFF', '#000000', '#B91C1C', '#15803D', '#D97706', '#7C3AED'];
    return (
        <div className="flex flex-wrap gap-4">
            {presets.map(c => (
                <button
                    key={c}
                    onClick={() => onChange(c)}
                    className={`w-16 h-16 rounded-full border-4 transition-transform hover:scale-110 shadow-sm ${value === c ? 'border-white ring-4 ring-white/20 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                    title={c}
                />
            ))}
            <div className="relative group">
                <div className="w-16 h-16 rounded-full border-4 border-white/20 flex items-center justify-center bg-white/5 text-white/50 group-hover:bg-white/10 overflow-hidden">
                    <Palette className="w-8 h-8" />
                </div>
                <input 
                    type="color" 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
            </div>
        </div>
    );
};


export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose,
  excelSchedule, setExcelSchedule,
  manualOverrides, setManualOverrides,
  announcement, setAnnouncement,
  currentTheme, setCurrentTheme,
  maghribOffset, setMaghribOffset,
  sunriseOffset, setSunriseOffset,
  sunsetOffset, setSunsetOffset,
  autoAlertSettings, setAutoAlertSettings,
  tickerBg, setTickerBg,
  slidesConfig, setSlidesConfig,
  mobileAlertSettings, setMobileAlertSettings,
  setIsPreviewAlert,
  scheduleIndex,
  hijriSettings, setHijriSettings,
  fajrAngle, setFajrAngle,
  ishaAngle, setIshaAngle,
  fajrStartOffset, setFajrStartOffset,
  fajrIqamahOffset, setFajrIqamahOffset,
  dhuhrStartOffset, setDhuhrStartOffset,
  dhuhrIqamahOffset, setDhuhrIqamahOffset,
  asrStartOffset, setAsrStartOffset,
  asrIqamahOffset, setAsrIqamahOffset,
  ishaStartOffset, setIshaStartOffset,
  ishaIqamahOffset, setIshaIqamahOffset,
  onSaveScheduleChanges,
}) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'announcements' | 'customization' | 'slideshow' | 'silentAlert' | 'hijri'>('schedule');
  const [uploadStatus, setUploadStatus] = useState<string>("");

  // Announcement Editor State
  const defaultItemState = { text: "", color: "#FFFFFF", animation: 'none' as const };
  const [newItem, setNewItem] = useState<Omit<AnnouncementItem, 'id'>>(defaultItemState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Excel Schedule Editor
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [scheduleEditorMonth, setScheduleEditorMonth] = useState(() => new Date().getMonth() + 1);
  const [scheduleEditorYear, setScheduleEditorYear] = useState(() => new Date().getFullYear());
  const [editingCell, setEditingCell] = useState<{ date: string; prayer: string; field: 'start' | 'iqamah' } | null>(null);
  // Draft state: buffers edits until Save is pressed
  const [draftSchedule, setDraftSchedule] = useState<Record<string, import('../types').ExcelDaySchedule>>({});
  const [originalScheduleSnapshot, setOriginalScheduleSnapshot] = useState<Record<string, import('../types').ExcelDaySchedule>>({});
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false);

  // Slideshow Editor State
  const [expandedSlideId, setExpandedSlideId] = useState<string | null>(null);

  // --- useMemo hooks MUST be before any early return (Rules of Hooks) ---

  // Count cells that differ between draft and original snapshot (across all months)
  const pendingChangeCount = useMemo(() => {
    if (!hasUnsavedEdits) return 0;
    let count = 0;
    Object.keys(draftSchedule).forEach(date => {
      const orig = originalScheduleSnapshot[date];
      const draft = draftSchedule[date];
      if (!draft) return;
      (['fajr', 'dhuhr', 'asr', 'isha'] as const).forEach(p => {
        if (orig?.[p]?.start !== draft[p]?.start) count++;
        if (orig?.[p]?.iqamah !== draft[p]?.iqamah) count++;
      });
      if (orig?.jumuahIqamah !== draft.jumuahIqamah) count++;
    });
    return count;
  }, [draftSchedule, originalScheduleSnapshot, hasUnsavedEdits]);

  const currentMonthKey = `${String(scheduleEditorYear).padStart(4, '0')}-${String(scheduleEditorMonth).padStart(2, '0')}`;

  // Helper: build a base ExcelDaySchedule from auto-calculated prayer times
  const buildCalculatedEntry = (dateStr: string): ExcelDaySchedule => {
    const calc = calculatePrayerTimes(new Date(dateStr + 'T12:00:00'), fajrAngle, ishaAngle);
    return {
      date: dateStr,
      fajr: { start: calc.fajr.start, iqamah: calc.fajr.iqamah ?? '' },
      dhuhr: { start: calc.dhuhr.start, iqamah: calc.dhuhr.iqamah ?? '' },
      asr: { start: calc.asr.start, iqamah: calc.asr.iqamah ?? '' },
      maghrib: { start: calc.maghrib.start, iqamah: calc.maghrib.iqamah ?? '' },
      isha: { start: calc.isha.start, iqamah: calc.isha.iqamah ?? '' },
    };
  };

  // Entries for the currently viewed month — always generates all days using calculated times
  // as the base, overlaid with any draft/excel overrides.
  const currentMonthEntries = useMemo(() => {
    const daysInMonth = new Date(scheduleEditorYear, scheduleEditorMonth, 0).getDate();
    const entries: [string, ExcelDaySchedule & { _isAutoCalc?: boolean }][] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${scheduleEditorYear}-${String(scheduleEditorMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (draftSchedule[dateStr]) {
        entries.push([dateStr, draftSchedule[dateStr]]);
      } else if (excelSchedule[dateStr]) {
        entries.push([dateStr, excelSchedule[dateStr]]);
      } else {
        entries.push([dateStr, { ...buildCalculatedEntry(dateStr), _isAutoCalc: true } as any]);
      }
    }
    return entries;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftSchedule, excelSchedule, scheduleEditorYear, scheduleEditorMonth, fajrAngle, ishaAngle]);

  if (!isOpen) return null;

  const handlePreviewToggle = () => {
      setIsPreviewAlert(true);
      onClose();
      setTimeout(() => {
          setIsPreviewAlert(false);
      }, 5000);
  };

  const convertExcelTime = (val: any, isJumuah: boolean = false): string => {
    if (!val) return "";
    let timeStr = String(val);

    // If time already has AM/PM, return as-is
    if (/AM|PM/i.test(timeStr)) {
      return timeStr;
    }

    // Handle Excel serial number (fraction of a day)
    if (typeof val === 'number') {
        const totalMinutes = Math.round(val * 24 * 60);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        timeStr = `${h}:${m < 10 ? '0' : ''}${m}`;
    }

    // Match time format HH:MM or H:MM
    const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
        let h = parseInt(match[1]);
        const m = match[2];

        // Determine AM/PM based on hour value
        let ampm: string;
        if (h >= 13) {
          // Definitely 24-hour format (1 PM - 11 PM)
          ampm = 'PM';
          h -= 12;
        } else if (h === 0) {
          // Midnight
          h = 12;
          ampm = 'AM';
        } else if (h === 12) {
          // Noon
          ampm = 'PM';
        } else if (h >= 1 && h <= 2 && isJumuah) {
          // Jumu'ah times in 1-2 range are always PM (afternoon prayer)
          ampm = 'PM';
        } else if (h >= 4 && h <= 7) {
          // Fajr range (4 AM - 7 AM)
          ampm = 'AM';
        } else {
          // For other hours, default to 24-hour interpretation
          ampm = h >= 12 ? 'PM' : 'AM';
          if (h > 12) h -= 12;
          if (h === 0) h = 12;
        }

        return `${h}:${m} ${ampm}`;
    }
    return timeStr;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadStatus("Processing...");
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const newSchedule: Record<string, ExcelDaySchedule> = {};
      let count = 0;

      // Detect format by inspecting header row (row 0)
      // Markaz format: Date | Fajr Iqamah | Dhuhr Iqamah | Asr Iqamah | Isha Iqamah | Jumuah Iqamah (6 cols, iqamah-only)
      // Full format:   Date | Fajr Start | Fajr Iqamah | Dhuhr Start | Dhuhr Iqamah | ... (12 cols, start+iqamah)
      const headers: string[] = (jsonData[0] || []).map((h: any) => String(h || '').toLowerCase().trim());
      const isMarkazFormat =
        headers.length >= 2 &&
        !headers.some(h => h.includes('start')) &&
        headers.some(h => h.includes('fajr') && h.includes('iqamah'));

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row[0]) continue;
        let dateKey = "";

        // Detect leap year note row (e.g. "* LEAP-02-29: ...")
        const isLeapRow = typeof row[0] === 'string' && /LEAP[- ]?02[- ]?29/i.test(row[0]);

        if (isLeapRow) {
          dateKey = "0000-02-29"; // sentinel key — scheduleIndex maps "02-29" for any leap year
        } else if (typeof row[0] === 'number') {
             const dateObj = XLSX.SSF.parse_date_code(row[0]);
             if (dateObj) dateKey = `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
        } else if (typeof row[0] === 'string') {
             const d = new Date(row[0]);
             if (!isNaN(d.getTime())) dateKey = d.toISOString().split('T')[0];
             else if (/^\d{4}-\d{2}-\d{2}$/.test(row[0])) dateKey = row[0];
        }
        if (dateKey) {
            if (isMarkazFormat) {
              // Markaz format: only iqamah times; no start times or Maghrib in file
              newSchedule[dateKey] = {
                date: dateKey,
                fajr:    { start: '', iqamah: convertExcelTime(row[1]) },
                dhuhr:   { start: '', iqamah: convertExcelTime(row[2]) },
                asr:     { start: '', iqamah: convertExcelTime(row[3]) },
                maghrib: { start: '', iqamah: '' },
                isha:    { start: '', iqamah: convertExcelTime(row[4]) },
                jumuahIqamah: convertExcelTime(row[5], true),
              };
            } else {
              // Full format: start + iqamah for each prayer
              newSchedule[dateKey] = {
                date: dateKey,
                fajr:    { start: convertExcelTime(row[1]),  iqamah: convertExcelTime(row[2]) },
                dhuhr:   { start: convertExcelTime(row[3]),  iqamah: convertExcelTime(row[4]) },
                asr:     { start: convertExcelTime(row[5]),  iqamah: convertExcelTime(row[6]) },
                maghrib: { start: convertExcelTime(row[7]),  iqamah: convertExcelTime(row[8]) },
                isha:    { start: convertExcelTime(row[9]),  iqamah: convertExcelTime(row[10]) },
                jumuahIqamah: convertExcelTime(row[11], true),
              };
            }
            if (!isLeapRow) count++; // don't count the leap sentinel in the day total
        }
      }

      // If the file has no leap year row data, auto-interpolate Feb 29 as
      // midpoint of Feb 28 + Mar 1. This ensures leap years (2028, 2032…) get
      // correct iqamah times instead of falling back to auto-calculated times.
      if (!newSchedule['0000-02-29']) {
        const feb28 = Object.values(newSchedule).find(d => d.date.endsWith('-02-28'));
        const mar01 = Object.values(newSchedule).find(d => d.date.endsWith('-03-01'));
        if (feb28 && mar01) {
          const midTime = (a: string, b: string): string => {
            if (!a || !b) return a || b || '';
            const toMin = (t: string) => {
              const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
              if (!m) return 0;
              let h = parseInt(m[1]); const min = parseInt(m[2]); const ap = m[3].toUpperCase();
              if (ap === 'PM' && h !== 12) h += 12;
              if (ap === 'AM' && h === 12) h = 0;
              return h * 60 + min;
            };
            const fromMin = (total: number) => {
              const h = Math.floor(total / 60) % 24; const mn = total % 60;
              const ap = h >= 12 ? 'PM' : 'AM';
              const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
              return `${dh}:${mn.toString().padStart(2, '0')} ${ap}`;
            };
            return fromMin(Math.round((toMin(a) + toMin(b)) / 2));
          };
          newSchedule['0000-02-29'] = {
            date: '0000-02-29',
            fajr:    { start: midTime(feb28.fajr.start, mar01.fajr.start),     iqamah: midTime(feb28.fajr.iqamah, mar01.fajr.iqamah) },
            dhuhr:   { start: midTime(feb28.dhuhr.start, mar01.dhuhr.start),   iqamah: midTime(feb28.dhuhr.iqamah, mar01.dhuhr.iqamah) },
            asr:     { start: midTime(feb28.asr.start, mar01.asr.start),       iqamah: midTime(feb28.asr.iqamah, mar01.asr.iqamah) },
            maghrib: { start: '', iqamah: '' },
            isha:    { start: midTime(feb28.isha.start, mar01.isha.start),     iqamah: midTime(feb28.isha.iqamah, mar01.isha.iqamah) },
            jumuahIqamah: midTime(feb28.jumuahIqamah || '', mar01.jumuahIqamah || ''),
          };
        }
      }
      setExcelSchedule(newSchedule);
      // Clear any in-progress edits so the editor starts fresh with the new file
      setDraftSchedule({});
      setOriginalScheduleSnapshot({});
      setHasUnsavedEdits(false);
      setEditingCell(null);

      // Save to Supabase database (with fresh replacement)
      if (!isSupabaseConfigured()) {
        setUploadStatus(`⚠️ Imported ${count} days (LOCAL ONLY - Supabase not configured). Set environment variables to enable cloud sync.`);
      } else {
        // STEP 1: Clear all old Excel data from database
        setUploadStatus(`Clearing old data from database...`);
        const clearResult = await clearExcelScheduleFromDatabase();

        if (!clearResult.success) {
          setUploadStatus(`⚠️ Failed to clear old data. Upload aborted. Please try again.`);
          return;
        }

        // STEP 2: Save new Excel data to database
        setUploadStatus(`Saving ${count} new days to database...`);
        const dbResult = await saveExcelScheduleToDatabase(newSchedule);

        if (dbResult.success) {
          setUploadStatus(`✅ Success! Replaced database with ${count} new days. Old data cleared. Changes synced to all devices.`);
        } else {
          setUploadStatus(`⚠️ Imported ${count} days locally, but cloud save failed. Data may not sync across devices.`);
        }
      }
    } catch (err) {
      console.error(err);
      setUploadStatus("Error processing file.");
    }
  };

  // --- Announcement Handlers ---
  const openEditor = (item?: AnnouncementItem) => {
    if (item) {
      setNewItem({ text: item.text, color: item.color, animation: item.animation });
      setEditingId(item.id);
    } else {
      setNewItem(defaultItemState); 
      setEditingId(null);
    }
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setNewItem(defaultItemState);
    setEditingId(null);
  };

  const handleSaveItem = () => {
    if(!newItem.text.trim()) return;
    if (editingId) {
      const updatedItems = announcement.items.map(item => 
        item.id === editingId ? { ...item, ...newItem } : item
      );
      setAnnouncement({ ...announcement, items: updatedItems });
    } else {
      const newItemObj: AnnouncementItem = { id: Date.now().toString(), ...newItem };
      setAnnouncement({ ...announcement, items: [...announcement.items, newItemObj] });
    }
    closeEditor();
  };

  const deleteAnnouncementItem = (id: string) => {
    const newItems = announcement.items.filter(i => i.id !== id);
    setAnnouncement({ ...announcement, items: newItems });
  };

  // --- Slideshow Handlers ---
  const updateSlideConfig = (id: string, updates: Partial<SlideConfig> | Partial<AnnouncementSlideConfig['styles']>) => {
    const newConfig = slidesConfig.map(slide => {
      if (slide.id === id) {
        if (slide.type === 'ANNOUNCEMENT' && 'backgroundColor' in updates) {
           return { ...slide, styles: { ...(slide as AnnouncementSlideConfig).styles, ...updates } };
        }
        return { ...slide, ...updates };
      }
      return slide;
    });
    setSlidesConfig(newConfig as SlideConfig[]);
  };

  // --- Excel Schedule Editor Helpers ---

  // Ensure a date exists in the draft (seed from excelSchedule or auto-calculate)
  const ensureDraftEntry = (prev: Record<string, ExcelDaySchedule>, date: string): Record<string, ExcelDaySchedule> => {
    if (prev[date]) return prev;
    const base = excelSchedule[date] || buildCalculatedEntry(date);
    return { ...prev, [date]: { ...base } };
  };

  // Write a start time change into the draft
  const updateExcelStart = (date: string, prayer: 'fajr' | 'dhuhr' | 'asr' | 'isha', value: string) => {
    setDraftSchedule(prev => {
      const next = ensureDraftEntry(prev, date);
      return { ...next, [date]: { ...next[date], [prayer]: { ...next[date][prayer], start: value } } };
    });
    setHasUnsavedEdits(true);
    setEditingCell(null);
  };

  // Write an iqamah change into the draft (never touches excelSchedule until Save)
  const updateExcelIqamah = (date: string, prayer: 'fajr' | 'dhuhr' | 'asr' | 'isha', value: string) => {
    setDraftSchedule(prev => {
      const next = ensureDraftEntry(prev, date);
      return { ...next, [date]: { ...next[date], [prayer]: { ...next[date][prayer], iqamah: value } } };
    });
    setHasUnsavedEdits(true);
    setEditingCell(null);
  };

  const updateExcelJumuahIqamah = (date: string, value: string) => {
    setDraftSchedule(prev => {
      const next = ensureDraftEntry(prev, date);
      return { ...next, [date]: { ...next[date], jumuahIqamah: value } };
    });
    setHasUnsavedEdits(true);
    setEditingCell(null);
  };

  // Commit draft → delta save (only changed rows propagate to App.tsx + Supabase)
  const handleSaveSchedule = () => {
    const changedRows: Record<string, ExcelDaySchedule> = {};
    Object.keys(draftSchedule).forEach(date => {
      const orig = originalScheduleSnapshot[date];
      const draft = draftSchedule[date];
      if (!draft) return;
      const changed =
        !orig ||
        orig.fajr?.start !== draft.fajr?.start ||
        orig.fajr?.iqamah !== draft.fajr?.iqamah ||
        orig.dhuhr?.start !== draft.dhuhr?.start ||
        orig.dhuhr?.iqamah !== draft.dhuhr?.iqamah ||
        orig.asr?.start !== draft.asr?.start ||
        orig.asr?.iqamah !== draft.asr?.iqamah ||
        orig.isha?.start !== draft.isha?.start ||
        orig.isha?.iqamah !== draft.isha?.iqamah ||
        orig.jumuahIqamah !== draft.jumuahIqamah;
      if (changed) changedRows[date] = draft;
    });

    if (Object.keys(changedRows).length > 0) {
      onSaveScheduleChanges?.(changedRows);
    }

    setOriginalScheduleSnapshot(JSON.parse(JSON.stringify(draftSchedule)));
    setHasUnsavedEdits(false);
    setEditingCell(null);
  };

  // Reset draft back to the snapshot taken when the editor was opened
  const handleDiscardSchedule = () => {
    setDraftSchedule(JSON.parse(JSON.stringify(originalScheduleSnapshot)));
    setHasUnsavedEdits(false);
    setEditingCell(null);
  };

  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const navigateMonth = (dir: 1 | -1) => {
    let newMonth = scheduleEditorMonth + dir;
    let newYear = scheduleEditorYear;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1) { newMonth = 12; newYear--; }
    setScheduleEditorMonth(newMonth);
    setScheduleEditorYear(newYear);
  };

  // --- Styles ---
  const inputBase = "w-full bg-black/30 border border-white/10 rounded-2xl px-8 h-20 text-2xl text-white placeholder-white/30 focus:border-mosque-gold focus:ring-1 focus:ring-mosque-gold focus:bg-black/50 outline-none transition-all duration-200";
  const labelBase = "block text-xl font-bold uppercase tracking-widest text-mosque-gold/90 mb-4";

  const renderSidebarItem = (id: string, label: string, Icon: any) => (
      <button 
        onClick={() => setActiveTab(id as any)} 
        className={`w-full flex items-center gap-6 px-10 py-8 rounded-2xl transition-all duration-300 group ${activeTab === id ? 'bg-mosque-gold text-mosque-navy shadow-lg font-bold' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
      >
        <Icon className={`w-10 h-10 ${activeTab === id ? 'text-mosque-navy' : 'text-white/40 group-hover:text-white'}`} />
        <span className="text-3xl tracking-wide">{label}</span>
      </button>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-8">
      {/* 16:9 Aspect Ratio Container for Settings */}
      <div className="bg-[#0B1E3B] w-[1800px] h-[1000px] rounded-[3rem] shadow-2xl border-2 border-mosque-gold/20 flex overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] opacity-5 pointer-events-none"></div>

        {/* --- Sidebar --- */}
        <div className="w-[500px] bg-black/20 border-r border-white/5 flex flex-col relative z-20 backdrop-blur-xl shrink-0">
            <div className="p-12 pb-6">
               <h2 className="text-4xl text-white font-serif flex items-center gap-4 opacity-90">
                 <SettingsIcon className="w-12 h-12 text-mosque-gold" /> 
                 <span>Configuration</span>
               </h2>
            </div>
            <div className="w-full h-px bg-white/5 mb-6"></div>

            <nav className="flex-1 px-6 space-y-4 overflow-y-auto">
               {renderSidebarItem('schedule', 'Schedule', LayoutDashboard)}
               {renderSidebarItem('announcements', 'Alerts & Ticker', MessageSquare)}
               {renderSidebarItem('silentAlert', 'Silent Alert', PhoneOff)}
               {renderSidebarItem('slideshow', 'Slideshow', Layers)}
               {renderSidebarItem('customization', 'Theme', Palette)}
               {renderSidebarItem('hijri', 'Hijri Date', Moon)}
            </nav>

            <div className="p-10 border-t border-white/5">
                <div className="text-white/30 text-xl uppercase tracking-widest font-mono text-center">
                    Markaz Masjid v2.0
                </div>
            </div>
        </div>

        {/* --- Main Content --- */}
        <div className="flex-1 flex flex-col relative z-10 bg-gradient-to-br from-[#0f2445] to-[#08152b] overflow-hidden">
             
             {/* Header */}
             <div className="h-32 px-16 flex items-center justify-between border-b border-white/5 bg-black/10 shrink-0">
                 <h3 className="text-white font-serif text-5xl tracking-wide opacity-90">
                    {activeTab === 'schedule' ? 'Prayer Schedule' :
                     activeTab === 'announcements' ? 'Announcements & Alerts' :
                     activeTab === 'silentAlert' ? 'Mobile Silent Alert' :
                     activeTab === 'slideshow' ? 'Right Panel Content' :
                     activeTab === 'hijri' ? 'Hijri Date Settings' : 'Appearance'}
                 </h3>
                 <button
                    onClick={onClose}
                    className="p-4 rounded-full border-2 border-white/10 hover:border-mosque-gold hover:bg-mosque-gold/10 text-white/70 hover:text-mosque-gold transition-all"
                    title="Close Settings"
                 >
                    <X className="w-10 h-10" />
                 </button>
             </div>

             <div className="flex-1 overflow-y-auto p-16 custom-scrollbar">
                <div className="max-w-[1400px] mx-auto pb-32">
                
                {/* --- SCHEDULE TAB --- */}
                {activeTab === 'schedule' && (
                  <div className="space-y-16">
                     <SectionHeader icon={CalendarIcon} title="Prayer Times" description="Manage annual schedule and one-off adjustments." />

                     {/* Excel Import Card */}
                     <Card>
                        <div className="flex flex-row gap-8 items-start">
                            {/* Left half: icon + title + description */}
                            <div className="flex-1">
                                <h4 className="text-3xl font-bold text-white mb-4">Excel Data Source</h4>
                                <p className="text-white/50 text-xl leading-relaxed">Import your annual <code>.xlsx</code> schedule. Supports Markaz format (Date, Fajr Iqamah, Dhuhr Iqamah, Asr Iqamah, Isha Iqamah, Jumuah Iqamah) or full format with Start times.</p>
                            </div>
                            {/* Right half: badge + upload zone */}
                            <div className="flex-1 flex flex-col gap-4">
                                <div className="flex justify-end">
                                    <div className={`px-6 py-3 rounded-xl font-mono text-xl border ${Object.keys(excelSchedule).length > 0 ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                                        {Object.keys(excelSchedule).length} Days Loaded
                                    </div>
                                </div>
                                <label className="flex items-center justify-center w-full h-48 border-4 border-dashed border-white/10 rounded-3xl hover:border-mosque-gold/50 hover:bg-white/5 transition-all cursor-pointer group">
                                    <div className="flex flex-col items-center gap-4">
                                        <Upload className="w-12 h-12 text-white/30 group-hover:text-mosque-gold transition-colors" />
                                        <span className="text-white/50 group-hover:text-white font-medium text-2xl">Click to upload .xlsx file</span>
                                    </div>
                                    <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" />
                                </label>
                                {uploadStatus && <div className="mt-2 text-center font-mono text-xl text-mosque-gold">{uploadStatus}</div>}
                            </div>
                        </div>
                     </Card>

                     {/* Offset Config Card — full-width */}
                     <Card>
                        <div className="flex items-start gap-8 mb-8">
                            <div className="p-5 bg-indigo-500/10 rounded-2xl text-indigo-400 shrink-0"><Clock className="w-10 h-10" /></div>
                            <div>
                                <h4 className="text-3xl font-bold text-white mb-2">Offset</h4>
                                <p className="text-white/50 text-xl">Adjust calculated and iqamah times ±30 min for each prayer.</p>
                            </div>
                        </div>
                        {/* Column headers */}
                        <div className="grid grid-cols-3 gap-4 mb-4 px-2">
                            <span className="text-white/40 font-bold text-lg uppercase tracking-widest">PRAYER</span>
                            <span className="text-white/40 font-bold text-lg uppercase tracking-widest text-center">START</span>
                            <span className="text-white/40 font-bold text-lg uppercase tracking-widest text-center">IQAMAH</span>
                        </div>
                        {/* Helper to render ±30 min offset dropdown */}
                        {(() => {
                            const offsetOpts = Array.from({ length: 61 }, (_, i) => i - 30);
                            const renderOffsetSelect = (value: number, onChange: (v: number) => void) => (
                                <select
                                    value={value}
                                    onChange={(e) => onChange(Number(e.target.value))}
                                    className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 h-16 text-xl text-white focus:border-mosque-gold focus:ring-1 focus:ring-mosque-gold outline-none transition-all cursor-pointer appearance-none"
                                >
                                    {offsetOpts.map(min => (
                                        <option key={min} value={min} className="bg-mosque-navy text-white">
                                            {min < 0 ? `−${Math.abs(min)} min` : min === 0 ? '0' : `+${min} min`}
                                        </option>
                                    ))}
                                </select>
                            );
                            return (
                                <div className="flex flex-col gap-4">
                                    {/* FAJR */}
                                    <div className="grid grid-cols-3 gap-4 items-center px-2">
                                        <span className="text-white/70 font-bold text-xl uppercase tracking-widest">FAJR</span>
                                        {renderOffsetSelect(fajrStartOffset, setFajrStartOffset)}
                                        {renderOffsetSelect(fajrIqamahOffset, setFajrIqamahOffset)}
                                    </div>
                                    {/* DHUHR */}
                                    <div className="grid grid-cols-3 gap-4 items-center px-2">
                                        <span className="text-white/70 font-bold text-xl uppercase tracking-widest">DHUHR</span>
                                        {renderOffsetSelect(dhuhrStartOffset, setDhuhrStartOffset)}
                                        {renderOffsetSelect(dhuhrIqamahOffset, setDhuhrIqamahOffset)}
                                    </div>
                                    {/* ASR */}
                                    <div className="grid grid-cols-3 gap-4 items-center px-2">
                                        <span className="text-white/70 font-bold text-xl uppercase tracking-widest">ASR</span>
                                        {renderOffsetSelect(asrStartOffset, setAsrStartOffset)}
                                        {renderOffsetSelect(asrIqamahOffset, setAsrIqamahOffset)}
                                    </div>
                                    {/* MAGHRIB */}
                                    <div className="grid grid-cols-3 gap-4 items-center px-2">
                                        <span className="text-white/70 font-bold text-xl uppercase tracking-widest">MAGHRIB</span>
                                        <div>{/* start = sunset offset below */}</div>
                                        {renderOffsetSelect(maghribOffset, setMaghribOffset)}
                                    </div>
                                    {/* ISHA */}
                                    <div className="grid grid-cols-3 gap-4 items-center px-2">
                                        <span className="text-white/70 font-bold text-xl uppercase tracking-widest">ISHA</span>
                                        {renderOffsetSelect(ishaStartOffset, setIshaStartOffset)}
                                        {renderOffsetSelect(ishaIqamahOffset, setIshaIqamahOffset)}
                                    </div>
                                    {/* SUNSET */}
                                    <div className="grid grid-cols-3 gap-4 items-center px-2">
                                        <span className="text-white/70 font-bold text-xl uppercase tracking-widest">SUNSET</span>
                                        {renderOffsetSelect(sunsetOffset, setSunsetOffset)}
                                        <div>{/* no iqamah */}</div>
                                    </div>
                                    {/* SUNRISE */}
                                    <div className="grid grid-cols-3 gap-4 items-center px-2">
                                        <span className="text-white/70 font-bold text-xl uppercase tracking-widest">SUNRISE</span>
                                        {renderOffsetSelect(sunriseOffset, setSunriseOffset)}
                                        <div>{/* no iqamah */}</div>
                                    </div>
                                </div>
                            );
                        })()}
                     </Card>

                     {/* Excel Schedule Editor — always visible */}
                     <div>
                         <button
                           onClick={() => {
                             if (!showScheduleEditor) {
                               // On first open: seed draft from excelSchedule if not already seeded
                               if (Object.keys(draftSchedule).length === 0 && Object.keys(excelSchedule).length > 0) {
                                 const snapshot = JSON.parse(JSON.stringify(excelSchedule));
                                 setDraftSchedule(snapshot);
                                 setOriginalScheduleSnapshot(snapshot);
                                 setHasUnsavedEdits(false);
                               }
                             }
                             setShowScheduleEditor(v => !v);
                           }}
                           className={`w-full flex items-center justify-between px-10 py-8 border rounded-2xl hover:bg-white/10 transition-all ${hasUnsavedEdits ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/10'}`}
                         >
                           <h4 className="text-3xl font-bold text-white flex items-center gap-4">
                             <Pencil className={`w-8 h-8 ${hasUnsavedEdits ? 'text-amber-400' : 'text-mosque-gold'}`} />
                             Edit Schedule Data
                             {hasUnsavedEdits && (
                               <span className="px-4 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xl font-bold rounded-lg">
                                 {pendingChangeCount} unsaved {pendingChangeCount === 1 ? 'change' : 'changes'}
                               </span>
                             )}
                           </h4>
                           <div className="flex items-center gap-6">
                             {Object.keys(excelSchedule).length > 0 ? (
                               <span className="text-white/40 text-xl">{Object.keys(excelSchedule).length} days loaded</span>
                             ) : (
                               <span className="text-white/30 text-xl italic">Auto-calculated</span>
                             )}
                             <ChevronRight className={`w-8 h-8 text-white/50 transition-transform ${showScheduleEditor ? 'rotate-90' : ''}`} />
                           </div>
                         </button>

                         {showScheduleEditor && (
                           <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                             {/* Month Navigator */}
                             <div className="flex items-center justify-between px-10 py-6 border-b border-white/10 bg-black/20">
                               <button
                                 onClick={() => navigateMonth(-1)}
                                 className="p-3 hover:bg-white/10 rounded-full text-white/70 transition-colors"
                               >
                                 <ChevronLeft className="w-8 h-8" />
                               </button>
                               <div className="text-center">
                                 <div className="text-3xl font-bold text-white">
                                   {MONTH_NAMES[scheduleEditorMonth - 1]} {scheduleEditorYear}
                                 </div>
                                 <div className="text-white/40 text-lg mt-1">{currentMonthEntries.length} days in this month</div>
                               </div>
                               <button
                                 onClick={() => navigateMonth(1)}
                                 className="p-3 hover:bg-white/10 rounded-full text-white/70 transition-colors"
                               >
                                 <ChevronRight className="w-8 h-8" />
                               </button>
                             </div>

                               <div className="overflow-x-auto">
                                 <table className="w-full min-w-max">
                                   <thead>
                                     <tr className="border-b border-white/10 bg-black/10">
                                       <th className="text-left px-6 py-4 text-white/50 font-bold uppercase tracking-widest text-base sticky left-0 bg-black/10">Date</th>
                                       {(['Fajr', 'Dhuhr', 'Asr', 'Isha'] as const).map(p => (
                                         <th key={p} className="text-left px-4 py-4 text-white/50 font-bold uppercase tracking-widest text-base" colSpan={2}>
                                           <div className="flex items-center gap-3">
                                             <span>{p}</span>
                                             <span className="text-white/20 font-normal text-sm normal-case tracking-normal">Start · Iqamah</span>
                                           </div>
                                         </th>
                                       ))}
                                       <th className="text-left px-4 py-4 text-white/50 font-bold uppercase tracking-widest text-base">
                                         <div>Jumu'ah<br /><span className="text-white/20 font-normal text-sm normal-case">Iqamah</span></div>
                                       </th>
                                     </tr>
                                   </thead>
                                   <tbody>
                                     {currentMonthEntries.map(([date, entry]) => {
                                       const dayNum = new Date(date + 'T12:00:00').getDate();
                                       const dayName = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
                                       const isFriday = new Date(date + 'T12:00:00').getDay() === 5;
                                       const origEntry = originalScheduleSnapshot[date];
                                       const isAutoCalcRow = !(draftSchedule[date] || excelSchedule[date]);

                                       // Auto-calc entry for this date — used as start-time fallback
                                       // when Excel row has no start times (Markaz format)
                                       const calcEntry = buildCalculatedEntry(date);

                                       // Inline time-select dropdown for editing
                                       const renderTimeSelect = (
                                         value: string,
                                         onConfirm: (v: string) => void
                                       ) => (
                                         <select
                                           autoFocus
                                           value={value || ''}
                                           onChange={(e) => onConfirm(e.target.value)}
                                           onBlur={() => setEditingCell(null)}
                                           className="w-28 bg-mosque-navy border-2 border-mosque-gold rounded-xl px-2 h-12 text-lg text-white outline-none cursor-pointer appearance-none"
                                         >
                                           {(() => {
                                             const opts: React.ReactElement[] = [];
                                             for (let h = 0; h < 24; h++) {
                                               for (let m = 0; m < 60; m += 1) {
                                                 const period = h < 12 ? 'AM' : 'PM';
                                                 const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
                                                 const dm = m.toString().padStart(2, '0');
                                                 const t = `${dh}:${dm} ${period}`;
                                                 opts.push(<option key={t} value={t} className="bg-mosque-navy">{t}</option>);
                                               }
                                             }
                                             return opts;
                                           })()}
                                         </select>
                                       );

                                       // Renders a single Start or Iqamah cell
                                       const renderFieldCell = (
                                         prayerKey: 'fajr' | 'dhuhr' | 'asr' | 'isha',
                                         field: 'start' | 'iqamah',
                                         currentVal: string | undefined,
                                         origVal: string | undefined,
                                         autoFallback?: string
                                       ) => {
                                         const isEditing = editingCell?.date === date && editingCell?.prayer === prayerKey && editingCell?.field === field;
                                         const isModified = hasUnsavedEdits && origVal !== undefined && currentVal !== origVal;
                                         const cellKey = `${date}-${prayerKey}-${field}`;
                                         // When no manual value is set, fall back to auto-calculated time for display
                                         // and as the time-selector default (so the dropdown opens at a sensible value)
                                         const displayVal = currentVal || autoFallback || '';
                                         const isAutoFallback = !currentVal && !!autoFallback;

                                         if (isEditing) {
                                           return (
                                             <td key={cellKey} className="px-2 py-2">
                                               {renderTimeSelect(displayVal, (v) => {
                                                 if (field === 'start') updateExcelStart(date, prayerKey, v);
                                                 else updateExcelIqamah(date, prayerKey, v);
                                               })}
                                             </td>
                                           );
                                         }

                                         return (
                                           <td
                                             key={cellKey}
                                             className={`px-3 py-2 cursor-pointer group transition-colors ${isModified ? 'bg-amber-500/10' : ''}`}
                                             onClick={() => setEditingCell({ date, prayer: prayerKey, field })}
                                           >
                                             <div className="flex items-center gap-1">
                                               {isModified ? (
                                                 <div className="flex flex-col">
                                                   <span className="font-mono text-lg text-amber-300 font-bold leading-tight">{currentVal || '—'}</span>
                                                   <span className="font-mono text-sm text-white/30 line-through leading-tight">{origVal}</span>
                                                 </div>
                                               ) : (
                                                 <span className={`font-mono text-lg leading-tight group-hover:text-mosque-gold transition-colors ${isAutoCalcRow || isAutoFallback ? 'text-white/50 italic' : 'text-white'}`}>
                                                   {displayVal || <span className="text-white/20">—</span>}
                                                 </span>
                                               )}
                                               <Pencil className="w-4 h-4 opacity-0 group-hover:opacity-50 shrink-0 transition-opacity text-mosque-gold ml-1" />
                                             </div>
                                             {(isAutoCalcRow || isAutoFallback) && !isModified && (
                                               <div className="text-xs text-white/25 mt-0.5">auto</div>
                                             )}
                                           </td>
                                         );
                                       };

                                       // Jumu'ah iqamah cell
                                       const renderJumuahCell = () => {
                                         const isEditing = editingCell?.date === date && editingCell?.prayer === 'jumuah' && editingCell?.field === 'iqamah';
                                         const currentVal = entry.jumuahIqamah;
                                         const origVal = origEntry?.jumuahIqamah;
                                         const isModified = hasUnsavedEdits && origVal !== undefined && currentVal !== origVal;
                                         const cellKey = `${date}-jumuah-iqamah`;

                                         if (isEditing) {
                                           return (
                                             <td key={cellKey} className="px-2 py-2">
                                               {renderTimeSelect(currentVal || '', (v) => updateExcelJumuahIqamah(date, v))}
                                             </td>
                                           );
                                         }

                                         if (!isFriday) {
                                           return <td key={cellKey} className="px-3 py-2 text-white/15 font-mono text-lg">—</td>;
                                         }

                                         return (
                                           <td
                                             key={cellKey}
                                             className={`px-3 py-2 cursor-pointer group transition-colors ${isModified ? 'bg-amber-500/10' : ''}`}
                                             onClick={() => setEditingCell({ date, prayer: 'jumuah', field: 'iqamah' })}
                                           >
                                             <div className="flex items-center gap-1">
                                               {isModified ? (
                                                 <div className="flex flex-col">
                                                   <span className="font-mono text-lg text-amber-300 font-bold leading-tight">{currentVal || '—'}</span>
                                                   <span className="font-mono text-sm text-white/30 line-through leading-tight">{origVal}</span>
                                                 </div>
                                               ) : (
                                                 <span className={`font-mono text-lg leading-tight group-hover:text-mosque-gold transition-colors ${isAutoCalcRow ? 'text-white/50 italic' : 'text-white'}`}>
                                                   {currentVal || <span className="text-white/20">—</span>}
                                                 </span>
                                               )}
                                               <Pencil className="w-4 h-4 opacity-0 group-hover:opacity-50 shrink-0 transition-opacity text-mosque-gold ml-1" />
                                             </div>
                                           </td>
                                         );
                                       };

                                       return (
                                         <tr
                                           key={date}
                                           className={`border-b border-white/5 hover:bg-white/5 transition-colors ${isFriday ? 'bg-mosque-gold/5' : ''} ${isAutoCalcRow ? 'opacity-80' : ''}`}
                                         >
                                           <td className="px-6 py-2 shrink-0 sticky left-0 bg-[#0f2445]">
                                             <div className="flex flex-col">
                                               <span className={`text-xl font-bold ${isFriday ? 'text-mosque-gold' : 'text-white'}`}>{dayNum}</span>
                                               <span className="text-white/40 text-base">{dayName}</span>
                                             </div>
                                           </td>
                                           {renderFieldCell('fajr',  'start',  entry.fajr?.start,  origEntry?.fajr?.start,  calcEntry.fajr.start)}
                                           {renderFieldCell('fajr',  'iqamah', entry.fajr?.iqamah, origEntry?.fajr?.iqamah)}
                                           {renderFieldCell('dhuhr', 'start',  entry.dhuhr?.start, origEntry?.dhuhr?.start, calcEntry.dhuhr.start)}
                                           {renderFieldCell('dhuhr', 'iqamah', entry.dhuhr?.iqamah,origEntry?.dhuhr?.iqamah)}
                                           {renderFieldCell('asr',   'start',  entry.asr?.start,   origEntry?.asr?.start,   calcEntry.asr.start)}
                                           {renderFieldCell('asr',   'iqamah', entry.asr?.iqamah,  origEntry?.asr?.iqamah)}
                                           {renderFieldCell('isha',  'start',  entry.isha?.start,  origEntry?.isha?.start,  calcEntry.isha.start)}
                                           {renderFieldCell('isha',  'iqamah', entry.isha?.iqamah, origEntry?.isha?.iqamah)}
                                           {renderJumuahCell()}
                                         </tr>
                                       );
                                     })}
                                   </tbody>
                                 </table>
                               </div>

                             {/* Action Bar — always visible at the bottom of the editor */}
                             <div className={`px-10 py-6 border-t flex items-center justify-between transition-colors ${hasUnsavedEdits ? 'border-amber-500/30 bg-amber-500/10' : 'border-white/10 bg-black/10'}`}>
                               <div className="flex items-center gap-3 text-lg">
                                 {hasUnsavedEdits ? (
                                   <>
                                     <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                                     <span className="text-amber-300 font-semibold text-xl">
                                       {pendingChangeCount} unsaved {pendingChangeCount === 1 ? 'change' : 'changes'} — not saved yet
                                     </span>
                                   </>
                                 ) : (
                                   <>
                                     <Pencil className="w-5 h-5 text-white/30" />
                                     <span className="text-white/30">Click any Start or Iqamah time to edit. Italicised times are auto-calculated. Maghrib is always auto-calculated from sunset.</span>
                                   </>
                                 )}
                               </div>
                               <div className="flex items-center gap-6">
                                 {hasUnsavedEdits && (
                                   <button
                                     onClick={handleDiscardSchedule}
                                     className="px-10 py-4 rounded-2xl border-2 border-white/20 text-white/60 text-xl font-semibold hover:border-white/40 hover:text-white transition-all"
                                   >
                                     Discard All Changes
                                   </button>
                                 )}
                                 <button
                                   onClick={handleSaveSchedule}
                                   disabled={!hasUnsavedEdits}
                                   className={`flex items-center gap-3 px-12 py-4 rounded-2xl text-xl font-bold transition-all ${hasUnsavedEdits ? 'bg-mosque-gold hover:bg-white text-mosque-navy shadow-lg' : 'bg-white/5 text-white/20 border border-white/10 cursor-not-allowed'}`}
                                 >
                                   <Save className="w-6 h-6" />
                                   {hasUnsavedEdits ? 'Save Changes' : 'Saved'}
                                 </button>
                               </div>
                             </div>
                           </div>
                         )}
                       </div>

                  </div>
                )}

                {/* --- ALERTS TAB --- */}
                {activeTab === 'announcements' && (
                  <div className="space-y-16">
                      <SectionHeader icon={AlertTriangle} title="Alerts & Ticker" description="Configure automatic schedule warnings and scrolling ticker messages." />
                      
                      {/* Auto Alert */}
                      <Card className={`${autoAlertSettings.enabled ? 'border-l-8 border-l-green-500' : ''}`}>
                          <div className="flex items-center justify-between mb-8">
                              <div>
                                  <h4 className="text-3xl font-bold text-white">Auto-Detect Changes</h4>
                                  <p className="text-white/50 text-xl mt-2">Scrolls a red alert if tomorrow's schedule differs from today's.</p>
                              </div>
                              <Toggle checked={autoAlertSettings.enabled} onChange={(v) => setAutoAlertSettings({...autoAlertSettings, enabled: v})} />
                          </div>
                          
                          {autoAlertSettings.enabled && (
                              <div className="grid grid-cols-2 gap-12 pt-8 border-t border-white/10 animate-in fade-in">
                                  <div>
                                      <label className={labelBase}>Message Template</label>
                                      <input 
                                        type="text" 
                                        value={autoAlertSettings.template}
                                        onChange={(e) => setAutoAlertSettings({...autoAlertSettings, template: e.target.value})}
                                        className={inputBase} 
                                      />
                                      <p className="text-white/30 text-lg mt-3">Placeholders: <code>{'{prayers}'}</code> = prayer name &nbsp;|&nbsp; <code>{'{new time}'}</code> = tomorrow's iqamah time</p>
                                  </div>
                                  <div className="flex items-end gap-8">
                                       <div className="flex-1">
                                           <label className={labelBase}>Color</label>
                                           <ColorPickerPreset value={autoAlertSettings.color} onChange={(c) => setAutoAlertSettings({...autoAlertSettings, color: c})} />
                                       </div>
                                       <div className="flex-1">
                                           <label className={labelBase}>Animation</label>
                                           <select 
                                              value={autoAlertSettings.animation} 
                                              onChange={(e) => setAutoAlertSettings({...autoAlertSettings, animation: e.target.value as any})}
                                              className={inputBase}
                                           >
                                              <option value="pulse" className="bg-mosque-navy">Pulse</option>
                                              <option value="blink" className="bg-mosque-navy">Blink</option>
                                              <option value="none" className="bg-mosque-navy">None</option>
                                           </select>
                                       </div>
                                  </div>
                              </div>
                          )}
                      </Card>

                      {/* Ticker Announcements */}
                      <div>
                          <div className="flex items-center justify-between mb-8">
                              <h4 className="text-3xl font-bold text-white">Ticker Announcements</h4>
                              <button onClick={() => openEditor()} className="flex items-center gap-4 bg-mosque-gold text-mosque-navy px-8 py-4 rounded-2xl text-xl font-bold hover:bg-white transition-colors">
                                  <Plus className="w-6 h-6" /> Add Message
                              </button>
                          </div>

                          {isEditorOpen && (
                              <div className="bg-black/40 border border-mosque-gold rounded-3xl p-10 mb-10 shadow-2xl animate-in slide-in-from-top-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-8">
                                      <div className="md:col-span-2">
                                          <label className={labelBase}>Message Text</label>
                                          <input 
                                            autoFocus
                                            type="text" 
                                            value={newItem.text} 
                                            onChange={(e) => setNewItem({...newItem, text: e.target.value})} 
                                            className={inputBase} 
                                          />
                                      </div>
                                      <div>
                                          <label className={labelBase}>Text Color</label>
                                          <ColorPickerPreset value={newItem.color} onChange={(c) => setNewItem({...newItem, color: c})} />
                                      </div>
                                      <div>
                                          <label className={labelBase}>Effect</label>
                                          <div className="flex gap-4">
                                              {['none', 'pulse', 'blink'].map(opt => (
                                                  <button
                                                    key={opt}
                                                    onClick={() => setNewItem({...newItem, animation: opt as any})}
                                                    className={`flex-1 py-4 rounded-xl capitalize text-xl border ${newItem.animation === opt ? 'bg-mosque-gold text-mosque-navy border-mosque-gold font-bold' : 'bg-transparent text-white/50 border-white/10 hover:border-white/30'}`}
                                                  >
                                                      {opt}
                                                  </button>
                                              ))}
                                          </div>
                                      </div>
                                  </div>
                                  <div className="flex justify-end gap-6 pt-6 border-t border-white/10">
                                      <button onClick={closeEditor} className="px-10 py-4 rounded-2xl text-white/50 text-xl hover:bg-white/5">Cancel</button>
                                      <button onClick={handleSaveItem} className="px-12 py-4 bg-mosque-gold text-mosque-navy font-bold text-xl rounded-2xl hover:bg-white">Save Message</button>
                                  </div>
                              </div>
                          )}

                          <div className="space-y-4">
                              {announcement.items.length === 0 && <div className="text-white/30 text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10 text-xl">No messages in ticker. Add one above.</div>}
                              {announcement.items.map((item, idx) => (
                                  <div key={item.id} className="bg-white/10 border border-white/10 rounded-2xl p-6 flex items-center justify-between group hover:border-white/20 hover:bg-white/15 transition-all shadow-sm">
                                      <div className="flex items-center gap-8">
                                          <div className="w-14 h-14 rounded-full bg-black/40 flex items-center justify-center text-xl font-bold text-white/70 border border-white/10 shadow-inner">{idx + 1}</div>
                                          
                                          <div className="flex flex-col gap-2">
                                              <span className="text-2xl text-white font-medium tracking-wide drop-shadow-sm">{item.text}</span>
                                              
                                              <div className="flex items-center gap-4">
                                                  {/* Color Indicator */}
                                                  <div className="flex items-center gap-3 bg-black/30 px-4 py-1.5 rounded-lg border border-white/5">
                                                      <div className="w-5 h-5 rounded-full border border-white/30 shadow-sm" style={{ backgroundColor: item.color }}></div>
                                                      <span className="text-base text-white/50 uppercase font-mono tracking-wider">{item.color}</span>
                                                  </div>

                                                  {/* Animation Badge */}
                                                  {item.animation !== 'none' && (
                                                      <span className="px-3 py-1.5 bg-mosque-gold/20 text-mosque-gold rounded-lg text-sm uppercase font-bold tracking-wider border border-mosque-gold/20">
                                                          {item.animation}
                                                      </span>
                                                  )}
                                              </div>
                                          </div>
                                      </div>
                                      
                                      <div className="flex gap-4 opacity-100"> 
                                          {/* Keep opacity 100 for better usability/discoverability on touch screens or large displays where hover might be tricky or simply for clarity */}
                                          <button onClick={() => openEditor(item)} className="p-4 hover:bg-white/20 rounded-xl text-blue-300 transition-colors bg-black/20 border border-white/5"><Edit2 className="w-7 h-7" /></button>
                                          <button onClick={() => deleteAnnouncementItem(item.id)} className="p-4 hover:bg-white/20 rounded-xl text-red-400 transition-colors bg-black/20 border border-white/5"><Trash2 className="w-7 h-7" /></button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
                )}

                {/* --- SILENT ALERT TAB --- */}
                {activeTab === 'silentAlert' && (
                    <div className="space-y-16">
                        <SectionHeader icon={PhoneOff} title="Mobile Silent Alert" description="Display a full-screen or panel warning before Iqamah." />
                        
                        <Card className="flex items-center justify-between border-l-8 border-l-red-500">
                             <div>
                                 <h4 className="text-3xl font-bold text-white">Enable Feature</h4>
                                 <p className="text-white/50 text-xl">When enabled, the alert will trigger automatically based on settings below.</p>
                             </div>
                             <Toggle checked={mobileAlertSettings.enabled} onChange={(v) => setMobileAlertSettings({...mobileAlertSettings, enabled: v})} />
                        </Card>

                        <Card className="flex items-center justify-between border-l-8 border-l-amber-500">
                             <div>
                                 <h4 className="text-3xl font-bold text-white">Disable for Jumuah</h4>
                                 <p className="text-white/50 text-xl">When enabled, the alert will NOT trigger before Jumuah prayer.</p>
                             </div>
                             <Toggle checked={mobileAlertSettings.disableForJumuah} onChange={(v) => setMobileAlertSettings({...mobileAlertSettings, disableForJumuah: v})} />
                        </Card>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                            {/* Behavior */}
                            <Card>
                                <h4 className="text-2xl font-bold text-mosque-gold uppercase tracking-widest mb-8">Behavior</h4>
                                
                                <div className="space-y-10">
                                    <div>
                                        <label className={labelBase}>Alert Mode</label>
                                        <div className="bg-black/30 p-2 rounded-2xl flex">
                                            {[
                                                { id: 'panel', label: 'Panel Only', icon: LayoutTemplate },
                                                { id: 'fullscreen', label: 'Full Screen', icon: Monitor }
                                            ].map(opt => (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => setMobileAlertSettings({...mobileAlertSettings, mode: opt.id as any})}
                                                    className={`flex-1 flex items-center justify-center gap-3 py-5 rounded-xl text-xl transition-all ${mobileAlertSettings.mode === opt.id ? 'bg-mosque-gold text-mosque-navy shadow-md font-bold' : 'text-white/50 hover:text-white'}`}
                                                >
                                                    <opt.icon className="w-6 h-6" /> {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelBase}>Trigger Time</label>
                                        <select 
                                            value={mobileAlertSettings.triggerMinutes}
                                            onChange={(e) => setMobileAlertSettings({...mobileAlertSettings, triggerMinutes: Number(e.target.value)})}
                                            className={inputBase}
                                        >
                                            <option value={0.5} className="bg-mosque-navy">30 Seconds before</option>
                                            <option value={1} className="bg-mosque-navy">1 Minute before</option>
                                            <option value={2} className="bg-mosque-navy">2 Minutes before</option>
                                            <option value={5} className="bg-mosque-navy">5 Minutes before</option>
                                        </select>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                           <label className={`${labelBase} mb-0`}>Audio Alert</label>
                                           <Toggle checked={mobileAlertSettings.beepEnabled} onChange={(v) => setMobileAlertSettings({...mobileAlertSettings, beepEnabled: v})} />
                                        </div>
                                        {mobileAlertSettings.beepEnabled && (
                                            <div className="bg-black/20 p-6 rounded-2xl space-y-6 animate-in fade-in">
                                                <div>
                                                    <span className="text-sm text-white/40 uppercase font-bold tracking-wider">Tone Style</span>
                                                    <div className="flex gap-3 mt-3">
                                                        {['single', 'double', 'soft', 'sonar'].map(t => (
                                                            <button 
                                                                key={t}
                                                                onClick={() => setMobileAlertSettings({...mobileAlertSettings, beepType: t as any})}
                                                                className={`px-4 py-2 rounded-lg text-sm uppercase font-bold border ${mobileAlertSettings.beepType === t ? 'bg-white text-mosque-navy border-white' : 'border-white/10 text-white/40'}`}
                                                            >
                                                                {t}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex justify-between text-sm text-white/40 uppercase font-bold mb-2">
                                                        <span>Volume</span>
                                                        <span>{mobileAlertSettings.beepVolume}%</span>
                                                    </div>
                                                    <input 
                                                        type="range" min="0" max="100" 
                                                        value={mobileAlertSettings.beepVolume} 
                                                        onChange={(e) => setMobileAlertSettings({...mobileAlertSettings, beepVolume: Number(e.target.value)})}
                                                        className="w-full accent-mosque-gold h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>

                            {/* Appearance */}
                            <Card>
                                <h4 className="text-2xl font-bold text-mosque-gold uppercase tracking-widest mb-8">Visuals</h4>
                                
                                <div className="space-y-8">
                                    <div>
                                        <label className={labelBase}>Message Text</label>
                                        <div className="grid grid-cols-1 gap-3 mb-4">
                                            {ALERT_MESSAGES.slice(0, 2).map((msg, i) => (
                                                <button key={i} onClick={() => setMobileAlertSettings({...mobileAlertSettings, text: msg})} className="text-left text-lg text-white/60 hover:text-white truncate p-3 hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10">{msg}</button>
                                            ))}
                                        </div>
                                        <input type="text" value={mobileAlertSettings.text} onChange={(e) => setMobileAlertSettings({...mobileAlertSettings, text: e.target.value})} className={inputBase} />
                                    </div>

                                    <div>
                                        <label className={labelBase}>Background Color</label>
                                        <ColorPickerPreset value={mobileAlertSettings.backgroundColor} onChange={(c) => setMobileAlertSettings({...mobileAlertSettings, backgroundColor: c})} />
                                    </div>

                                    <div>
                                        <label className={labelBase}>Icon</label>
                                        <div className="flex gap-6">
                                            {['phone-off', 'shhh', 'align-rows'].map(icon => (
                                                <button
                                                    key={icon}
                                                    onClick={() => setMobileAlertSettings({...mobileAlertSettings, icon: icon as any})}
                                                    className={`p-6 rounded-2xl border transition-all ${mobileAlertSettings.icon === icon ? 'bg-white text-mosque-navy border-white' : 'bg-black/20 text-white/40 border-white/5 hover:bg-white/5'}`}
                                                >
                                                    {icon === 'phone-off' ? <PhoneOff className="w-8 h-8" /> : icon === 'shhh' ? <Volume2 className="w-8 h-8" /> : <LayoutTemplate className="w-8 h-8" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-10 pt-8 border-t border-white/10">
                                    <button onClick={handlePreviewToggle} className="w-full py-6 bg-white/5 hover:bg-white/10 text-white text-xl font-bold rounded-2xl flex items-center justify-center gap-4 border border-white/10">
                                        <Eye className="w-8 h-8" /> Test Preview (5s)
                                    </button>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {/* --- SLIDESHOW TAB --- */}
                {activeTab === 'slideshow' && (
                    <div className="space-y-16">
                         <SectionHeader icon={Layers} title="Right Panel Content" description="Manage the rotating slides displayed in the right panel." />

                         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                             {slidesConfig.map((slide) => {
                                 const isExpanded = expandedSlideId === slide.id;
                                 // RENAME: 'Promo Slide' -> 'Event Slide'
                                 const typeLabel = slide.type === 'CLOCK' ? 'Digital Clock' : slide.type === 'ANNOUNCEMENT' ? 'Event Slide' : 'Weekly Schedule';
                                 
                                 return (
                                     <Card key={slide.id} className={`relative p-0 overflow-hidden group ${isExpanded ? 'col-span-full xl:col-span-2 row-span-2 border-mosque-gold' : ''}`}>
                                         {/* Card Header / Preview */}
                                         <div className="p-8 bg-gradient-to-b from-white/5 to-transparent">
                                             <div className="flex items-center justify-between mb-6">
                                                 <div className={`p-4 rounded-xl ${slide.type === 'CLOCK' ? 'bg-blue-500/20 text-blue-400' : slide.type === 'ANNOUNCEMENT' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                                     {slide.type === 'CLOCK' ? <Clock className="w-10 h-10" /> : slide.type === 'ANNOUNCEMENT' ? <MessageSquare className="w-10 h-10" /> : <CalendarIcon className="w-10 h-10" />}
                                                 </div>
                         {slide.type === 'CLOCK' ? (
                            <div className="flex items-center gap-3 px-5 py-3 bg-white/5 rounded-full border border-white/5 cursor-not-allowed" title="This slide is mandatory">
                                <Lock className="w-5 h-5 text-mosque-gold" />
                                <span className="text-sm font-bold text-white/40 uppercase tracking-widest">Always On</span>
                            </div>
                         ) : (
                            <Toggle checked={slide.enabled} onChange={(v) => updateSlideConfig(slide.id, { enabled: v })} />
                         )}
                                             </div>
                                             <h4 className="text-3xl font-bold text-white mb-2">{typeLabel}</h4>
                                             <div className="flex items-center justify-between">
                                                <p className="text-white/40 text-xl">{slide.duration} Seconds</p>
                                                <button onClick={() => setExpandedSlideId(isExpanded ? null : slide.id)} className="text-sm font-bold uppercase tracking-wider text-mosque-gold hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-lg">
                                                    {isExpanded ? 'Close Config' : 'Configure'}
                                                </button>
                                             </div>
                                         </div>

                                         {/* Config Body */}
                                         {isExpanded && (
                                             <div className="p-10 border-t border-white/10 bg-black/20 animate-in slide-in-from-top-2">
                                                 <div className="space-y-8">
                                                     <div>
                                                         <label className={labelBase}>Duration (Seconds)</label>
                                                         <div className="flex items-center gap-6">
                                                             <input type="range" min="5" max="60" step="5" value={slide.duration} onChange={(e) => updateSlideConfig(slide.id, { duration: Number(e.target.value) })} className="flex-1 accent-mosque-gold h-4 bg-white/10 rounded-xl cursor-pointer" />
                                                             <span className="w-20 text-center font-mono text-3xl text-white">{slide.duration}s</span>
                                                         </div>
                                                     </div>

                                                     {slide.type === 'ANNOUNCEMENT' && (
                                                         <>
                                                             <div>
                                                                 <label className={labelBase}>Content</label>
                                                                 <textarea 
                                                                    value={(slide as AnnouncementSlideConfig).content}
                                                                    onChange={(e) => updateSlideConfig(slide.id, { content: e.target.value } as any)}
                                                                    className={`${inputBase} h-40 py-4 leading-relaxed`}
                                                                    placeholder="Type your slide text here..."
                                                                 />
                                                             </div>
                                                             <div className="grid grid-cols-2 gap-12">
                                                                 <div>
                                                                     <label className={labelBase}>Background</label>
                                                                     <ColorPickerPreset value={(slide as AnnouncementSlideConfig).styles.backgroundColor} onChange={(c) => updateSlideConfig(slide.id, { backgroundColor: c })} />
                                                                 </div>
                                                                 <div>
                                                                     <label className={labelBase}>Text Color</label>
                                                                     <ColorPickerPreset value={(slide as AnnouncementSlideConfig).styles.textColor} onChange={(c) => updateSlideConfig(slide.id, { textColor: c })} />
                                                                 </div>
                                                             </div>
                                                         </>
                                                     )}
                                                 </div>
                                             </div>
                                         )}
                                     </Card>
                                 );
                             })}
                         </div>
                    </div>
                )}

                {/* --- THEME TAB --- */}
                {activeTab === 'customization' && (
                    <div className="space-y-16">
                         <SectionHeader icon={Palette} title="Appearance" description="Customize the visual theme and layout colors." />

                         <Card>
                             <h4 className="text-3xl font-bold text-white mb-8">Background Theme</h4>
                             <div className="grid grid-cols-3 gap-8">
                                 {[
                                     { id: 'starry', name: 'Deep Space', icon: Sparkles, desc: 'Animated starry night' },
                                     { id: 'arabesque', name: 'Royal Arabesque', icon: Moon, desc: 'Classic elegance' },
                                     { id: 'lattice', name: 'Golden Lattice', icon: Layers, desc: 'Geometric depth' }
                                 ].map((theme) => (
                                     <button
                                         key={theme.id}
                                         onClick={() => setCurrentTheme(theme.id)}
                                         className={`relative h-64 rounded-3xl border-2 overflow-hidden group transition-all duration-300 text-left ${currentTheme === theme.id ? 'border-mosque-gold shadow-[0_0_30px_rgba(212,175,55,0.2)]' : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'}`}
                                     >
                                         <div className={`absolute inset-0 ${theme.id === 'starry' ? 'bg-black' : theme.id === 'arabesque' ? 'bg-[#0B1E3B]' : 'bg-[#1a2e4d]'}`}></div>
                                         <div className="absolute inset-0 p-8 flex flex-col justify-end z-10 bg-gradient-to-t from-black/80 to-transparent">
                                             <theme.icon className={`w-12 h-12 mb-4 ${currentTheme === theme.id ? 'text-mosque-gold' : 'text-white/50'}`} />
                                             <span className="text-3xl font-bold text-white">{theme.name}</span>
                                             <span className="text-white/50 text-xl mt-1">{theme.desc}</span>
                                         </div>
                                         {currentTheme === theme.id && <div className="absolute top-6 right-6 bg-mosque-gold text-mosque-navy p-2 rounded-full"><CheckCircle2 className="w-8 h-8" /></div>}
                                     </button>
                                 ))}
                             </div>
                         </Card>

                         <Card>
                             <h4 className="text-3xl font-bold text-white mb-8">Footer Style</h4>
                             <div className="grid grid-cols-2 gap-8">
                                 <button onClick={() => setTickerBg('white')} className={`h-32 rounded-3xl border-2 flex items-center px-10 gap-6 transition-all ${tickerBg === 'white' ? 'border-mosque-gold bg-white' : 'border-white/10 bg-white/50'}`}>
                                     <div className="w-16 h-16 rounded-full bg-mosque-gold flex items-center justify-center text-mosque-navy shadow-sm"><Type className="w-8 h-8" /></div>
                                     <div className="text-left">
                                         <div className="font-bold text-mosque-navy uppercase tracking-wider text-xl">High Contrast</div>
                                         <div className="text-mosque-navy/60 text-lg">White bg, Dark text</div>
                                     </div>
                                 </button>
                                 <button onClick={() => setTickerBg('navy')} className={`h-32 rounded-3xl border-2 flex items-center px-10 gap-6 transition-all ${tickerBg === 'navy' ? 'border-mosque-gold bg-mosque-navy' : 'border-white/10 bg-mosque-navy/50'}`}>
                                     <div className="w-16 h-16 rounded-full bg-mosque-gold flex items-center justify-center text-mosque-navy shadow-sm"><Type className="w-8 h-8" /></div>
                                     <div className="text-left">
                                         <div className="font-bold text-white uppercase tracking-wider text-xl">Seamless Dark</div>
                                         <div className="text-white/60 text-lg">Navy bg, White text</div>
                                     </div>
                                 </button>
                             </div>
                         </Card>
                    </div>
                )}

                {/* --- HIJRI DATE TAB --- */}
                {activeTab === 'hijri' && (() => {
                  const status = getHijriAnchorStatus(hijriSettings, new Date());
                  const liveDate = hijriSettings.monthName && hijriSettings.year && hijriSettings.monthStartGregorian
                    ? getHijriDateFromSettings(hijriSettings, new Date())
                    : null;

                  // Compute today's Hijri day from the stored anchor
                  const computeCurrentDay = (): number => {
                    if (!hijriSettings.monthStartGregorian) return 1;
                    const todayStr = toEasternDateStr(new Date());
                    const [sy, sm, sd] = hijriSettings.monthStartGregorian.split('-').map(Number);
                    const [ty, tm, td] = todayStr.split('-').map(Number);
                    const startMs = new Date(sy, sm - 1, sd).getTime();
                    const todayMs = new Date(ty, tm - 1, td).getTime();
                    return Math.round((todayMs - startMs) / 86400000) + 1;
                  };

                  // Compute monthStartGregorian = today − (day − 1)
                  const anchorFromDay = (day: number): string => {
                    const todayStr = toEasternDateStr(new Date());
                    const [ty, tm, td] = todayStr.split('-').map(Number);
                    const anchor = new Date(ty, tm - 1, td);
                    anchor.setDate(anchor.getDate() - (day - 1));
                    return `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}-${String(anchor.getDate()).padStart(2, '0')}`;
                  };

                  // When user sets "today is day N", recompute anchor
                  const handleDayChange = (newDay: number) => {
                    setHijriSettings({ ...hijriSettings, monthStartGregorian: anchorFromDay(newDay) });
                  };

                  const currentDay = computeCurrentDay();
                  const maxDay = hijriSettings.monthLength || 30;

                  return (
                    <div className="space-y-16">
                      <SectionHeader icon={Moon} title="Hijri Date" description="Set today's Islamic date — all fields auto-save instantly to every screen." />

                      {/* Main settings card */}
                      <Card>
                        <h4 className="text-3xl font-bold text-white mb-10">Current Islamic Date</h4>

                        <div className="grid grid-cols-2 gap-10 mb-10">
                          {/* Month selector */}
                          <div>
                            <label className="block text-xl font-bold uppercase tracking-widest text-mosque-gold/90 mb-4">Month</label>
                            <select
                              value={hijriSettings.monthName}
                              onChange={e => {
                                const idx = HIJRI_MONTHS.indexOf(e.target.value as any);
                                const newStart = hijriSettings.monthStartGregorian || anchorFromDay(currentDay);
                                setHijriSettings({ ...hijriSettings, monthName: e.target.value, monthNumber: idx + 1, monthStartGregorian: newStart });
                              }}
                              className="w-full bg-black/30 border border-white/10 rounded-2xl px-8 h-20 text-2xl text-white focus:border-mosque-gold focus:ring-1 focus:ring-mosque-gold outline-none transition-all cursor-pointer appearance-none"
                            >
                              <option value="">— Select month —</option>
                              {HIJRI_MONTHS.map((m, i) => (
                                <option key={m} value={m} className="bg-mosque-navy text-white">{i + 1}. {m}</option>
                              ))}
                            </select>
                          </div>

                          {/* Year dropdown */}
                          <div>
                            <label className="block text-xl font-bold uppercase tracking-widest text-mosque-gold/90 mb-4">Hijri Year</label>
                            <select
                              value={hijriSettings.year || ''}
                              onChange={e => {
                                const newStart = hijriSettings.monthStartGregorian || anchorFromDay(currentDay);
                                setHijriSettings({ ...hijriSettings, year: Number(e.target.value), monthStartGregorian: newStart });
                              }}
                              className="w-full bg-black/30 border border-white/10 rounded-2xl px-8 h-20 text-2xl text-white focus:border-mosque-gold focus:ring-1 focus:ring-mosque-gold outline-none transition-all cursor-pointer appearance-none"
                            >
                              <option value="">— Select year —</option>
                              {Array.from({ length: 21 }, (_, i) => 1440 + i).map(yr => (
                                <option key={yr} value={yr} className="bg-mosque-navy text-white">{yr} AH</option>
                              ))}
                            </select>
                          </div>

                          {/* Today's Hijri Day */}
                          <div>
                            <label className="block text-xl font-bold uppercase tracking-widest text-mosque-gold/90 mb-4">Today is Day</label>
                            <select
                              value={Math.min(Math.max(currentDay, 1), maxDay)}
                              onChange={e => handleDayChange(Number(e.target.value))}
                              className="w-full bg-black/30 border border-white/10 rounded-2xl px-8 h-20 text-2xl text-white focus:border-mosque-gold focus:ring-1 focus:ring-mosque-gold outline-none transition-all cursor-pointer appearance-none"
                            >
                              {Array.from({ length: maxDay }, (_, i) => i + 1).map(d => (
                                <option key={d} value={d} className="bg-mosque-navy text-white">Day {d}</option>
                              ))}
                            </select>
                            <p className="text-white/40 text-lg mt-2">Select what day of the Islamic month it is today</p>
                          </div>

                          {/* Month Length dropdown */}
                          <div>
                            <label className="block text-xl font-bold uppercase tracking-widest text-mosque-gold/90 mb-4">Days in This Month</label>
                            <select
                              value={hijriSettings.monthLength}
                              onChange={e => setHijriSettings({ ...hijriSettings, monthLength: Number(e.target.value) as 29 | 30 })}
                              className="w-full bg-black/30 border border-white/10 rounded-2xl px-8 h-20 text-2xl text-white focus:border-mosque-gold focus:ring-1 focus:ring-mosque-gold outline-none transition-all cursor-pointer appearance-none"
                            >
                              <option value={29} className="bg-mosque-navy text-white">29 days</option>
                              <option value={30} className="bg-mosque-navy text-white">30 days</option>
                            </select>
                            <p className="text-white/40 text-lg mt-2">As announced by CHC after moon sighting</p>
                          </div>
                        </div>

                        {/* Live status */}
                        <div className={`rounded-2xl p-8 border ${status.isActive ? 'bg-green-900/20 border-green-500/30' : status.isExpired ? 'bg-red-900/20 border-red-500/30' : 'bg-white/5 border-white/10'}`}>
                          <div className="flex items-center gap-4 mb-4">
                            <div className={`w-3 h-3 rounded-full ${status.isActive ? 'bg-green-400' : status.isExpired ? 'bg-red-400' : 'bg-white/30'}`}></div>
                            <span className="text-xl font-bold uppercase tracking-widest text-white/60">
                              {!hijriSettings.monthStartGregorian || !hijriSettings.monthName || !hijriSettings.year
                                ? 'Not configured — using automatic calculation'
                                : status.isActive ? `Active · Day ${status.dayNumber} of ${hijriSettings.monthLength}`
                                : status.isExpired ? 'Expired · Update for the new month'
                                : 'Not started yet'}
                            </span>
                          </div>
                          <div className="text-5xl font-bold font-serif text-white tracking-wide">
                            {liveDate ?? <span className="text-white/30 text-4xl">No date configured</span>}
                          </div>
                          <p className="text-white/40 text-lg mt-4">Changes auto-save and sync to all screens instantly.</p>
                        </div>
                      </Card>

                      {/* How-to card */}
                      <Card>
                        <div className="flex items-start gap-8">
                          <div className="p-5 rounded-2xl bg-mosque-gold/10 border border-mosque-gold/20 text-mosque-gold shrink-0">
                            <Info className="w-10 h-10" />
                          </div>
                          <div>
                            <h4 className="text-3xl font-bold text-white mb-6">How to update each month</h4>
                            <ol className="space-y-4 text-white/70 text-2xl list-decimal list-inside leading-relaxed">
                              <li>Wait for the <span className="text-mosque-gold font-semibold">CHC moon-sighting announcement</span></li>
                              <li>Select the new <span className="text-white font-semibold">Month</span> and <span className="text-white font-semibold">Year</span> from the dropdowns</li>
                              <li>Set <span className="text-white font-semibold">"Today is Day"</span> — choose Day 1 on the first day of the new month</li>
                              <li>Choose <span className="text-white font-semibold">29 or 30 days</span> as announced by CHC</li>
                              <li>All changes save automatically — no button needed</li>
                            </ol>
                          </div>
                        </div>
                      </Card>
                    </div>
                  );
                })()}

                </div>
             </div>
        </div>
      </div>
    </div>
  );
};
