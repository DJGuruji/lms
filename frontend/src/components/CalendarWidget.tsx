"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X, 
  Clock, 
  Users, 
  Trash2, 
  Loader2,
  Calendar as CalendarIcon
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  audience: "ALL" | "INSTITUTION_ADMIN" | "TEACHERS" | "STUDENTS";
};

export function CalendarWidget({ isAdmin = false }: { isAdmin?: boolean }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Form State
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("10:00");
  const [newAudience, setNewAudience] = useState<CalendarEvent["audience"]>("ALL");
  const [saving, setSaving] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const monthStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, "0")}`;
      const url = isAdmin ? `/admin/calendar?month=${monthStr}` : `/calendar?month=${monthStr}`;
      const res = await api.get<CalendarEvent[]>(url);
      setEvents(res.data);
    } catch (err) {
      console.error("Failed to fetch calendar events", err);
    } finally {
      setLoading(false);
    }
  }, [currentDate, isAdmin]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(clickedDate);
    setIsModalOpen(true);
  };

  const handleAddEvent = async () => {
    if (!selectedDate || !newTitle.trim()) return;
    setSaving(true);
    try {
      await api.post("/admin/calendar", {
        title: newTitle,
        description: newDesc,
        date: selectedDate.toISOString().split("T")[0],
        startTime: newStart,
        endTime: newEnd,
        audience: newAudience
      });
      setIsAddModalOpen(false);
      setNewTitle("");
      setNewDesc("");
      fetchEvents();
    } catch (err) {
      console.error("Failed to add event", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      await api.delete(`/admin/calendar/${id}`);
      fetchEvents();
    } catch (err) {
      console.error("Failed to delete event", err);
    }
  };

  const getEventsForDay = (day: number) => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split("T")[0];
    return events.filter(e => e.date.split("T")[0] === dateStr);
  };

  const formatAMPM = (time?: string) => {
    if (!time) return "";
    const [h, m] = time.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hh = h % 12 || 12;
    return `${hh}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  return (
    <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-slate-800">
          {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
        </h4>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4 text-slate-400" />
          </button>
          <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i} className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayEvents = getEventsForDay(day);
          const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
          
          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              className={`relative flex h-8 w-full items-center justify-center rounded-lg text-xs font-bold transition-all ${
                isToday ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {day}
              {dayEvents.length > 0 && !isToday && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                   <span className="w-1 h-1 rounded-full bg-blue-400" />
                   {dayEvents.length > 1 && <span className="w-1 h-1 rounded-full bg-indigo-400" />}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Events Modal */}
      {isModalOpen && selectedDate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md max-h-[80vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
               <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    {selectedDate.toLocaleDateString("default", { day: "numeric", month: "long", year: "numeric" })}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Events for today</p>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-slate-100">
                  <X className="w-5 h-5" />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
               {getEventsForDay(selectedDate.getDate()).length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-12 text-slate-300 gap-2">
                    <CalendarIcon className="w-10 h-10 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest">No events scheduled</p>
                 </div>
               ) : (
                 getEventsForDay(selectedDate.getDate()).map((event) => (
                   <div key={event.id} className="group relative bg-slate-50/50 border border-slate-100 rounded-2xl p-4 transition-all hover:bg-white hover:shadow-md hover:border-blue-100">
                      <div className="flex items-start justify-between mb-2">
                         <h4 className="text-sm font-black text-slate-900 pr-8">{event.title}</h4>
                         {isAdmin && (
                            <button 
                              onClick={() => handleDeleteEvent(event.id)}
                              className="absolute top-4 right-4 p-1.5 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                               <Trash2 className="w-4 h-4" />
                            </button>
                         )}
                      </div>
                      {event.description && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{event.description}</p>}
                      <div className="flex flex-wrap gap-3">
                         <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg uppercase">
                            <Clock className="w-3 h-3" />
                            {formatAMPM(event.startTime)} – {formatAMPM(event.endTime)}
                         </div>
                         <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg uppercase">
                            <Users className="w-3 h-3" />
                            {event.audience.replace("_", " ")}
                         </div>
                      </div>
                   </div>
                 ))
               )}
            </div>

            {isAdmin && (
               <div className="p-6 bg-slate-50 border-t border-slate-100">
                  <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  >
                     <Plus className="w-4 h-4" /> Add Event
                  </button>
               </div>
            )}
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {isAddModalOpen && (
         <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
               <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Create Event</h3>
                  <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-white rounded-full text-slate-400">
                     <X className="w-5 h-5" />
                  </button>
               </div>
               
               <div className="p-8 space-y-5">
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Title</label>
                     <input 
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        placeholder="e.g. Board Meeting"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-400 transition-all"
                     />
                  </div>

                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description (Optional)</label>
                     <textarea 
                        value={newDesc}
                        onChange={e => setNewDesc(e.target.value)}
                        placeholder="Details..."
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-400 transition-all resize-none"
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Starts At</label>
                        <input 
                           type="time"
                           value={newStart}
                           onChange={e => setNewStart(e.target.value)}
                           className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none"
                        />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ends At</label>
                        <input 
                           type="time"
                           value={newEnd}
                           onChange={e => setNewEnd(e.target.value)}
                           className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none"
                        />
                     </div>
                  </div>

                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Display Audience</label>
                     <select 
                        value={newAudience}
                        onChange={e => setNewAudience(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-400 appearance-none"
                     >
                        <option value="ALL">All (Default)</option>
                        <option value="INSTITUTION_ADMIN">Institution Admin Only</option>
                        <option value="TEACHERS">Teachers (Inc. Admin)</option>
                        <option value="STUDENTS">Students (Inc. Everyone)</option>
                     </select>
                  </div>

                  <div className="flex gap-3 pt-4">
                     <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-colors">Cancel</button>
                     <button 
                        onClick={handleAddEvent} 
                        disabled={saving}
                        className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl text-sm font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                     >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {saving ? "Creating..." : "Confirm Event"}
                     </button>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
