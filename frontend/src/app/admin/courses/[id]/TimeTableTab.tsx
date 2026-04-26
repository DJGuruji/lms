"use client";

import { useCallback, useEffect, useState } from "react";
import { 
  Plus, Trash2, Clock, Calendar, User, Save, Loader2, Layers, 
  ChevronRight, Edit3, ArrowLeft, GripVertical, X, Sparkles, BookOpen
} from "lucide-react";
import { api } from "@/lib/api";

type TimeTableEntry = {
  id?: string;
  dayOfWeek: string;
  title: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  teacherName?: string;
  timeTableId?: string;
};

type TimeTable = {
  id: string;
  courseId: string;
  entries: TimeTableEntry[];
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toAMPM(time24?: string) {
  if (!time24) return "";
  try {
    const [h, m] = time24.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 || 12;
    return `${displayH.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${ampm}`;
  } catch {
    return time24;
  }
}

export function TimeTableTab({ courseId }: { courseId: string }) {
  const [entries, setEntries] = useState<TimeTableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // UI States
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [selectedDay, setSelectedDay] = useState<string>("Monday");
  
  // Add Session Modal States
  const [isAddingSession, setIsAddingSession] = useState(false);
  const [newSession, setNewSession] = useState({
    title: "",
    startTime: "09:00",
    endTime: "10:00",
    teacherName: ""
  });

  const loadTimeTable = useCallback(async () => {
    try {
      const res = await api.get<TimeTable>(`/admin/courses/${courseId}/time-table`);
      if (res.data && res.data.entries) {
        setEntries(res.data.entries);
      }
    } catch (err) {
      console.error("Failed to load time table", err);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadTimeTable();
  }, [loadTimeTable]);

  const openAddModal = () => {
    const dayEntries = entries.filter((e) => e.dayOfWeek === selectedDay);
    let start = "09:00";
    let end = "10:00";

    if (dayEntries.length > 0) {
      const sorted = [...dayEntries].sort((a, b) => a.endTime.localeCompare(b.endTime));
      const last = sorted[sorted.length - 1];
      start = last.endTime;
      const [h, m] = start.split(":").map(Number);
      end = `${((h + 1) % 24).toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    }

    setNewSession({ title: "", startTime: start, endTime: end, teacherName: "" });
    setIsAddingSession(true);
  };

  const confirmAddSession = () => {
    if (!newSession.title.trim()) {
      alert("Please enter a title for the session.");
      return;
    }
    setEntries([
      ...entries,
      { dayOfWeek: selectedDay, ...newSession },
    ]);
    setIsAddingSession(false);
  };

  const removeEntry = (originalIndex: number) => {
    const newEntries = [...entries];
    newEntries.splice(originalIndex, 1);
    setEntries(newEntries);
  };

  const updateEntry = (originalIndex: number, field: keyof TimeTableEntry, value: string) => {
    const newEntries = [...entries];
    newEntries[originalIndex] = { ...newEntries[originalIndex], [field]: value };
    setEntries(newEntries);
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const payload = entries.map(({ id, timeTableId, ...rest }) => rest);
      await api.post(`/admin/courses/${courseId}/time-table`, { entries: payload });
      alert("Academic schedule saved successfully!");
      setMode("view");
      await loadTimeTable();
    } catch (err: any) {
      alert("Failed to save schedule.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
       <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
       <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Loading Schedule...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── ADD SESSION MODAL ───────────────────────────────────────────── */}
      {isAddingSession && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all animate-in fade-in duration-300">
           <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                       <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">New Session</h3>
                 </div>
                 <button 
                    onClick={() => setIsAddingSession(false)}
                    className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-slate-100 hover:shadow-sm"
                 >
                    <X className="w-5 h-5" />
                 </button>
              </div>

              <div className="p-8 space-y-6">
                 <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Session Title</label>
                    <div className="relative group">
                       <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                       <input 
                          value={newSession.title}
                          onChange={(e) => setNewSession({...newSession, title: e.target.value})}
                          autoFocus
                          placeholder="e.g. Mathematics Lecture"
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-900 font-bold placeholder:text-slate-300 outline-none focus:bg-white focus:border-indigo-400 transition-all"
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Starts At</label>
                       <div className="flex items-center gap-2 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-200 focus-within:bg-white focus-within:border-indigo-400 transition-all">
                          <input 
                            type="time"
                            value={newSession.startTime}
                            onChange={(e) => setNewSession({...newSession, startTime: e.target.value})}
                            className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none"
                          />
                          <span className="text-[10px] font-black text-indigo-600 whitespace-nowrap">{toAMPM(newSession.startTime)}</span>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Ends At</label>
                       <div className="flex items-center gap-2 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-200 focus-within:bg-white focus-within:border-indigo-400 transition-all">
                          <input 
                            type="time"
                            value={newSession.endTime}
                            onChange={(e) => setNewSession({...newSession, endTime: e.target.value})}
                            className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none"
                          />
                          <span className="text-[10px] font-black text-indigo-600 whitespace-nowrap">{toAMPM(newSession.endTime)}</span>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Teacher Name</label>
                    <div className="relative group">
                       <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                       <input 
                          value={newSession.teacherName}
                          onChange={(e) => setNewSession({...newSession, teacherName: e.target.value})}
                          placeholder="e.g. Dr. Smith"
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-900 font-bold placeholder:text-slate-300 outline-none focus:bg-white focus:border-indigo-400 transition-all"
                       />
                    </div>
                 </div>

                 <div className="flex items-center gap-3 pt-4">
                    <button 
                       onClick={() => setIsAddingSession(false)}
                       className="flex-1 px-6 py-4 rounded-2xl text-sm font-black text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                       Cancel
                    </button>
                    <button 
                       onClick={confirmAddSession}
                       className="flex-[2] bg-indigo-600 text-white px-6 py-4 rounded-2xl text-sm font-black shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 hover:-translate-y-0.5 active:scale-95 transition-all"
                    >
                       Add to {selectedDay}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* ── VIEW MODE ────────────────────────────────────────────────────── */}
      {mode === "view" ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                   <Calendar className="w-6 h-6" />
                </div>
                <div>
                   <h3 className="text-xl font-black text-slate-900 tracking-tight">Academic Timetable</h3>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Published Schedule View</p>
                </div>
             </div>
             <button 
                onClick={() => setMode("edit")}
                className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg active:scale-95"
             >
                <Edit3 className="w-4 h-4" /> Edit Schedule
             </button>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="w-32 py-4 px-8 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">Day</th>
                  <th className="py-4 px-8 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">Sessions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {DAYS.map((day, idx) => {
                  const dayEntries = entries
                    .filter((e) => e.dayOfWeek === day)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime));
                  
                  return (
                    <tr key={day} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-6 px-8 align-top">
                        <div className="flex flex-col">
                          <span className="text-lg font-black text-slate-900">{DAYS_SHORT[idx]}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{day}</span>
                        </div>
                      </td>
                      <td className="py-6 px-8">
                        <div className="flex flex-wrap gap-3">
                          {dayEntries.length === 0 ? (
                            <span className="text-xs font-bold text-slate-300 italic">No sessions</span>
                          ) : (
                            dayEntries.map((e, i) => (
                              <div key={i} className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm flex items-center gap-3">
                                <div className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{toAMPM(e.startTime)}</div>
                                <div className="text-sm font-black text-slate-800">{e.title}</div>
                                {e.teacherName && (
                                  <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                    <User className="w-3 h-3" /> {e.teacherName}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── EDIT MODE ──────────────────────────────────────────────────── */
        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
             <div className="flex items-center gap-4">
                <button 
                  onClick={() => setMode("view")}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-900"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                   <h3 className="text-xl font-black text-slate-900 tracking-tight">Modify Schedule</h3>
                   <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-0.5">Editing: {selectedDay}</p>
                </div>
             </div>
             <div className="flex items-center gap-3">
                <button 
                   onClick={() => setMode("view")}
                   className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                   Discard
                </button>
                <button 
                   onClick={onSave}
                   disabled={saving}
                   className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                   {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                   Save Changes
                </button>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Day Selector Sidebar */}
            <div className="lg:col-span-1 bg-white rounded-[2rem] border border-slate-200 p-3 shadow-sm h-fit">
              <p className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Day</p>
              {DAYS.map((day) => {
                const count = entries.filter((e) => e.dayOfWeek === day).length;
                const active = selectedDay === day;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all ${
                      active 
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" 
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-sm font-black tracking-tight">{day}</span>
                    <div className={`flex items-center gap-2 ${active ? "text-white" : "text-slate-400"}`}>
                       <span className="text-[10px] font-bold">{count}</span>
                       <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Entry Editor */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                   <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Sessions for {selectedDay}</h4>
                   <button 
                      onClick={openAddModal}
                      className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
                   >
                      <Plus className="w-4 h-4" /> Add Session
                   </button>
                </div>

                <div className="p-6 space-y-4">
                   {entries.filter(e => e.dayOfWeek === selectedDay).length === 0 ? (
                      <div className="py-20 text-center space-y-3">
                         <div className="p-4 bg-slate-50 w-fit mx-auto rounded-full">
                            <Clock className="w-8 h-8 text-slate-300" />
                         </div>
                         <p className="text-sm font-bold text-slate-400">No sessions scheduled for this day.</p>
                         <button 
                            onClick={openAddModal}
                            className="text-indigo-600 text-sm font-bold hover:underline"
                         >
                            Add your first session
                         </button>
                      </div>
                   ) : (
                      entries.map((e, i) => {
                        if (e.dayOfWeek !== selectedDay) return null;
                        return (
                          <div key={i} className="group relative bg-slate-50/50 border border-slate-100 rounded-3xl p-6 transition-all hover:bg-white hover:shadow-md hover:border-indigo-100">
                             <div className="flex items-start justify-between gap-4 mb-5">
                                <div className="flex items-center gap-3 flex-1">
                                   <GripVertical className="w-4 h-4 text-slate-300" />
                                   <input 
                                      value={e.title}
                                      onChange={(val) => updateEntry(i, "title", val.target.value)}
                                      placeholder="Event Title (e.g. Physics Lab)"
                                      className="w-full bg-transparent border-none p-0 text-lg font-black text-slate-900 placeholder:text-slate-300 focus:ring-0 outline-none"
                                   />
                                </div>
                                <button 
                                   onClick={() => removeEntry(i)}
                                   className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                >
                                   <Trash2 className="w-5 h-5" />
                                </button>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-1.5">
                                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Starts At</label>
                                   <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border border-slate-200">
                                      <input 
                                         type="time"
                                         value={e.startTime}
                                         onChange={(val) => updateEntry(i, "startTime", val.target.value)}
                                         className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none"
                                      />
                                      <span className="text-[10px] font-black text-indigo-600 whitespace-nowrap">{toAMPM(e.startTime)}</span>
                                   </div>
                                </div>
                                <div className="space-y-1.5">
                                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ends At</label>
                                   <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border border-slate-200">
                                      <input 
                                         type="time"
                                         value={e.endTime}
                                         onChange={(val) => updateEntry(i, "endTime", val.target.value)}
                                         className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none"
                                      />
                                      <span className="text-[10px] font-black text-indigo-600 whitespace-nowrap">{toAMPM(e.endTime)}</span>
                                   </div>
                                </div>
                                <div className="space-y-1.5">
                                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teacher</label>
                                   <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 border border-slate-200">
                                      <User className="w-4 h-4 text-slate-300" />
                                      <input 
                                         value={e.teacherName || ""}
                                         onChange={(val) => updateEntry(i, "teacherName", val.target.value)}
                                         placeholder="Name..."
                                         className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-300"
                                      />
                                   </div>
                                </div>
                             </div>
                          </div>
                        );
                      })
                   )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
