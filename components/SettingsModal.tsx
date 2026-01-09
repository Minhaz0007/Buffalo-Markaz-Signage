import React, { useState } from 'react';
import { X, Save, Settings as SettingsIcon, Upload, Calendar as CalendarIcon, Plus, Trash2, Edit2, AlertTriangle, LayoutDashboard, MessageSquare, Type, ChevronLeft, ChevronRight, Palette, CheckCircle2 } from 'lucide-react';
import { Announcement, ExcelDaySchedule, ManualOverride } from '../types';
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
  currentTheme, setCurrentTheme
}) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'announcements' | 'customization'>('schedule');
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [expandedPrayer, setExpandedPrayer] = useState<string | null>(null);
  const [newOverride, setNewOverride] = useState<Partial<ManualOverride>>({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    start: '',
    iqamah: ''
  });
  
  // Announcement State
  const [newAnnouncementItem, setNewAnnouncementItem] = useState("");

  if (!isOpen) return null;

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

  // Announcement Handlers
  const addAnnouncementItem = () => {
    if(!newAnnouncementItem.trim()) return;
    setAnnouncement({
      ...announcement,
      items: [...announcement.items, newAnnouncementItem.trim()]
    });
    setNewAnnouncementItem("");
  };

  const deleteAnnouncementItem = (index: number) => {
    const newItems = [...announcement.items];
    newItems.splice(index, 1);
    setAnnouncement({ ...announcement, items: newItems });
  };


  // --- STYLING CONSTANTS (SCALED FOR TV) ---
  const inputClass = "w-full bg-black/40 border border-white/10 rounded-xl px-6 h-20 text-3xl text-white placeholder-white/20 focus:border-mosque-gold focus:ring-1 focus:ring-mosque-gold outline-none transition-all duration-300 font-mono";
  const labelClass = "block text-xl uppercase tracking-[0.15em] text-mosque-gold/80 mb-4 font-semibold";
  const sidebarItemClass = (id: string) => `w-full flex items-center gap-6 px-8 py-6 rounded-xl transition-all duration-300 ${activeTab === id ? 'bg-mosque-gold text-mosque-navy font-bold shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`;

  const prayersList = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'jumuah'];

  return (
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
                  {activeTab === 'schedule' ? 'Prayer Schedule & Overrides' : activeTab === 'announcements' ? 'Announcements & Alerts' : 'Appearance'}
               </h3>
               <button onClick={onClose} className="text-white/40 hover:text-white hover:bg-white/10 p-4 rounded-full transition-all duration-300">
                  <X className="w-12 h-12" />
               </button>
           </div>

           <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
              
              {activeTab === 'schedule' && (
                <div className="space-y-12 max-w-[1400px] mx-auto">
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

                              return (
                                  <div key={prayer} className={`bg-white/5 rounded-2xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-mosque-gold ring-2 ring-mosque-gold/30' : 'border-white/5 hover:border-white/20'}`}>
                                      {/* Row Header */}
                                      <div 
                                          className="p-8 flex items-center justify-between cursor-pointer hover:bg-white/5"
                                          onClick={() => setExpandedPrayer(isExpanded ? null : prayer)}
                                      >
                                          <div className="flex items-center gap-8">
                                              <div className="w-48 font-bold uppercase text-mosque-gold font-serif text-4xl tracking-wide pl-4">{prayer}</div>
                                              {activeOverride ? (
                                                  <span className="bg-mosque-gold text-mosque-navy text-xl font-bold px-4 py-2 rounded-lg uppercase tracking-wider shadow-sm">Active</span>
                                              ) : excelSchedule[new Date().toISOString().split('T')[0]] ? (
                                                  <span className="bg-blue-500/20 text-blue-200 text-xl font-bold px-4 py-2 rounded-lg uppercase tracking-wider">Excel</span>
                                              ) : (
                                                  <span className="bg-white/10 text-white/50 text-xl font-bold px-4 py-2 rounded-lg uppercase tracking-wider">Default</span>
                                              )}
                                          </div>
                                          <div className="flex items-center gap-8 text-2xl text-white/60">
                                               {activeOverride ? (
                                                   <span className="font-mono text-xl bg-black/20 px-4 py-2 rounded-lg">{activeOverride.start} / {activeOverride.iqamah}</span>
                                               ) : <span className="opacity-50 text-xl">Configure</span>}
                                               <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180 text-mosque-gold' : ''}`}>▼</div>
                                          </div>
                                      </div>

                                      {/* Expanded Config Area */}
                                      {isExpanded && (
                                          <div className="p-12 border-t border-white/10 bg-black/20">
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
                                          </div>
                                      )}
                                  </div>
                              );
                          })}
                      </div>
                  </div>
                </div>
              )}

              {/* ANNOUNCEMENT CONFIGURATION TAB */}
              {activeTab === 'announcements' && (
                 <div className="max-w-[1400px] mx-auto space-y-12">
                     <div className="bg-white/5 border border-white/10 rounded-2xl p-10">
                        <h4 className="text-4xl text-white font-serif mb-8 border-b border-white/10 pb-4">Announcement Configuration</h4>
                        
                        <div className="space-y-10">
                            {/* Title Config */}
                            <div>
                                <label className={labelClass}>Header Title</label>
                                <input 
                                    type="text" 
                                    value={announcement.title}
                                    onChange={(e) => setAnnouncement({...announcement, title: e.target.value})}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-8 h-24 text-4xl font-bold tracking-widest text-white placeholder-white/20 focus:border-mosque-gold outline-none"
                                    placeholder="e.g. ANNOUNCEMENTS"
                                />
                                <p className="text-lg text-white/30 mt-3 pl-2">This text appears in the fixed gold box on the left.</p>
                            </div>

                            {/* Add New Item */}
                            <div>
                                <label className={labelClass}>Add New Announcement</label>
                                <div className="flex gap-4">
                                  <input 
                                      type="text" 
                                      value={newAnnouncementItem}
                                      onChange={(e) => setNewAnnouncementItem(e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && addAnnouncementItem()}
                                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-8 h-24 text-2xl text-white placeholder-white/20 focus:border-mosque-gold outline-none"
                                      placeholder="Type message here..."
                                  />
                                  <button 
                                    onClick={addAnnouncementItem}
                                    className="px-12 bg-mosque-gold text-mosque-navy font-bold text-2xl uppercase tracking-widest rounded-xl hover:bg-white transition-colors"
                                  >
                                    Add
                                  </button>
                                </div>
                            </div>

                            {/* List of Items */}
                            <div className="bg-black/20 rounded-2xl border border-white/5 p-6 min-h-[400px]">
                                <h5 className="text-xl uppercase tracking-widest font-bold text-white/50 mb-6 pl-2">Current Sequence (Right to Left)</h5>
                                {announcement.items.length === 0 ? (
                                  <div className="text-center py-20 text-white/20 text-2xl italic">No announcements added.</div>
                                ) : (
                                  <div className="space-y-4">
                                    {announcement.items.map((item, idx) => (
                                      <div key={idx} className="flex items-center justify-between bg-white/5 p-6 rounded-xl border border-white/5 group">
                                         <div className="flex items-center gap-6">
                                            <span className="text-mosque-gold font-mono text-xl opacity-50">#{idx + 1}</span>
                                            <p className="text-white text-2xl leading-relaxed">{item}</p>
                                         </div>
                                         <button 
                                            onClick={() => deleteAnnouncementItem(idx)}
                                            className="text-white/20 hover:text-red-400 transition-colors p-4"
                                         >
                                            <Trash2 className="w-8 h-8" />
                                         </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                            </div>
                        </div>
                     </div>
                 </div>
              )}

              {activeTab === 'customization' && (
                <div className="max-w-[1600px] mx-auto">
                    <div className="mb-12">
                        <h4 className="text-4xl text-white font-serif mb-4">Background Theme</h4>
                        <p className="text-white/40 text-2xl">Select a background style for the main display.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {/* Theme Option 1 */}
                        <button 
                           onClick={() => setCurrentTheme('arabesque')}
                           className={`group relative h-80 rounded-2xl border-4 overflow-hidden transition-all duration-300 ${currentTheme === 'arabesque' ? 'border-mosque-gold shadow-[0_0_50px_rgba(212,175,55,0.3)]' : 'border-white/10 hover:border-white/30'}`}
                        >
                           <div className="absolute inset-0 bg-[#0B1E3B]">
                                <div className="absolute inset-0 bg-gradient-to-br from-[#112442] to-[#050F1E]"></div>
                                {/* PREVIEW SVG 1 */}
                                <div className="absolute inset-0 text-[#E2E8F0] opacity-10">
                                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                                        <defs>
                                            <pattern id="preview-arabesque" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
                                            <path d="M25 0 L50 25 L25 50 L0 25 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                                            </pattern>
                                        </defs>
                                        <rect width="100%" height="100%" fill="url(#preview-arabesque)" />
                                    </svg>
                                </div>
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]"></div>
                           </div>
                           <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 to-transparent">
                              <span className="text-white font-bold flex items-center gap-4 text-3xl">Subtle Arabesque {currentTheme === 'arabesque' && <CheckCircle2 className="w-8 h-8 text-mosque-gold"/>}</span>
                              <span className="text-xl text-white/50 block mt-2">Default elegant geometric pattern</span>
                           </div>
                        </button>

                         {/* Theme Option 2 */}
                         <button 
                           onClick={() => setCurrentTheme('lattice')}
                           className={`group relative h-80 rounded-2xl border-4 overflow-hidden transition-all duration-300 ${currentTheme === 'lattice' ? 'border-mosque-gold shadow-[0_0_50px_rgba(212,175,55,0.3)]' : 'border-white/10 hover:border-white/30'}`}
                        >
                           <div className="absolute inset-0 bg-mosque-navy">
                               <div className="absolute inset-0 bg-[#08152b]"></div>
                               {/* PREVIEW SVG 2 */}
                               <div className="absolute inset-0 text-mosque-gold opacity-20">
                                    <svg width="100%" height="100%">
                                        <pattern id="preview-lattice" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                                            <path d="M20 0 L40 20 L20 40 L0 20 Z" fill="none" stroke="currentColor" strokeWidth="1" />
                                        </pattern>
                                        <rect width="100%" height="100%" fill="url(#preview-lattice)" />
                                    </svg>
                               </div>
                               <div className="absolute inset-0 bg-gradient-to-t from-mosque-navy via-transparent to-mosque-navy opacity-80"></div>
                           </div>
                           <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 to-transparent">
                              <span className="text-white font-bold flex items-center gap-4 text-3xl">Golden Lattice {currentTheme === 'lattice' && <CheckCircle2 className="w-8 h-8 text-mosque-gold"/>}</span>
                              <span className="text-xl text-white/50 block mt-2">Modern grid with gold accents</span>
                           </div>
                        </button>

                         {/* Theme Option 3: Starry Nights */}
                         <button 
                           onClick={() => setCurrentTheme('starry')}
                           className={`group relative h-80 rounded-2xl border-4 overflow-hidden transition-all duration-300 ${currentTheme === 'starry' ? 'border-mosque-gold shadow-[0_0_50px_rgba(212,175,55,0.3)]' : 'border-white/10 hover:border-white/30'}`}
                        >
                           <div className="absolute inset-0 bg-[#02040a]">
                               <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,#0B1E3B_0%,#02040a_50%,#000000_100%)]"></div>
                               {/* PREVIEW SVG 3 */}
                               <div className="absolute inset-0 opacity-70">
                                    <svg width="100%" height="100%">
                                        <circle cx="20%" cy="30%" r="1" fill="white" opacity="0.8" />
                                        <circle cx="50%" cy="20%" r="1.5" fill="white" opacity="0.4" />
                                        <circle cx="80%" cy="40%" r="1" fill="white" opacity="0.9" />
                                        <circle cx="30%" cy="70%" r="1.2" fill="white" opacity="0.5" />
                                        <circle cx="70%" cy="80%" r="1" fill="white" opacity="0.7" />
                                    </svg>
                               </div>
                           </div>
                           <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 to-transparent">
                              <span className="text-white font-bold flex items-center gap-4 text-3xl">Starry Nights {currentTheme === 'starry' && <CheckCircle2 className="w-8 h-8 text-mosque-gold"/>}</span>
                              <span className="text-xl text-white/50 block mt-2">Peaceful night sky with animated stars</span>
                           </div>
                        </button>
                    </div>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};