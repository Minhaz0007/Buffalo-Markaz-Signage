import React, { useState } from 'react';
import { X, Settings as SettingsIcon, Upload, Calendar as CalendarIcon, Plus, Trash2, Edit2, AlertTriangle, LayoutDashboard, MessageSquare, Palette, CheckCircle2, Zap, Type, ChevronLeft, ChevronRight, Moon, Clock, Sparkles, Wind, PlayCircle, StopCircle, Layers, Lock, PhoneOff, Eye } from 'lucide-react';
import { Announcement, ExcelDaySchedule, ManualOverride, AnnouncementItem, SlideConfig, AnnouncementSlideConfig, AutoAlertSettings, MobileSilentAlertSettings } from '../types';
import { ALERT_MESSAGES } from '../constants';
import * as XLSX from 'xlsx';

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

// --- Calendar Component ---
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
    <div className="bg-black/40 border border-white/10 rounded-xl p-8 select-none shadow-inner w-full">
       <div className="flex items-center justify-between mb-8">
         <button onClick={() => changeMonth(-1)} className="p-4 hover:bg-white/10 rounded-full text-white/70 transition-colors"><ChevronLeft className="w-8 h-8" /></button>
         <div className="font-bold text-white text-3xl tracking-widest uppercase font-serif">{monthNames[month]} {year}</div>
         <button onClick={() => changeMonth(1)} className="p-4 hover:bg-white/10 rounded-full text-white/70 transition-colors"><ChevronRight className="w-8 h-8" /></button>
       </div>
       
       <div className="grid grid-cols-7 gap-4 mb-4">
         {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
           <div key={d} className="text-center text-xl text-white/40 uppercase font-bold tracking-wider">{d}</div>
         ))}
       </div>
       
       <div className="grid grid-cols-7 gap-3">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
             const day = i + 1;
             const selected = isSelected(day);
             const inRange = isInRange(day);
             
             let bgClass = "bg-white/5 text-white/70 hover:bg-white/20 border border-white/5";
             if (selected) bgClass = "bg-mosque-gold text-mosque-navy font-bold shadow-[0_0_15px_rgba(212,175,55,0.4)] scale-110 z-10 border-mosque-gold";
             else if (inRange) bgClass = "bg-mosque-gold/20 text-mosque-gold border-mosque-gold/20";

             return (
               <button 
                 key={day} 
                 onClick={() => handleDayClick(day)}
                 className={`h-16 w-full rounded-lg flex items-center justify-center text-2xl transition-all duration-200 ${bgClass}`}
               >
                 {day}
               </button>
             );
          })}
       </div>
       <div className="mt-8 flex items-center justify-between text-xl text-white/40 border-t border-white/5 pt-6">
         <span>{isSelectingEnd ? "Select end date..." : "Select start date"}</span>
         {startDate && (
           <span className="font-mono text-mosque-gold">
              {startDate === endDate ? startDate : `${startDate} ➔ ${endDate}`}
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
  const defaultItemState = { text: "", color: "#000000", animation: 'none' as const };
  const [newItem, setNewItem] = useState<Omit<AnnouncementItem, 'id'>>(defaultItemState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Slideshow Editor State
  const [expandedSlideId, setExpandedSlideId] = useState<string | null>(null);
  // Auto Alert Expand State
  const [isAutoAlertExpanded, setIsAutoAlertExpanded] = useState(false);

  if (!isOpen) return null;

  const handlePreviewToggle = () => {
      // Toggle preview mode in App
      setIsPreviewAlert(true);
      // Close modal temporarily to see preview
      onClose();
      // Auto turn off preview after 5 seconds
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
      setUploadStatus(`Success! Imported ${count} days.`);
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
      setNewItem(defaultItemState); // Default: Black, No animation
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
      // Update existing
      const updatedItems = announcement.items.map(item => 
        item.id === editingId ? { ...item, ...newItem } : item
      );
      setAnnouncement({ ...announcement, items: updatedItems });
    } else {
      // Add new
      const newItemObj: AnnouncementItem = {
        id: Date.now().toString(),
        ...newItem
      };
      setAnnouncement({
        ...announcement,
        items: [...announcement.items, newItemObj]
      });
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
        // Special handling for nested styles in announcement
        if (slide.type === 'ANNOUNCEMENT' && 'backgroundColor' in updates) {
           return { ...slide, styles: { ...(slide as AnnouncementSlideConfig).styles, ...updates } };
        }
        return { ...slide, ...updates };
      }
      return slide;
    });
    setSlidesConfig(newConfig as SlideConfig[]);
  };

  // High contrast colors suitable for WHITE background ticker
  const THEME_COLORS = ['#000000', '#0B1E3B', '#B91C1C', '#15803D', '#D4AF37']; 
  // Slide BG Colors
  const SLIDE_BG_COLORS = ['#0B1E3B', '#1e293b', '#000000', '#7c2d12', '#14532d'];

  // --- STYLING CONSTANTS (SCALED FOR TV) ---
  const inputClass = "w-full bg-black/40 border border-white/10 rounded-xl px-6 h-20 text-3xl text-white placeholder-white/20 focus:border-mosque-gold focus:ring-1 focus:ring-mosque-gold outline-none transition-all duration-300 font-mono";
  const labelClass = "block text-xl uppercase tracking-[0.15em] text-mosque-gold/80 mb-4 font-semibold";
  const sidebarItemClass = (id: string) => `w-full flex items-center gap-6 px-8 py-6 rounded-xl transition-all duration-300 ${activeTab === id ? 'bg-mosque-gold text-mosque-navy font-bold shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`;

  const prayersList = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'jumuah'];

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center">
        <div className="bg-mosque-navy w-[1850px] h-[1000px] rounded-3xl shadow-2xl border-2 border-mosque-gold/30 flex overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] opacity-5 pointer-events-none"></div>

          {/* Sidebar - Wide for TV */}
          <div className="w-96 bg-black/30 border-r border-white/10 flex flex-col relative z-20 backdrop-blur-md shrink-0">
             <div className="p-10 border-b border-white/10">
                <h2 className="text-4xl text-mosque-gold font-serif flex items-center gap-4 drop-shadow-sm">
                  <SettingsIcon className="w-10 h-10 text-white/50" /> 
                  <span>Settings</span>
                </h2>
             </div>

             <nav className="flex-1 p-6 space-y-4 overflow-y-auto">
                <button onClick={() => setActiveTab('schedule')} className={sidebarItemClass('schedule')}>
                   <LayoutDashboard className="w-8 h-8" />
                   <span className="text-2xl tracking-wide uppercase">Schedule</span>
                </button>
                <button onClick={() => setActiveTab('announcements')} className={sidebarItemClass('announcements')}>
                   <MessageSquare className="w-8 h-8" />
                   <span className="text-2xl tracking-wide uppercase">Alerts</span>
                </button>
                <button onClick={() => setActiveTab('silentAlert')} className={sidebarItemClass('silentAlert')}>
                   <PhoneOff className="w-8 h-8" />
                   <span className="text-2xl tracking-wide uppercase">Silent Alert</span>
                </button>
                <button onClick={() => setActiveTab('slideshow')} className={sidebarItemClass('slideshow')}>
                   <Layers className="w-8 h-8" />
                   <span className="text-2xl tracking-wide uppercase">Slideshow</span>
                </button>
                <button onClick={() => setActiveTab('customization')} className={sidebarItemClass('customization')}>
                   <Palette className="w-8 h-8" />
                   <span className="text-2xl tracking-wide uppercase">Theme</span>
                </button>
             </nav>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col relative z-10 bg-gradient-to-br from-mosque-navy/50 to-mosque-dark/50">
             
             <div className="h-28 border-b border-white/10 flex items-center justify-between px-12 bg-black/10 shrink-0">
                 <h3 className="text-white font-serif text-4xl tracking-wide">
                    {activeTab === 'schedule' ? 'Prayer Schedule & Overrides' : 
                     activeTab === 'announcements' ? 'Announcements & Alerts' : 
                     activeTab === 'silentAlert' ? 'Mobile Silent Alert' :
                     activeTab === 'slideshow' ? 'Right Panel Slideshow' : 'Appearance'}
                 </h3>
                 <button onClick={onClose} className="text-white/40 hover:text-white hover:bg-white/10 p-4 rounded-full transition-all duration-300">
                    <X className="w-12 h-12" />
                 </button>
             </div>

             <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                
                {/* --- SILENT ALERT TAB --- */}
                {activeTab === 'silentAlert' && (
                    <div className="max-w-[1400px] mx-auto space-y-12">
                        {/* Header Description */}
                        <div className="bg-white/5 p-8 rounded-2xl border border-white/10 flex items-center justify-between">
                             <div className="flex items-center gap-6">
                                <div className="p-4 rounded-xl bg-red-500/20 text-red-400">
                                    <PhoneOff className="w-12 h-12" />
                                </div>
                                <div>
                                    <h4 className="text-3xl text-white font-bold">Mobile Silent Alert</h4>
                                    <p className="text-white/50 text-xl mt-2">Display a warning before Iqamah to remind congregants to silence phones.</p>
                                </div>
                             </div>
                             
                             <div className="flex items-center gap-4">
                                <label className="text-xl uppercase tracking-widest text-white/70 font-bold mr-4">Enable Alert</label>
                                <button 
                                  onClick={() => setMobileAlertSettings({ ...mobileAlertSettings, enabled: !mobileAlertSettings.enabled })}
                                  className={`w-24 h-12 rounded-full relative transition-colors duration-300 ${mobileAlertSettings.enabled ? 'bg-mosque-gold' : 'bg-white/10'}`}
                               >
                                  <div className={`absolute top-1 bottom-1 w-10 bg-mosque-navy rounded-full transition-all duration-300 shadow-lg ${mobileAlertSettings.enabled ? 'right-1' : 'left-1'}`}></div>
                               </button>
                             </div>
                        </div>

                        {/* Configuration Grid */}
                        <div className="grid grid-cols-2 gap-12">
                            {/* Left Col */}
                            <div className="space-y-10">
                                <div>
                                    <label className={labelClass}>Alert Mode</label>
                                    <div className="flex gap-4">
                                        <button 
                                            onClick={() => setMobileAlertSettings({...mobileAlertSettings, mode: 'panel'})}
                                            className={`flex-1 py-6 rounded-2xl border-2 text-2xl font-bold uppercase transition-all ${mobileAlertSettings.mode === 'panel' ? 'border-mosque-gold bg-mosque-gold/10 text-mosque-gold' : 'border-white/10 bg-black/20 text-white/40'}`}
                                        >
                                            Right Panel
                                        </button>
                                        <button 
                                            onClick={() => setMobileAlertSettings({...mobileAlertSettings, mode: 'fullscreen'})}
                                            className={`flex-1 py-6 rounded-2xl border-2 text-2xl font-bold uppercase transition-all ${mobileAlertSettings.mode === 'fullscreen' ? 'border-mosque-gold bg-mosque-gold/10 text-mosque-gold' : 'border-white/10 bg-black/20 text-white/40'}`}
                                        >
                                            Full Screen
                                        </button>
                                    </div>
                                    <p className="text-white/40 text-lg mt-3 ml-1">
                                        {mobileAlertSettings.mode === 'panel' ? "Shows in the right column, replacing slides." : "Takes over the entire screen for maximum visibility."}
                                    </p>
                                </div>

                                <div>
                                    <label className={labelClass}>Trigger Time (Minutes Before Iqamah)</label>
                                    <select 
                                        value={mobileAlertSettings.triggerMinutes}
                                        onChange={(e) => setMobileAlertSettings({...mobileAlertSettings, triggerMinutes: Number(e.target.value)})}
                                        className={inputClass}
                                    >
                                        {[1, 2, 3, 4, 5, 10].map(m => (
                                            <option key={m} value={m} className="bg-mosque-navy">{m} Minutes</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className={labelClass}>Background Color</label>
                                    <div className="flex gap-6 items-center">
                                         {['#ef4444', '#b91c1c', '#000000', '#1e3a8a', '#d97706'].map(c => (
                                             <button 
                                                key={c}
                                                onClick={() => setMobileAlertSettings({...mobileAlertSettings, backgroundColor: c})}
                                                className={`w-16 h-16 rounded-full border-4 shadow-lg transition-transform hover:scale-110 ${mobileAlertSettings.backgroundColor === c ? 'border-white scale-110 ring-4 ring-white/20' : 'border-transparent'}`}
                                                style={{ backgroundColor: c }}
                                             />
                                         ))}
                                         <input 
                                            type="color"
                                            value={mobileAlertSettings.backgroundColor}
                                            onChange={(e) => setMobileAlertSettings({...mobileAlertSettings, backgroundColor: e.target.value})}
                                            className="w-16 h-16 rounded-full border-0 p-0 overflow-hidden cursor-pointer"
                                         />
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-6 p-6 bg-white/5 rounded-2xl border border-white/10">
                                    <div className="p-4 bg-white/10 rounded-full">
                                        <Zap className="w-8 h-8 text-mosque-gold" />
                                    </div>
                                    <div className="flex-1">
                                        <h5 className="text-xl font-bold text-white">Audio Beep</h5>
                                        <p className="text-white/50">Play a warning tone at 30 seconds.</p>
                                    </div>
                                    <button 
                                      onClick={() => setMobileAlertSettings({ ...mobileAlertSettings, beepEnabled: !mobileAlertSettings.beepEnabled })}
                                      className={`w-16 h-8 rounded-full relative transition-colors duration-300 ${mobileAlertSettings.beepEnabled ? 'bg-green-500' : 'bg-white/10'}`}
                                   >
                                      <div className={`absolute top-1 bottom-1 w-6 bg-white rounded-full transition-all duration-300 shadow ${mobileAlertSettings.beepEnabled ? 'right-1' : 'left-1'}`}></div>
                                   </button>
                                </div>
                            </div>

                            {/* Right Col */}
                            <div className="space-y-10">
                                <div>
                                    <label className={labelClass}>Alert Message</label>
                                    <div className="space-y-4 mb-4">
                                        {ALERT_MESSAGES.map((msg, idx) => (
                                            <button 
                                                key={idx}
                                                onClick={() => setMobileAlertSettings({...mobileAlertSettings, text: msg})}
                                                className={`block w-full text-left p-4 rounded-xl text-lg border transition-all ${mobileAlertSettings.text === msg ? 'bg-mosque-gold text-mosque-navy border-mosque-gold font-bold' : 'bg-white/5 text-white/60 border-transparent hover:bg-white/10'}`}
                                            >
                                                {msg}
                                            </button>
                                        ))}
                                    </div>
                                    <input 
                                        type="text" 
                                        value={mobileAlertSettings.text}
                                        onChange={(e) => setMobileAlertSettings({...mobileAlertSettings, text: e.target.value})}
                                        className={inputClass}
                                        placeholder="Or type a custom message..."
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>Icon & Animation</label>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <select 
                                                value={mobileAlertSettings.icon}
                                                onChange={(e) => setMobileAlertSettings({...mobileAlertSettings, icon: e.target.value as any})}
                                                className={inputClass}
                                            >
                                                <option value="phone-off" className="bg-mosque-navy">No Phone Icon</option>
                                                <option value="shhh" className="bg-mosque-navy">Silence Icon</option>
                                                <option value="align-rows" className="bg-mosque-navy">Straighten Rows</option>
                                            </select>
                                        </div>
                                        <div>
                                            <select 
                                                value={mobileAlertSettings.animation}
                                                onChange={(e) => setMobileAlertSettings({...mobileAlertSettings, animation: e.target.value as any})}
                                                className={inputClass}
                                            >
                                                <option value="pulse" className="bg-mosque-navy">Pulse</option>
                                                <option value="flash" className="bg-mosque-navy">Flash Background</option>
                                                <option value="none" className="bg-mosque-navy">Static</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-8 mt-8 border-t border-white/10">
                                    <button 
                                        onClick={handlePreviewToggle}
                                        className="w-full py-6 bg-white hover:bg-white/90 text-mosque-navy text-2xl font-bold uppercase tracking-widest rounded-xl shadow-xl flex items-center justify-center gap-4 transition-all"
                                    >
                                        <Eye className="w-8 h-8" />
                                        Preview Alert (5s)
                                    </button>
                                    <p className="text-center text-white/40 mt-3">Preview will close settings and show the alert for 5 seconds.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'schedule' && (
                  <div className="space-y-12 max-w-[1400px] mx-auto">
                     {/* Schedule content omitted for brevity, logic remains the same */}
                     {/* Excel Import */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-10">
                       <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-6">
                             <div className="p-4 bg-mosque-gold/10 rounded-xl">
                                <Upload className="w-10 h-10 text-mosque-gold" />
                             </div>
                             <div>
                                <h4 className="text-white font-bold text-3xl">Import Annual Schedule</h4>
                                <p className="text-xl text-white/50 mt-2">Upload .xlsx file to set base prayer times.</p>
                             </div>
                          </div>
                          <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white text-xl font-bold uppercase tracking-wider py-4 px-8 rounded-xl transition-colors border border-white/10">
                             Choose File
                             <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" />
                          </label>
                       </div>
                       {uploadStatus && (
                          <div className={`text-xl font-mono p-6 rounded-xl bg-black/30 border border-white/5 ${uploadStatus.includes('Error') ? 'text-red-300' : 'text-green-300'}`}>
                              {uploadStatus}
                          </div>
                       )}
                    </div>

                    {/* Manual Overrides */}
                    <div>
                        <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-4">
                            <Edit2 className="w-8 h-8 text-mosque-gold" />
                            <h4 className="text-2xl font-bold uppercase tracking-widest text-white/80">Manual Overrides</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-6">
                            {prayersList.map((prayer) => {
                                const overrides = manualOverrides.filter(o => o.prayerKey === prayer);
                                const isExpanded = expandedPrayer === prayer;
                                const activeOverride = overrides.find(o => {
                                    const today = new Date().toISOString().split('T')[0];
                                    return today >= o.startDate && today <= o.endDate;
                                });

                                const isMaghrib = prayer === 'maghrib';

                                return (
                                    <div key={prayer} className={`bg-white/5 rounded-2xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-mosque-gold ring-2 ring-mosque-gold/30' : 'border-white/5 hover:border-white/20'}`}>
                                        {/* Row Header */}
                                        <div 
                                            className="p-8 flex items-center justify-between cursor-pointer hover:bg-white/5"
                                            onClick={() => setExpandedPrayer(isExpanded ? null : prayer)}
                                        >
                                            <div className="flex items-center gap-8">
                                                <div className="w-48 font-bold uppercase text-mosque-gold font-serif text-4xl tracking-wide pl-4">{prayer}</div>
                                                {isMaghrib ? (
                                                     <span className="bg-purple-500/20 text-purple-200 text-xl font-bold px-4 py-2 rounded-lg uppercase tracking-wider">Auto (+{maghribOffset}m)</span>
                                                ) : activeOverride ? (
                                                    <span className="bg-mosque-gold text-mosque-navy text-xl font-bold px-4 py-2 rounded-lg uppercase tracking-wider shadow-sm">Active</span>
                                                ) : excelSchedule[new Date().toISOString().split('T')[0]] ? (
                                                    <span className="bg-blue-500/20 text-blue-200 text-xl font-bold px-4 py-2 rounded-lg uppercase tracking-wider">Excel</span>
                                                ) : (
                                                    <span className="bg-white/10 text-white/50 text-xl font-bold px-4 py-2 rounded-lg uppercase tracking-wider">Default</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-8 text-2xl text-white/60">
                                                 {isMaghrib ? (
                                                    <span className="opacity-50 text-xl">Sunset + {maghribOffset} min</span>
                                                 ) : activeOverride ? (
                                                     <span className="font-mono text-xl bg-black/20 px-4 py-2 rounded-lg">{activeOverride.start} / {activeOverride.iqamah}</span>
                                                 ) : <span className="opacity-50 text-xl">Configure</span>}
                                                 <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180 text-mosque-gold' : ''}`}>▼</div>
                                            </div>
                                        </div>

                                        {/* Expanded Config Area */}
                                        {isExpanded && (
                                            <div className="p-12 border-t border-white/10 bg-black/20">
                                                
                                                {/* --- MAGHRIB SPECIAL CONFIG --- */}
                                                {isMaghrib ? (
                                                    <div className="flex flex-col gap-8">
                                                        <div className="flex items-center gap-4 text-mosque-gold mb-2">
                                                            <Clock className="w-8 h-8" />
                                                            <h5 className="text-2xl font-bold uppercase tracking-widest">Maghrib Iqamah Calculation</h5>
                                                        </div>
                                                        <p className="text-white/60 text-xl max-w-4xl leading-relaxed">
                                                            Maghrib Iqamah is automatically calculated based on the daily Sunset time. Select the number of minutes to add to Sunset.
                                                        </p>

                                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-10 max-w-2xl mt-4">
                                                            <label className={labelClass}>Offset (Minutes)</label>
                                                            <div className="flex items-center gap-6">
                                                                <span className="text-2xl font-serif text-white/50">Sunset</span>
                                                                <span className="text-2xl font-bold text-mosque-gold">+</span>
                                                                <select 
                                                                    value={maghribOffset}
                                                                    onChange={(e) => setMaghribOffset(Number(e.target.value))}
                                                                    className="flex-1 bg-black/40 border border-white/20 rounded-xl px-6 h-16 text-xl text-white outline-none focus:border-mosque-gold focus:ring-1 focus:ring-mosque-gold font-mono cursor-pointer"
                                                                >
                                                                    {Array.from({length: 30}, (_, i) => i + 1).map(min => (
                                                                        <option key={min} value={min} className="bg-mosque-navy">{min} Minutes</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                                                                <span className="text-white/40 uppercase tracking-widest text-lg">Example Calculation</span>
                                                                <span className="text-white text-xl font-mono">
                                                                    If Sunset is 7:00 PM → Iqamah is 7:{String(maghribOffset).padStart(2, '0')} PM
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                /* --- STANDARD PRAYER CONFIG --- */
                                                <div className="grid grid-cols-12 gap-12">
                                                    {/* LEFT COLUMN: Input Form */}
                                                    <div className="col-span-12 lg:col-span-8 space-y-8">
                                                        <h5 className="text-xl uppercase tracking-widest font-bold text-white/70 flex items-center gap-3 border-b border-white/5 pb-4">
                                                            <Plus className="w-6 h-6" /> Add Custom Schedule
                                                        </h5>
                                                        
                                                        <div className="flex flex-col gap-8">
                                                            <div className="w-full">
                                                                <label className={labelClass}>Select Date / Range</label>
                                                                <RangeCalendar 
                                                                  startDate={newOverride.startDate || ''}
                                                                  endDate={newOverride.endDate || ''}
                                                                  onChange={(start, end) => setNewOverride({...newOverride, startDate: start, endDate: end})}
                                                                />
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-8 bg-white/5 p-8 rounded-2xl border border-white/5">
                                                                    <div>
                                                                        <label className={labelClass}>{prayer === 'jumuah' ? 'Start Time' : 'Adhan Time'}</label>
                                                                        <input 
                                                                            type="text" placeholder="e.g. 5:00 AM"
                                                                            value={newOverride.start}
                                                                            onChange={e => setNewOverride({...newOverride, start: e.target.value})}
                                                                            className={inputClass} 
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className={labelClass}>Iqamah Time</label>
                                                                        <input 
                                                                            type="text" placeholder="e.g. 5:30 AM"
                                                                            value={newOverride.iqamah}
                                                                            onChange={e => setNewOverride({...newOverride, iqamah: e.target.value})}
                                                                            className={inputClass} 
                                                                        />
                                                                    </div>
                                                                    <div className="col-span-2">
                                                                      <button 
                                                                          onClick={() => handleAddOverride(prayer)}
                                                                          className="w-full bg-mosque-navy border-2 border-mosque-gold/50 hover:bg-mosque-gold hover:text-mosque-navy text-mosque-gold text-2xl font-bold uppercase tracking-widest py-6 rounded-xl transition-all shadow-lg"
                                                                      >
                                                                          Apply Override
                                                                      </button>
                                                                    </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* RIGHT COLUMN: Active List */}
                                                    <div className="col-span-12 lg:col-span-4 bg-black/20 rounded-2xl p-6 border border-white/5 h-full max-h-[600px] overflow-hidden flex flex-col">
                                                        <h5 className="text-xl uppercase tracking-widest font-bold text-white/70 mb-6 border-b border-white/5 pb-4">Active Overrides</h5>
                                                        
                                                        {overrides.length === 0 ? (
                                                            <div className="text-white/20 text-xl italic text-center py-24 flex flex-col items-center gap-4">
                                                              <AlertTriangle className="w-16 h-16 opacity-20" />
                                                              No active overrides.
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 flex-1">
                                                                {overrides.map(o => (
                                                                    <div key={o.id} className="flex flex-col bg-white/5 hover:bg-white/10 p-6 rounded-xl border border-white/5 text-lg group relative">
                                                                        <button onClick={() => deleteOverride(o.id)} className="absolute top-4 right-4 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-2"><Trash2 className="w-6 h-6" /></button>
                                                                        <div className="text-mosque-gold font-bold mb-2 flex items-center gap-3">
                                                                            <CalendarIcon className="w-5 h-5 opacity-50" />
                                                                            {o.startDate === o.endDate ? o.startDate : `${o.startDate} ...`}
                                                                        </div>
                                                                        <div className="text-white/70 font-mono text-xl">
                                                                            {o.start} - {o.iqamah}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                  </div>
                )}