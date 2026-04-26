"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Calendar, Clock, User, Layers, Info } from "lucide-react";
import { api } from "@/lib/api";

type TimeTableEntry = {
  id: string;
  dayOfWeek: string;
  title: string;
  startTime: string;
  endTime: string;
  teacherName?: string;
};

type TimeTable = {
  id: string;
  entries: TimeTableEntry[];
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Distinct background colors for each day row
const DAY_COLORS = [
  "bg-blue-50/40",
  "bg-indigo-50/40",
  "bg-emerald-50/40",
  "bg-rose-50/40",
  "bg-amber-50/40",
  "bg-violet-50/40",
  "bg-cyan-50/40",
];

const DAY_TEXT_COLORS = [
  "text-blue-600",
  "text-indigo-600",
  "text-emerald-600",
  "text-rose-600",
  "text-amber-600",
  "text-violet-600",
  "text-cyan-600",
];

// Helper to format 24h string to AM/PM for display
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

export function StudentTimeTableModal({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const [entries, setEntries] = useState<TimeTableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTimeTable = useCallback(async () => {
    try {
      const res = await api.get<TimeTable>(`/student/courses/${courseId}/time-table`);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-[#f8fafc] rounded-[2.5rem] w-[95%] max-w-7xl max-h-[95vh] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col border border-white/40 animate-in zoom-in-95 duration-300">
        
        {/* Header Section */}
        <div className="px-10 py-6 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
             <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
                <Calendar className="h-6 w-6 text-white" />
             </div>
             <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Academic Schedule</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Weekly Course Timeline</p>
             </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all border border-slate-100 bg-white shadow-sm active:scale-90"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Schedule Table Body */}
        <div className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
               <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
               <p className="text-slate-500 font-bold text-sm tracking-widest uppercase">Fetching Schedule...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 bg-white rounded-[2rem] border-2 border-dashed border-slate-200 gap-4 text-center px-10">
              <div className="p-5 bg-slate-50 rounded-full">
                 <Info className="w-10 h-10 text-slate-300" />
              </div>
              <p className="text-slate-400 font-bold max-w-xs">No schedule has been published for this course yet.</p>
            </div>
          ) : (
            <div className="min-w-[900px] bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
               <table className="w-full border-collapse">
                  <thead>
                     <tr className="bg-slate-50/50">
                        <th className="w-24 py-4 px-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">Day</th>
                        <th className="py-4 px-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">Scheduled Sessions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {DAYS.map((day, idx) => {
                        const dayEntries = entries
                           .filter(e => e.dayOfWeek === day)
                           .sort((a, b) => a.startTime.localeCompare(b.startTime));
                        
                        return (
                           <tr key={day} className={`group transition-colors ${DAY_COLORS[idx]}`}>
                              <td className="py-6 px-6 align-top border-r border-slate-100/50">
                                 <div className="flex flex-col">
                                    <span className={`text-lg font-black ${DAY_TEXT_COLORS[idx]}`}>{DAYS_SHORT[idx]}</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{day}</span>
                                 </div>
                              </td>
                              <td className="py-6 px-6">
                                 <div className="flex flex-wrap gap-2.5">
                                    {dayEntries.length === 0 ? (
                                       <div className="text-[10px] font-bold text-slate-300 italic py-2">No sessions scheduled</div>
                                    ) : (
                                       dayEntries.map((entry) => (
                                          <div 
                                             key={entry.id}
                                             className="flex-none w-[200px] bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all group/card"
                                          >
                                             <div className="flex items-center justify-between mb-2">
                                                <div className="px-2 py-0.5 bg-slate-50 text-slate-600 text-[9px] font-black rounded-md uppercase tracking-wider flex items-center gap-1">
                                                   <Clock className="w-2.5 h-2.5 text-indigo-500" />
                                                   {toAMPM(entry.startTime)}
                                                </div>
                                                <div className="text-[9px] font-bold text-slate-300">to</div>
                                                <div className="px-2 py-0.5 bg-slate-50 text-slate-600 text-[9px] font-black rounded-md uppercase tracking-wider flex items-center gap-1">
                                                   {toAMPM(entry.endTime)}
                                                </div>
                                             </div>
                                             
                                             <h4 className="text-xs font-black text-slate-900 mb-1.5 line-clamp-1 group-hover/card:text-indigo-600 transition-colors">{entry.title}</h4>
                                             
                                             {entry.teacherName && (
                                               <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 mt-2 pt-2 border-t border-slate-50">
                                                  <User className="w-3 h-3 text-slate-300" />
                                                  <span className="truncate">{entry.teacherName}</span>
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
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-10 py-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
           <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">
              <Layers className="w-3 h-3" />
              LMS Learning System
           </div>
           <p className="text-[10px] font-bold text-slate-400 italic">Sessions are displayed in chronological order</p>
        </div>
      </div>
    </div>
  );
}
