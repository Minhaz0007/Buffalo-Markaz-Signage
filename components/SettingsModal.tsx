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
    <div className="bg-black/40 border border-white/10 rounded-xl p-6 select-none shadow-inner w-full">
       <div className="flex items-center justify-between mb-6">
         <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/10 rounded-full text-white/70 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
         <div className="font-bold text-white text-lg tracking-widest uppercase font-serif">{monthNames[month]} {year}</div>
         <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/10 rounded-full text-white/70 transition-colors"><ChevronRight className="w-5 h-5" /></button>
       </div>
       
       <div className="grid grid-cols-7 gap-2 mb-2">
         {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
           <div key={d} className="text-center text-xs text-white/40 uppercase font-bold tracking-wider">{d}</div>
         ))}
       </div>
       
       <div className="grid grid-cols-7 gap-2">
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
                 className={`h-12 w-full rounded-lg flex items-center justify-center text-sm transition-all duration-200 ${bgClass}`}
               >
                 {day}
               </button>
             );
          })}
       </div>
       <div className="mt-6 flex items-center justify-between text-xs text-white/40 border-t border-white/5 pt-4">
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

  const inputClass = "w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:border-mosque-gold focus:ring-1 focus:ring-mosque-gold outline-none transition-all duration-300 font-mono text-sm";
  const labelClass = "block text-[10px] uppercase tracking-[0.15em] text-mosque-gold/80 mb-2 font-semibold";
  const sidebarItemClass = (id: string) => `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${activeTab === id ? 'bg-mosque-gold text-mosque-navy font-bold shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`;

  const prayersList = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'jumuah'];

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 xl:p-8">
      <div className="bg-mosque-navy w-full max-w-[1400px] h-[90vh] rounded-2xl shadow-2xl border border-mosque-gold/30 flex overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] opacity-5 pointer-events-none"></div>

        {/* Sidebar */}
        <div className="w-64 bg-black/30 border-r border-white/10 flex flex-col relative z-20 backdrop-blur-md shrink-0">
           <div className="p-6 border-b border-white/10">
              <h2 className="text-xl text-mosque-gold font-serif flex items-center gap-2 drop-shadow-sm">
                <SettingsIcon className="w-5 h-5 text-white/50" /> 
                <span>Settings</span>
              </h2>
           </div>

           <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              <button onClick={() => setActiveTab('schedule')} className={sidebarItemClass('schedule')}>
                 <LayoutDashboard className="w-4 h-4" />
                 <span className="text-sm tracking-wide uppercase">Schedule</span>
              </button>
              <button onClick={() => setActiveTab('announcements')} className={sidebarItemClass('announcements')}>
                 <MessageSquare className="w-4 h-4" />
                 <span className="text-sm tracking-wide uppercase">Announcements</span>
              </button>
              <button onClick={() => setActiveTab('customization')} className={sidebarItemClass('customization')}>
                 <Palette className="w-4 h-4" />
                 <span className="text-sm tracking-wide uppercase">Customization</span>
              </button>
           </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative z-10 bg-gradient-to-br from-mosque-navy/50 to-mosque-dark/50">
           
           <div className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-black/10 shrink-0">
               <h3 className="text-white font-serif text-xl tracking-wide">
                  {activeTab === 'schedule' ? 'Prayer Schedule & Overrides' : activeTab === 'announcements' ? 'Announcements & Alerts' : 'Appearance'}
               </h3>
               <button onClick={onClose} className="text-white/40 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all duration-300">
                  <X className="w-6 h-6" />
               </button>
           </div>

           <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              
              {activeTab === 'schedule' && (
                <div className="space-y-8 max-w-7xl mx-auto">
                  {/* Excel Import */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                     <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-mosque-gold/10 rounded-lg">
                              <Upload className="w-5 h-5 text-mosque-gold" />
                           </div>
                           <div>
                              <h4 className="text-white font-bold">Import Annual Schedule</h4>
                              <p className="text-xs text-white/50 mt-1">Upload .xlsx file to set base prayer times for the year.</p>
                           </div>
                        </div>
                        <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider py-2 px-4 rounded transition-colors">
                           Choose File
                           <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" />
                        </label>
                     </div>
                     {uploadStatus && (
                        <div className={`text-xs font-mono p-3 rounded bg-black/30 border border-white/5 ${uploadStatus.includes('Error') ? 'text-red-300' : 'text-green-300'}`}>
                            {uploadStatus}
                        </div>
                     )}
                  </div>

                  {/* Manual Overrides */}
                  <div>
                      <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-2">
                          <Edit2 className="w-4 h-4 text-mosque-gold" />
                          <h4 className="text-sm font-bold uppercase tracking-widest text-white/80">Manual Overrides</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4">
                          {prayersList.map((prayer) => {
                              const overrides = manualOverrides.filter(o => o.prayerKey === prayer);
                              const isExpanded = expandedPrayer === prayer;
                              const activeOverride = overrides.find(o => {
                                  const today = new Date().toISOString().split('T')[0];
                                  return today >= o.startDate && today <= o.endDate;
                              });

                              return (
                                  <div key={prayer} className={`bg-white/5 rounded-xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-mosque-gold ring-1 ring-mosque-gold/30' : 'border-white/5 hover:border-white/20'}`}>
                                      {/* Row Header */}
                                      <div 
                                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5"
                                          onClick={() => setExpandedPrayer(isExpanded ? null : prayer)}
                                      >
                                          <div className="flex items-center gap-4">
                                              <div className="w-24 font-bold uppercase text-mosque-gold font-serif text-lg tracking-wide pl-2">{prayer}</div>
                                              {activeOverride ? (
                                                  <span className="bg-mosque-gold text-mosque-navy text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider shadow-sm">Active</span>
                                              ) : excelSchedule[new Date().toISOString().split('T')[0]] ? (
                                                  <span className="bg-blue-500/20 text-blue-200 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Excel</span>
                                              ) : (
                                                  <span className="bg-white/10 text-white/50 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Default</span>
                                              )}
                                          </div>
                                          <div className="flex items-center gap-4 text-sm text-white/60">
                                               {activeOverride ? (
                                                   <span className="font-mono text-xs bg-black/20 px-2 py-1 rounded">{activeOverride.start} / {activeOverride.iqamah}</span>
                                               ) : <span className="opacity-50 text-xs">Configure</span>}
                                               <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180 text-mosque-gold' : ''}`}>▼</div>
                                          </div>
                                      </div>

                                      {/* Expanded Config Area */}
                                      {isExpanded && (
                                          <div className="p-8 border-t border-white/10 bg-black/20">
                                              <div className="grid grid-cols-12 gap-8">
                                                  {/* LEFT COLUMN: Input Form */}
                                                  <div className="col-span-12 lg:col-span-8 space-y-6">
                                                      <h5 className="text-xs uppercase tracking-widest font-bold text-white/70 flex items-center gap-2 border-b border-white/5 pb-2">
                                                          <Plus className="w-3 h-3" /> Add Custom Schedule
                                                      </h5>
                                                      
                                                      <div className="flex flex-col md:flex-row gap-8">
                                                          <div className="flex-1 min-w-[350px]">
                                                              <label className={labelClass}>Select Date / Range</label>
                                                              <RangeCalendar 
                                                                startDate={newOverride.startDate || ''}
                                                                endDate={newOverride.endDate || ''}
                                                                onChange={(start, end) => setNewOverride({...newOverride, startDate: start, endDate: end})}
                                                              />
                                                          </div>
                                                          <div className="w-full md:w-[250px] shrink-0 flex flex-col space-y-4">
                                                              <div className="bg-white/5 p-5 rounded-xl border border-white/5 shadow-inner">
                                                                <h6 className="text-[10px] font-bold uppercase text-white/50 mb-4 text-center">Set Times</h6>
                                                                <div className="space-y-4">
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
                                                                </div>
                                                              </div>
                                                              <button 
                                                                  onClick={() => handleAddOverride(prayer)}
                                                                  className="w-full bg-mosque-navy border border-mosque-gold/50 hover:bg-mosque-gold hover:text-mosque-navy text-mosque-gold hover:border-mosque-gold text-xs font-bold uppercase tracking-widest py-4 rounded-lg transition-all shadow-lg"
                                                              >
                                                                  Apply Override
                                                              </button>
                                                          </div>
                                                      </div>
                                                  </div>

                                                  {/* RIGHT COLUMN: Active List */}
                                                  <div className="col-span-12 lg:col-span-4 bg-black/20 rounded-xl p-4 border border-white/5 h-fit max-h-[500px] overflow-hidden flex flex-col">
                                                      <h5 className="text-xs uppercase tracking-widest font-bold text-white/70 mb-4 border-b border-white/5 pb-2">Active Overrides</h5>
                                                      
                                                      {overrides.length === 0 ? (
                                                          <div className="text-white/20 text-xs italic text-center py-12 flex flex-col items-center gap-2">
                                                            <AlertTriangle className="w-8 h-8 opacity-20" />
                                                            No active overrides.
                                                          </div>
                                                      ) : (
                                                          <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1 flex-1">
                                                              {overrides.map(o => (
                                                                  <div key={o.id} className="flex flex-col bg-white/5 hover:bg-white/10 p-3 rounded border border-white/5 text-xs group relative">
                                                                      <button onClick={() => deleteOverride(o.id)} className="absolute top-2 right-2 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                                                      <div className="text-mosque-gold font-bold mb-1 flex items-center gap-1.5">
                                                                          <CalendarIcon className="w-3 h-3 opacity-50" />
                                                                          {o.startDate === o.endDate ? o.startDate : `${o.startDate} ...`}
                                                                      </div>
                                                                      <div className="text-white/70 font-mono">
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
                 <div className="max-w-4xl mx-auto space-y-8">
                     <div className="bg-white/5 border border-white/10 rounded-xl p-8">
                        <h4 className="text-xl text-white font-serif mb-6 border-b border-white/10 pb-2">Announcement Configuration</h4>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs uppercase tracking-widest text-mosque-gold mb-2 font-bold">Header Title</label>
                                <input 
                                    type="text" 
                                    value={announcement.title}
                                    onChange={(e) => setAnnouncement({...announcement, title: e.target.value})}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-4 text-white placeholder-white/20 focus:border-mosque-gold outline-none font-bold tracking-widest text-lg"
                                    placeholder="e.g. ANNOUNCEMENTS"
                                />
                                <p className="text-[10px] text-white/30 mt-1">This text appears in the fixed gold box on the left.</p>
                            </div>

                            <div>
                                <label className="block text-xs uppercase tracking-widest text-mosque-gold mb-2 font-bold">Scrolling Message</label>
                                <textarea 
                                    value={announcement.content}
                                    onChange={(e) => setAnnouncement({...announcement, content: e.target.value})}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-4 text-white placeholder-white/20 focus:border-mosque-gold outline-none text-xl min-h-[150px]"
                                    placeholder="Enter the message to scroll at the bottom..."
                                />
                                <p className="text-[10px] text-white/30 mt-1">This text scrolls continuously at the bottom of the screen.</p>
                            </div>
                        </div>
                     </div>
                 </div>
              )}

              {activeTab === 'customization' && (
                <div className="max-w-6xl mx-auto">
                    <div className="mb-8">
                        <h4 className="text-xl text-white font-serif mb-2">Background Theme</h4>
                        <p className="text-white/40 text-sm">Select a background style for the main display.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Theme Option 1 */}
                        <button 
                           onClick={() => setCurrentTheme('arabesque')}
                           className={`group relative h-56 rounded-xl border-2 overflow-hidden transition-all duration-300 ${currentTheme === 'arabesque' ? 'border-mosque-gold shadow-[0_0_30px_rgba(212,175,55,0.2)]' : 'border-white/10 hover:border-white/30'}`}
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
                           <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent">
                              <span className="text-white font-bold flex items-center gap-2 text-lg">Subtle Arabesque {currentTheme === 'arabesque' && <CheckCircle2 className="w-5 h-5 text-mosque-gold"/>}</span>
                              <span className="text-xs text-white/50 block mt-1">Default elegant geometric pattern</span>
                           </div>
                        </button>

                         {/* Theme Option 2 */}
                         <button 
                           onClick={() => setCurrentTheme('lattice')}
                           className={`group relative h-56 rounded-xl border-2 overflow-hidden transition-all duration-300 ${currentTheme === 'lattice' ? 'border-mosque-gold shadow-[0_0_30px_rgba(212,175,55,0.2)]' : 'border-white/10 hover:border-white/30'}`}
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
                           <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent">
                              <span className="text-white font-bold flex items-center gap-2 text-lg">Golden Lattice {currentTheme === 'lattice' && <CheckCircle2 className="w-5 h-5 text-mosque-gold"/>}</span>
                              <span className="text-xs text-white/50 block mt-1">Modern grid with gold accents</span>
                           </div>
                        </button>

                         {/* Theme Option 3: Starry Nights */}
                         <button 
                           onClick={() => setCurrentTheme('starry')}
                           className={`group relative h-56 rounded-xl border-2 overflow-hidden transition-all duration-300 ${currentTheme === 'starry' ? 'border-mosque-gold shadow-[0_0_30px_rgba(212,175,55,0.2)]' : 'border-white/10 hover:border-white/30'}`}
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
                           <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent">
                              <span className="text-white font-bold flex items-center gap-2 text-lg">Starry Nights {currentTheme === 'starry' && <CheckCircle2 className="w-5 h-5 text-mosque-gold"/>}</span>
                              <span className="text-xs text-white/50 block mt-1">Peaceful night sky with animated stars</span>
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