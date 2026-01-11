import React, { useState } from 'react';
import { X, Settings as SettingsIcon, Upload, Calendar as CalendarIcon, Plus, Trash2, Edit2, AlertTriangle, LayoutDashboard, MessageSquare, Palette, CheckCircle2, Zap, Type, ChevronLeft, ChevronRight, Moon, Clock, Sparkles, Wind, PlayCircle, StopCircle, Layers, Lock, PhoneOff, Eye, Volume2, Save, Music, Monitor, LayoutTemplate } from 'lucide-react';
import { Announcement, ExcelDaySchedule, ManualOverride, AnnouncementItem, SlideConfig, AnnouncementSlideConfig, AutoAlertSettings, MobileSilentAlertSettings } from '../types';
import { ALERT_MESSAGES } from '../constants';
import * as XLSX from 'xlsx';
import { saveExcelScheduleToDatabase } from '../utils/database';
import { isSupabaseConfigured } from '../utils/supabase';

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
  
  autoAlertSettings: AutoAlertSettings;
  setAutoAlertSettings: (settings: AutoAlertSettings) => void;
  
  tickerBg: 'white' | 'navy';
  setTickerBg: (bg: 'white' | 'navy') => void;

  slidesConfig: SlideConfig[];
  setSlidesConfig: (config: SlideConfig[]) => void;

  mobileAlertSettings: MobileSilentAlertSettings;
  setMobileAlertSettings: (settings: MobileSilentAlertSettings) => void;
  setIsPreviewAlert: (isPreview: boolean) => void;
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

// --- Calendar Component (Refined) ---
interface RangeCalendarProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}

