import React, { useState } from 'react';
import { X, Save, Settings as SettingsIcon, Upload, Calendar, Plus, Trash2, Edit2, AlertTriangle, LayoutDashboard, MessageSquare, Type } from 'lucide-react';
import { Announcement, ExcelDaySchedule, ManualOverride } from '../types';
import * as XLSX from 'xlsx';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  
  // Data Sources
  excelSchedule: Record<string, ExcelDaySchedule>;
  setExcelSchedule: (schedule: Record<string, ExcelDaySchedule>) => void;
  manualOverrides: ManualOverride[];
  setManualOverrides: (overrides: ManualOverride[]) => void;

  announcement: Announcement;
  setAnnouncement: (a: Announcement) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, 
  excelSchedule, setExcelSchedule, 
  manualOverrides, setManualOverrides,
  announcement, setAnnouncement
}) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'content'>('schedule');
  const [uploadStatus, setUploadStatus] = useState<string>("");
  
  // State for the expanded prayer configuration
  const [expandedPrayer, setExpandedPrayer] = useState<string | null>(null);
  
  // State for adding a new override
  const [newOverride, setNewOverride] = useState<Partial<ManualOverride>>({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    start: '',
    iqamah: ''
  });

  if (!isOpen) return null;

  // --- Excel Helpers ---
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

    setUploadStatus("Processing full year schedule...");

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (jsonData.length < 2) {
        setUploadStatus("Error: Empty file");
        return;
      }

      const newSchedule: Record<string, ExcelDaySchedule> = {};
      let count = 0;

      // Start from row 1 (skip header)
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row[0]) continue;

        // Parse Date
        let dateKey = "";
        if (typeof row[0] === 'number') {
             const dateObj = XLSX.SSF.parse_date_code(row[0]);
             if (dateObj) dateKey = `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
        } else if (typeof row[0] === 'string') {
             // Try to parse string date
             const d = new Date(row[0]);
             if (!isNaN(d.getTime())) {
                 dateKey = d.toISOString().split('T')[0];
             } else {
                 dateKey = row[0]; // Assume correct format if not parseable standard
             }
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
      setUploadStatus(`Success! Imported schedule for ${count} days.`);

      // Update announcement for upcoming changes logic (simplified check for "tomorrow")
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      
      if (newSchedule[today] && newSchedule[tomorrow]) {
         const t = newSchedule[today];
         const tm = newSchedule[tomorrow];
         const changes = [];
         if (t.fajr.iqamah !== tm.fajr.iqamah) changes.push(`Fajr ${tm.fajr.iqamah}`);
         if (t.dhuhr.iqamah !== tm.dhuhr.iqamah) changes.push(`Dhuhr ${tm.dhuhr.iqamah}`);
         if (t.asr.iqamah !== tm.asr.iqamah) changes.push(`Asr ${tm.asr.iqamah}`);
         if (t.maghrib.iqamah !== tm.maghrib.iqamah) changes.push(`Maghrib ${tm.maghrib.iqamah}`);
         if (t.isha.iqamah !== tm.isha.iqamah) changes.push(`Isha ${tm.isha.iqamah}`);

         if (changes.length > 0) {
            const msg = `Iqamah Change Tomorrow: ${changes.join(', ')}`;
             if (!announcement.content.includes(msg)) {
                  setAnnouncement({
                      ...announcement,
                      content: `${announcement.content} • ${msg}`
                  });
              }
         }
      }

    } catch (err) {
      console.error(err);
      setUploadStatus("Error processing file. Please check format.");
    }
  };

  // --- Manual Override Helpers ---
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
    // Reset form
    setNewOverride({
        startDate: newOverride.startDate,
        endDate: newOverride.endDate,
        start: '',
        iqamah: ''
    });
  };

  const deleteOverride = (id: string) => {
    setManualOverrides(manualOverrides.filter(o => o.id !== id));
  };

  // Common styling
  const inputClass = "w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/20 focus:border-mosque-gold focus:ring-1 focus:ring-mosque-gold outline-none transition-all duration-300 font-mono text-sm";
  const labelClass = "block text-[10px] uppercase tracking-[0.15em] text-mosque-gold/80 mb-2 font-semibold";
  const sidebarItemClass = (id: string) => `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${activeTab === id ? 'bg-mosque-gold text-mosque-navy font-bold shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`;

  const prayersList = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'jumuah'];

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-8">
      <div className="bg-mosque-navy w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl border border-mosque-gold/30 flex overflow-hidden relative">
        
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] opacity-5 pointer-events-none"></div>

        {/* Sidebar */}
        <div className="w-64 bg-black/30 border-r border-white/10 flex flex-col relative z-20 backdrop-blur-md">
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
              <button onClick={() => setActiveTab('content')} className={sidebarItemClass('content')}>
                 <MessageSquare className="w-4 h-4" />
                 <span className="text-sm tracking-wide uppercase">Content</span>
              </button>
           </nav>

           <div className="p-4 border-t border-white/10 text-xs text-center text-white/20">
              v1.0.0 • Markaz Masjid
           </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative z-10 bg-gradient-to-br from-mosque-navy/50 to-mosque-dark/50">
           
           {/* Header */}
           <div className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-black/10">
               <h3 className="text-white font-serif text-xl tracking-wide">
                  {activeTab === 'schedule' ? 'Prayer Schedule & Overrides' : 'Announcements & Alerts'}
               </h3>
               <button onClick={onClose} className="text-white/40 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all duration-300">
                  <X className="w-6 h-6" />
               </button>
           </div>

           {/* Scrollable Body */}
           <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              
              {activeTab === 'schedule' && (
                <div className="space-y-8 max-w-4xl mx-auto">
                  
                  {/* Excel Import Section */}
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
                           <input 
                              type="file" 
                              accept=".xlsx, .xls"
                              onChange={handleFileUpload}
                              className="hidden"
                           />
                        </label>
                     </div>
                     {uploadStatus && (
                        <div className={`text-xs font-mono p-3 rounded bg-black/30 border border-white/5 ${uploadStatus.includes('Error') ? 'text-red-300' : 'text-green-300'}`}>
                            {uploadStatus}
                        </div>
                     )}
                  </div>

                  {/* Manual Overrides Section */}
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
                                              
                                              {/* Status Badge */}
                                              {activeOverride ? (
                                                  <span className="bg-mosque-gold text-mosque-navy text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider shadow-sm">
                                                      Manual Active
                                                  </span>
                                              ) : excelSchedule[new Date().toISOString().split('T')[0]] ? (
                                                  <span className="bg-blue-500/20 text-blue-200 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                                                      Excel Data
                                                  </span>
                                              ) : (
                                                  <span className="bg-white/10 text-white/50 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                                                      Default
                                                  </span>
                                              )}
                                          </div>

                                          <div className="flex items-center gap-4 text-sm text-white/60">
                                               {activeOverride ? (
                                                   <span className="font-mono text-xs bg-black/20 px-2 py-1 rounded">{activeOverride.start} / {activeOverride.iqamah}</span>
                                               ) : (
                                                   <span className="opacity-50 text-xs">Configure</span>
                                               )}
                                               <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180 text-mosque-gold' : ''}`}>▼</div>
                                          </div>
                                      </div>

                                      {/* Expanded Config Area */}
                                      {isExpanded && (
                                          <div className="p-6 border-t border-white/10 bg-black/20">
                                              
                                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                  {/* Add New Override Form */}
                                                  <div className="space-y-4">
                                                      <h5 className="text-xs uppercase tracking-widest font-bold text-white/70 mb-4 flex items-center gap-2 border-b border-white/5 pb-2">
                                                          <Plus className="w-3 h-3" /> Add Custom Schedule
                                                      </h5>
                                                      
                                                      <div className="grid grid-cols-2 gap-4">
                                                          <div>
                                                              <label className={labelClass}>Start Date</label>
                                                              <div className="relative">
                                                                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-mosque-gold" />
                                                                  <input 
                                                                      type="date" 
                                                                      value={newOverride.startDate}
                                                                      onChange={e => setNewOverride({...newOverride, startDate: e.target.value})}
                                                                      className={`${inputClass} pl-8`} 
                                                                  />
                                                              </div>
                                                          </div>
                                                          <div>
                                                              <label className={labelClass}>End Date</label>
                                                              <div className="relative">
                                                                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-mosque-gold" />
                                                                  <input 
                                                                      type="date" 
                                                                      value={newOverride.endDate}
                                                                      onChange={e => setNewOverride({...newOverride, endDate: e.target.value})}
                                                                      className={`${inputClass} pl-8`} 
                                                                  />
                                                              </div>
                                                          </div>
                                                      </div>

                                                      <div className="grid grid-cols-2 gap-4">
                                                          <div>
                                                              <label className={labelClass}>{prayer === 'jumuah' ? 'Start Time' : 'Adhan Time'}</label>
                                                              <input 
                                                                  type="text" 
                                                                  placeholder="e.g. 5:00 AM"
                                                                  value={newOverride.start}
                                                                  onChange={e => setNewOverride({...newOverride, start: e.target.value})}
                                                                  className={inputClass} 
                                                              />
                                                          </div>
                                                          <div>
                                                              <label className={labelClass}>Iqamah Time</label>
                                                              <input 
                                                                  type="text" 
                                                                  placeholder="e.g. 5:30 AM"
                                                                  value={newOverride.iqamah}
                                                                  onChange={e => setNewOverride({...newOverride, iqamah: e.target.value})}
                                                                  className={inputClass} 
                                                              />
                                                          </div>
                                                      </div>

                                                      <button 
                                                          onClick={() => handleAddOverride(prayer)}
                                                          className="w-full bg-mosque-navy border border-mosque-gold/50 hover:bg-mosque-gold hover:text-mosque-navy text-mosque-gold hover:border-mosque-gold text-xs font-bold uppercase tracking-widest py-3 rounded-lg transition-all shadow-lg mt-2"
                                                      >
                                                          Apply Override
                                                      </button>
                                                  </div>

                                                  {/* Existing Overrides List */}
                                                  <div className="bg-black/20 rounded-lg p-4 h-full border border-white/5">
                                                      <h5 className="text-xs uppercase tracking-widest font-bold text-white/70 mb-4 border-b border-white/5 pb-2">Active Overrides</h5>
                                                      
                                                      {overrides.length === 0 ? (
                                                          <div className="text-white/20 text-xs italic text-center py-8 flex flex-col items-center gap-2">
                                                            <AlertTriangle className="w-6 h-6 opacity-20" />
                                                            No overrides configured.
                                                          </div>
                                                      ) : (
                                                          <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                                                              {overrides.map(o => (
                                                                  <div key={o.id} className="flex items-center justify-between bg-white/5 hover:bg-white/10 p-3 rounded border border-white/5 text-xs group transition-colors">
                                                                      <div>
                                                                          <div className="text-mosque-gold font-bold mb-1 flex items-center gap-2">
                                                                              <Calendar className="w-3 h-3 opacity-50" />
                                                                              {o.startDate} <span className="text-white/30">➔</span> {o.endDate}
                                                                          </div>
                                                                          <div className="text-white/70 font-mono ml-5">
                                                                              {o.start} - {o.iqamah}
                                                                          </div>
                                                                      </div>
                                                                      <button 
                                                                          onClick={() => deleteOverride(o.id)}
                                                                          className="text-white/20 hover:text-red-400 p-2 rounded transition-colors"
                                                                          title="Delete Override"
                                                                      >
                                                                          <Trash2 className="w-4 h-4" />
                                                                      </button>
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

              {activeTab === 'content' && (
                <div className="max-w-3xl mx-auto space-y-8">
                   <div className="bg-white/5 p-8 rounded-2xl border border-white/10 shadow-xl">
                      <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                         <div className="p-2 bg-mosque-gold/10 rounded-lg">
                           <Type className="w-5 h-5 text-mosque-gold" />
                         </div>
                         <div>
                           <h4 className="text-lg text-white font-bold">Bottom Ticker</h4>
                           <p className="text-xs text-white/50">Manage the scrolling announcements bar at the bottom of the screen.</p>
                         </div>
                      </div>

                      <div className="space-y-6">
                        <div>
                            <label className={labelClass}>Section Title</label>
                            <input 
                              type="text" 
                              value={announcement.title}
                              onChange={(e) => setAnnouncement({...announcement, title: e.target.value})}
                              className={inputClass}
                              placeholder="e.g., ANNOUNCEMENTS"
                            />
                            <p className="text-white/20 text-[10px] mt-1">Displayed in the gold box on the left.</p>
                        </div>
                        
                        <div>
                            <label className={labelClass}>Scrolling Content</label>
                            <textarea 
                              value={announcement.content}
                              onChange={(e) => setAnnouncement({...announcement, content: e.target.value})}
                              rows={6}
                              className={`${inputClass} resize-none leading-relaxed p-4`}
                              placeholder="Enter the scrolling text..."
                            />
                            <p className="text-white/30 text-xs mt-2 flex items-center gap-1 justify-end">
                              <span className="w-1 h-1 bg-mosque-gold rounded-full inline-block"></span>
                              Separate distinct announcements with punctuation for clarity.
                            </p>
                        </div>
                      </div>
                   </div>
                </div>
              )}
           </div>

           {/* Footer Action Bar */}
           <div className="h-20 bg-black/20 border-t border-white/10 flex items-center justify-end px-8 backdrop-blur-sm z-20">
              <button 
                onClick={onClose}
                className="flex items-center gap-2 bg-gradient-to-r from-yellow-600 to-mosque-gold text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:shadow-mosque-gold/20 hover:-translate-y-0.5 transition-all duration-300 active:scale-95 text-sm uppercase tracking-wider"
              >
                <Save className="w-4 h-4" /> Save Configuration
              </button>
           </div>

        </div>
      </div>
    </div>
  );
};