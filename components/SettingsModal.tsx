import React, { useState } from 'react';
import { X, Save, Clock, Type, Settings as SettingsIcon, Upload, Calendar, Plus, Trash2, Edit2, AlertTriangle } from 'lucide-react';
import { Announcement, Event, AppSettings, ExcelDaySchedule, ManualOverride } from '../types';
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
  events: Event[];
  setEvents: (e: Event[]) => void;
  appSettings: AppSettings;
  setAppSettings: (s: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, 
  excelSchedule, setExcelSchedule, 
  manualOverrides, setManualOverrides,
  announcement, setAnnouncement
}) => {
  const [activeTab, setActiveTab] = useState<'prayers' | 'content'>('prayers');
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

  const prayersList = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'jumuah'];

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-8">
      <div className="bg-mosque-navy w-full max-w-5xl max-h-full rounded-2xl shadow-2xl border border-mosque-gold/30 flex flex-col overflow-hidden relative">
        
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] opacity-5 pointer-events-none"></div>

        {/* Header */}
        <div className="relative z-10 bg-gradient-to-r from-mosque-navy to-mosque-dark p-6 border-b border-white/10 flex justify-between items-center shadow-lg">
          <h2 className="text-3xl text-mosque-gold font-serif flex items-center gap-3 drop-shadow-sm">
            <SettingsIcon className="w-6 h-6 text-white/50" /> 
            <span>Settings</span>
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors hover:rotate-90 duration-300">
            <X className="w-8 h-8" />
          </button>
        </div>

        {/* Tabs */}
        <div className="relative z-10 flex border-b border-white/10 bg-black/20">
          {[
            { id: 'prayers', icon: Clock, label: 'Schedule & Overrides' },
            { id: 'content', icon: Type, label: 'Content' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-5 flex items-center justify-center gap-3 font-medium tracking-wide text-sm uppercase transition-all duration-300 relative overflow-hidden group
                ${activeTab === tab.id ? 'text-mosque-navy' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
            >
              {activeTab === tab.id && (
                <div className="absolute inset-0 bg-gradient-to-t from-mosque-gold to-yellow-600"></div>
              )}
              <span className="relative z-10 flex items-center gap-2">
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-mosque-navy' : 'text-mosque-gold'}`} /> 
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 p-8 overflow-y-auto flex-1 text-white custom-scrollbar">
          
          {activeTab === 'prayers' && (
            <div className="space-y-8">
              
              {/* 1. Global Excel Import */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex items-center justify-between group hover:border-mosque-gold/30 transition-colors">
                 <div className="flex-1">
                    <h3 className="text-mosque-gold font-serif text-lg mb-1 flex items-center gap-2">
                        <Upload className="w-4 h-4" /> Global Schedule Import (Excel)
                    </h3>
                    <p className="text-xs text-white/50 max-w-lg leading-relaxed">
                        Upload the annual prayer schedule. This file serves as the base schedule for the entire year. 
                        Manual overrides below will take precedence over this data.
                    </p>
                    {uploadStatus && (
                        <div className={`text-xs mt-3 font-mono px-3 py-1 rounded inline-block ${uploadStatus.includes('Error') ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                            {uploadStatus}
                        </div>
                    )}
                 </div>
                 <div>
                    <input 
                        type="file" 
                        accept=".xlsx, .xls"
                        onChange={handleFileUpload}
                        className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-mosque-gold file:text-mosque-navy hover:file:bg-white transition-all cursor-pointer"
                    />
                 </div>
              </div>

              {/* 2. Prayer List for Manual Overrides */}
              <div>
                  <h3 className="text-white font-bold uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                      <Edit2 className="w-3 h-3 text-mosque-gold" /> Manual Overrides & Configuration
                  </h3>
                  
                  <div className="space-y-3">
                      {prayersList.map((prayer) => {
                          const overrides = manualOverrides.filter(o => o.prayerKey === prayer);
                          const isExpanded = expandedPrayer === prayer;
                          const activeOverride = overrides.find(o => {
                              const today = new Date().toISOString().split('T')[0];
                              return today >= o.startDate && today <= o.endDate;
                          });

                          return (
                              <div key={prayer} className={`bg-white/5 rounded-xl border ${isExpanded ? 'border-mosque-gold' : 'border-white/5'} transition-all duration-300 overflow-hidden`}>
                                  
                                  {/* Row Header */}
                                  <div 
                                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5"
                                      onClick={() => setExpandedPrayer(isExpanded ? null : prayer)}
                                  >
                                      <div className="flex items-center gap-4">
                                          <div className="w-24 font-bold uppercase text-mosque-gold font-serif text-lg tracking-wide">{prayer}</div>
                                          
                                          {/* Status Badge */}
                                          {activeOverride ? (
                                              <span className="bg-mosque-gold text-mosque-navy text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                                  Manual Active
                                              </span>
                                          ) : excelSchedule[new Date().toISOString().split('T')[0]] ? (
                                              <span className="bg-blue-500/20 text-blue-200 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                                  Excel Sched.
                                              </span>
                                          ) : (
                                              <span className="bg-white/10 text-white/50 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                                  Default
                                              </span>
                                          )}
                                      </div>

                                      <div className="flex items-center gap-4 text-sm text-white/60">
                                           {activeOverride ? (
                                               <span>Current: {activeOverride.start} / {activeOverride.iqamah}</span>
                                           ) : (
                                               <span className="opacity-50 text-xs">Click to configure</span>
                                           )}
                                           <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>▼</div>
                                      </div>
                                  </div>

                                  {/* Expanded Config Area */}
                                  {isExpanded && (
                                      <div className="p-6 border-t border-white/10 bg-black/20">
                                          
                                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                              {/* Add New Override Form */}
                                              <div className="space-y-4">
                                                  <h4 className="text-xs uppercase tracking-widest font-bold text-white/70 mb-4 flex items-center gap-2">
                                                      <Plus className="w-3 h-3" /> Add Custom Schedule
                                                  </h4>
                                                  
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
                                                          <label className={labelClass}>{prayer === 'jumuah' ? 'Start' : 'Adhan'}</label>
                                                          <input 
                                                              type="text" 
                                                              placeholder="e.g. 5:00 AM"
                                                              value={newOverride.start}
                                                              onChange={e => setNewOverride({...newOverride, start: e.target.value})}
                                                              className={inputClass} 
                                                          />
                                                      </div>
                                                      <div>
                                                          <label className={labelClass}>Iqamah</label>
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
                                                      className="w-full bg-white/10 hover:bg-mosque-gold hover:text-mosque-navy text-white text-xs font-bold uppercase tracking-widest py-3 rounded-lg transition-all"
                                                  >
                                                      Apply Override
                                                  </button>
                                              </div>

                                              {/* Existing Overrides List */}
                                              <div className="bg-black/20 rounded-lg p-4 h-full">
                                                  <h4 className="text-xs uppercase tracking-widest font-bold text-white/70 mb-4">Active Overrides</h4>
                                                  
                                                  {overrides.length === 0 ? (
                                                      <div className="text-white/20 text-xs italic text-center py-8">No overrides configured.</div>
                                                  ) : (
                                                      <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                                                          {overrides.map(o => (
                                                              <div key={o.id} className="flex items-center justify-between bg-white/5 p-3 rounded border border-white/5 text-xs">
                                                                  <div>
                                                                      <div className="text-mosque-gold font-bold mb-1">
                                                                          {o.startDate} <span className="text-white/50 mx-1">to</span> {o.endDate}
                                                                      </div>
                                                                      <div className="text-white/70">
                                                                          {o.start} / {o.iqamah}
                                                                      </div>
                                                                  </div>
                                                                  <button 
                                                                      onClick={() => deleteOverride(o.id)}
                                                                      className="text-red-400 hover:text-red-300 p-2 hover:bg-white/5 rounded"
                                                                  >
                                                                      <Trash2 className="w-3 h-3" />
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
            <div className="space-y-6 p-4">
               <div>
                  <label className={labelClass}>Ticker Title</label>
                  <input 
                    type="text" 
                    value={announcement.title}
                    onChange={(e) => setAnnouncement({...announcement, title: e.target.value})}
                    className={inputClass}
                    placeholder="e.g., ANNOUNCEMENTS"
                  />
               </div>
               
               <div>
                  <label className={labelClass}>Ticker Content</label>
                  <textarea 
                    value={announcement.content}
                    onChange={(e) => setAnnouncement({...announcement, content: e.target.value})}
                    rows={6}
                    className={`${inputClass} resize-none leading-relaxed`}
                    placeholder="Enter the scrolling text for the bottom bar..."
                  />
               </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="relative z-10 bg-mosque-dark p-6 border-t border-white/10 flex justify-between items-center">
          <div className="text-[10px] text-white/30 uppercase tracking-widest">
              Last saved: {new Date().toLocaleTimeString()}
          </div>
          <button 
            onClick={onClose}
            className="flex items-center gap-2 bg-gradient-to-r from-yellow-600 to-mosque-gold text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:shadow-mosque-gold/20 hover:-translate-y-0.5 transition-all duration-300 active:scale-95"
          >
            <Save className="w-5 h-5" /> Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