const RangeCalendar: React.FC<RangeCalendarProps> = ({ startDate, endDate, onChange }) => {
  const [currentDate, setCurrentDate] = useState(() => startDate ? new Date(startDate) : new Date());
  const [isSelectingEnd, setIsSelectingEnd] = useState(false);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const handleDayClick = (day: number) => {
    const clickedDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (!isSelectingEnd) {
      onChange(clickedDateStr, clickedDateStr);
      setIsSelectingEnd(true);
    } else {
      if (clickedDateStr < startDate) {
         onChange(clickedDateStr, startDate);
      } else {
         onChange(startDate, clickedDateStr);
      }
      setIsSelectingEnd(false);
    }
  };

  const isSelected = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateStr === startDate || dateStr === endDate;
  };

  const isInRange = (day: number) => {
    if (!startDate || !endDate) return false;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateStr > startDate && dateStr < endDate;
  };

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(year, month + offset, 1));
  };

  return (
    <div className="bg-black/20 border border-white/10 rounded-3xl p-8 select-none shadow-inner w-full">
       <div className="flex items-center justify-between mb-8">
         <button onClick={() => changeMonth(-1)} className="p-4 hover:bg-white/10 rounded-full text-white/70 transition-colors"><ChevronLeft className="w-8 h-8" /></button>
         <div className="font-bold text-white text-3xl tracking-wide uppercase">{monthNames[month]} {year}</div>
         <button onClick={() => changeMonth(1)} className="p-4 hover:bg-white/10 rounded-full text-white/70 transition-colors"><ChevronRight className="w-8 h-8" /></button>
       </div>
       
       <div className="grid grid-cols-7 gap-4 mb-4">
         {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
           <div key={d} className="text-center text-xl text-white/40 uppercase font-bold">{d}</div>
         ))}
       </div>
       
       <div className="grid grid-cols-7 gap-4">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
             const day = i + 1;
             const selected = isSelected(day);
             const inRange = isInRange(day);
             
             let bgClass = "bg-white/5 text-white/70 hover:bg-white/20";
             if (selected) bgClass = "bg-mosque-gold text-mosque-navy font-bold shadow-lg scale-105 z-10";
             else if (inRange) bgClass = "bg-mosque-gold/20 text-mosque-gold";

             return (
               <button 
                 key={day} 
                 onClick={() => handleDayClick(day)}
                 className={`h-16 w-full rounded-xl flex items-center justify-center text-2xl transition-all duration-200 ${bgClass}`}
               >
                 {day}
               </button>
             );
          })}
       </div>
       <div className="mt-6 flex items-center justify-between text-xl text-white/40 border-t border-white/5 pt-6">
         <span>{isSelectingEnd ? "Select end date..." : "Select start date"}</span>
         {startDate && (
           <span className="font-mono text-mosque-gold text-2xl">
              {startDate === endDate ? startDate : `${startDate} → ${endDate}`}
           </span>
         )}
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
  autoAlertSettings, setAutoAlertSettings,
  tickerBg, setTickerBg,
  slidesConfig, setSlidesConfig,
  mobileAlertSettings, setMobileAlertSettings,
  setIsPreviewAlert
}) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'announcements' | 'customization' | 'slideshow' | 'silentAlert'>('schedule');
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [expandedPrayer, setExpandedPrayer] = useState<string | null>(null);
  const [newOverride, setNewOverride] = useState<Partial<ManualOverride>>({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    start: '',
    iqamah: ''
  });
  
  // Announcement Editor State
  const defaultItemState = { text: "", color: "#FFFFFF", animation: 'none' as const };
  const [newItem, setNewItem] = useState<Omit<AnnouncementItem, 'id'>>(defaultItemState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Slideshow Editor State
  const [expandedSlideId, setExpandedSlideId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePreviewToggle = () => {
      setIsPreviewAlert(true);
      onClose();
      setTimeout(() => {
          setIsPreviewAlert(false);
      }, 5000);
  };

  const convertExcelTime = (val: any): string => {
    if (!val) return "";
    let timeStr = String(val);
    if (typeof val === 'number') {
        const totalMinutes = Math.round(val * 24 * 60);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        timeStr = `${h}:${m < 10 ? '0' : ''}${m}`;
    }
    const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
        let h = parseInt(match[1]);
        const m = match[2];
        const ampm = h >= 12 ? 'PM' : 'AM';
        if (h > 12) h -= 12;
        if (h === 0) h = 12;
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
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row[0]) continue;
        let dateKey = "";
        if (typeof row[0] === 'number') {
             const dateObj = XLSX.SSF.parse_date_code(row[0]);
             if (dateObj) dateKey = `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
        } else if (typeof row[0] === 'string') {
             const d = new Date(row[0]);
             if (!isNaN(d.getTime())) dateKey = d.toISOString().split('T')[0];
             else dateKey = row[0];
        }
        if (dateKey) {
            newSchedule[dateKey] = {
                date: dateKey,
                fajr: { start: convertExcelTime(row[1]), iqamah: convertExcelTime(row[2]) },
                dhuhr: { start: convertExcelTime(row[3]), iqamah: convertExcelTime(row[4]) },
                asr: { start: convertExcelTime(row[5]), iqamah: convertExcelTime(row[6]) },
                maghrib: { start: convertExcelTime(row[7]), iqamah: convertExcelTime(row[8]) },
                isha: { start: convertExcelTime(row[9]), iqamah: convertExcelTime(row[10]) },
                jumuahIqamah: convertExcelTime(row[11])
            };
            count++;
        }
      }
      setExcelSchedule(newSchedule);

      // Save to Supabase database
      if (!isSupabaseConfigured()) {
        setUploadStatus(`⚠️ Imported ${count} days (LOCAL ONLY - Supabase not configured). Set environment variables to enable cloud sync.`);
      } else {
        setUploadStatus(`Saving to database...`);
        const dbResult = await saveExcelScheduleToDatabase(newSchedule);

        if (dbResult.success) {
          setUploadStatus(`✅ Success! Imported ${count} days and saved to cloud database. Data will persist across all devices.`);
        } else {
          setUploadStatus(`⚠️ Imported ${count} days locally, but cloud save failed. Data may not sync across devices.`);
        }
      }
    } catch (err) {
      console.error(err);
      setUploadStatus("Error processing file.");
    }
  };

  const handleAddOverride = (prayerKey: string) => {
    if (!newOverride.start || !newOverride.iqamah || !newOverride.startDate || !newOverride.endDate) return;
    const override: ManualOverride = {
        id: Date.now().toString(),
        prayerKey: prayerKey as any,
        startDate: newOverride.startDate!,
        endDate: newOverride.endDate!,
        start: newOverride.start!,
        iqamah: newOverride.iqamah!
    };
    setManualOverrides([...manualOverrides, override]);
    setNewOverride({ startDate: newOverride.startDate, endDate: newOverride.endDate, start: '', iqamah: '' });
  };

  const deleteOverride = (id: string) => setManualOverrides(manualOverrides.filter(o => o.id !== id));

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

  // --- Styles ---
  const inputBase = "w-full bg-black/30 border border-white/10 rounded-2xl px-8 h-20 text-2xl text-white placeholder-white/30 focus:border-mosque-gold focus:ring-1 focus:ring-mosque-gold focus:bg-black/50 outline-none transition-all duration-200";
  const labelBase = "block text-xl font-bold uppercase tracking-widest text-mosque-gold/90 mb-4";
  const prayersList = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'jumuah'];

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
                     activeTab === 'slideshow' ? 'Right Panel Content' : 'Appearance'}
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

                     <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                         {/* Excel Import Card */}
                         <Card>
                            <div className="flex items-start justify-between mb-8">
                                <div>
                                    <h4 className="text-3xl font-bold text-white mb-4">Excel Data Source</h4>
                                    <p className="text-white/50 text-xl leading-relaxed max-w-lg">Import your annual <code>.xlsx</code> schedule. File must have columns for Date, Fajr Start, Fajr Iqamah, etc.</p>
                                </div>
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
                            {uploadStatus && <div className="mt-6 text-center font-mono text-xl text-mosque-gold">{uploadStatus}</div>}
                         </Card>

                         {/* Maghrib Config Card */}
                         <Card>
                            <div className="flex items-start gap-8">
                                <div className="p-5 bg-indigo-500/10 rounded-2xl text-indigo-400"><Clock className="w-10 h-10" /></div>
                                <div className="flex-1">
                                    <h4 className="text-3xl font-bold text-white mb-4">Maghrib Auto-Calculation</h4>
                                    <p className="text-white/50 text-xl mb-8">Maghrib Iqamah is calculated by adding an offset to the daily Sunset time.</p>
                                    
                                    <div className="flex flex-col gap-6">
                                        <div className="bg-black/30 rounded-2xl p-6 flex items-center justify-between border border-white/5">
                                            <span className="text-white/70 font-medium text-2xl">Offset Minutes</span>
                                            <span className="text-4xl font-bold text-mosque-gold">+{maghribOffset}</span>
                                        </div>
                                        <div className="pt-4">
                                            <input 
                                                type="range" 
                                                min="0" max="30" 
                                                value={maghribOffset} 
                                                onChange={(e) => setMaghribOffset(Number(e.target.value))}
                                                className="w-full accent-mosque-gold h-4 bg-white/10 rounded-xl appearance-none cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                         </Card>
                     </div>

                     {/* Manual Overrides */}
                     <div>
                        <h4 className="text-3xl font-bold text-white mb-8 flex items-center gap-4">
                            <Edit2 className="w-8 h-8 text-mosque-gold" /> 
                            Manual Overrides
                        </h4>
                        <div className="space-y-6">
                            {prayersList.filter(p => p !== 'maghrib').map((prayer) => {
                                const activeOverride = manualOverrides.find(o => o.prayerKey === prayer && new Date().toISOString().split('T')[0] >= o.startDate && new Date().toISOString().split('T')[0] <= o.endDate);
                                const isExpanded = expandedPrayer === prayer;
                                
                                return (
                                    <div key={prayer} className={`bg-white/5 rounded-2xl border transition-all overflow-hidden ${isExpanded ? 'border-mosque-gold bg-black/20' : 'border-white/5 hover:bg-white/10'}`}>
                                        <div 
                                            className="p-8 flex items-center justify-between cursor-pointer"
                                            onClick={() => setExpandedPrayer(isExpanded ? null : prayer)}
                                        >
                                            <div className="flex items-center gap-8">
                                                <span className="w-40 font-bold uppercase text-white tracking-wider text-2xl">{prayer}</span>
                                                {activeOverride ? (
                                                    <span className="px-4 py-2 bg-mosque-gold text-mosque-navy rounded-lg text-lg font-bold uppercase">Active Override</span>
                                                ) : (
                                                    <span className="text-white/30 text-xl">Default Schedule</span>
                                                )}
                                            </div>
                                            <ChevronRight className={`w-8 h-8 text-white/50 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                        </div>

                                        {isExpanded && (
                                            <div className="p-10 border-t border-white/10 grid grid-cols-12 gap-10 animate-in slide-in-from-top-2">
                                                <div className="col-span-8 space-y-8">
                                                    <div className="grid grid-cols-2 gap-8">
                                                        <div>
                                                            <label className={labelBase}>{prayer === 'jumuah' ? 'Start Time' : 'Adhan'}</label>
                                                            <input type="text" placeholder="5:00 AM" value={newOverride.start} onChange={e => setNewOverride({...newOverride, start: e.target.value})} className={inputBase} />
                                                        </div>
                                                        <div>
                                                            <label className={labelBase}>Iqamah</label>
                                                            <input type="text" placeholder="5:15 AM" value={newOverride.iqamah} onChange={e => setNewOverride({...newOverride, iqamah: e.target.value})} className={inputBase} />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className={labelBase}>Date Range</label>
                                                        <RangeCalendar startDate={newOverride.startDate || ''} endDate={newOverride.endDate || ''} onChange={(start, end) => setNewOverride({...newOverride, startDate: start, endDate: end})} />
                                                    </div>
                                                    <button onClick={() => handleAddOverride(prayer)} className="w-full py-6 bg-mosque-gold hover:bg-white text-mosque-navy font-bold text-2xl rounded-2xl transition-colors">Save Override</button>
                                                </div>

                                                <div className="col-span-4 bg-white/5 rounded-2xl p-8 border border-white/5">
                                                    <h5 className="text-white/60 font-bold uppercase tracking-widest text-sm mb-6">Active Overrides</h5>
                                                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                                                        {manualOverrides.filter(o => o.prayerKey === prayer).map(o => (
                                                            <div key={o.id} className="bg-black/20 p-6 rounded-xl border border-white/5 flex items-start justify-between group">
                                                                <div>
                                                                    <div className="text-mosque-gold font-bold text-lg mb-2">{o.startDate === o.endDate ? o.startDate : `${o.startDate}...`}</div>
                                                                    <div className="text-white/70 text-lg font-mono">{o.start} - {o.iqamah}</div>
                                                                </div>
                                                                <button onClick={() => deleteOverride(o.id)} className="text-white/20 hover:text-red-400"><Trash2 className="w-6 h-6" /></button>
                                                            </div>
                                                        ))}
                                                        {manualOverrides.filter(o => o.prayerKey === prayer).length === 0 && <div className="text-white/20 text-xl italic text-center py-8">No overrides set.</div>}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
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
                                      <p className="text-white/30 text-lg mt-3">Use <code>{'{prayers}'}</code> placeholder.</p>
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
                                                 <Toggle checked={slide.enabled} onChange={(v) => updateSlideConfig(slide.id, { enabled: v })} />
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

                </div>
             </div>
        </div>
      </div>
    </div>
  );
};