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
  Calendar as CalendarIcon,
  Edit2,
  Sparkles,
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
  createdById: string;
  creator?: { id: string; name: string };
};

export default function CalendarPage({ isAdmin = false, isTeacher = false }: { isAdmin?: boolean, isTeacher?: boolean }) {
  const { user } = useAuthStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startTime: "09:00",
    endTime: "10:00",
    audience: "ALL" as CalendarEvent["audience"]
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSelectedDate(new Date());
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const monthStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, "0")}`;
      const url = (isAdmin || isTeacher) ? `/admin/calendar?month=${monthStr}` : `/calendar?month=${monthStr}`;
      const res = await api.get<CalendarEvent[]>(url);
      setEvents(res.data);
      
      // Mark as viewed
      api.post("/calendar/viewed").catch(() => {});
    } catch (err) {
      console.error("Failed to fetch calendar events", err);
    } finally {
      setLoading(false);
    }
  }, [currentDate, isAdmin, isTeacher]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleOpenCreate = () => {
    setEditingEvent(null);
    setFormData({ title: "", description: "", startTime: "09:00", endTime: "10:00", audience: "ALL" });
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      startTime: event.startTime || "09:00",
      endTime: event.endTime || "10:00",
      audience: event.audience
    });
    setIsFormModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedDate || !formData.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...formData,
        date: selectedDate.toISOString().split("T")[0]
      };

      if (editingEvent) {
        await api.patch(`/admin/calendar/${editingEvent.id}`, payload);
      } else {
        await api.post("/admin/calendar", payload);
      }
      
      setIsFormModalOpen(false);
      fetchEvents();
    } catch (err) {
      console.error("Failed to save event", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      await api.delete(`/admin/calendar/${id}`);
      fetchEvents();
    } catch (err) {
      console.error("Failed to delete event", err);
    }
  };

  const getEventsForDay = (day: number) => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = d.toLocaleDateString('en-CA'); // YYYY-MM-DD local
    return events.filter(e => e.date.split("T")[0] === dateStr);
  };

  const formatAMPM = (time?: string) => {
    if (!time) return "";
    const [h, m] = time.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hh = h % 12 || 12;
    return `${hh}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  const canManage = (event: CalendarEvent) => {
    if (isAdmin) return true;
    if (isTeacher && event.createdById === user?.id) return true;
    return false;
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-700 bg-slate-50/30">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/80 backdrop-blur-md p-8 rounded-[2.5rem] border border-slate-200/50 shadow-sm">
        <div className="flex items-center gap-5">
           <div className="h-14 w-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
              <CalendarIcon className="h-6 w-6" />
           </div>
           <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase tracking-widest">Academic Calendar</h3>
              <p className="text-sm font-bold text-slate-400">
                {currentDate.toLocaleString("en-US", { month: "long", year: "numeric" })}
              </p>
           </div>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="flex items-center bg-slate-100/50 p-1 rounded-2xl border border-slate-200/30">
              <button onClick={prevMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all">
                <ChevronLeft className="w-5 h-5 text-slate-400 hover:text-slate-900" />
              </button>
              <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors">Today</button>
              <button onClick={nextMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all">
                <ChevronRight className="w-5 h-5 text-slate-400 hover:text-slate-900" />
              </button>
           </div>
           {(isAdmin || isTeacher) && (
              <button
                onClick={handleOpenCreate}
                className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-black hover:-translate-y-0.5 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Add Event
              </button>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 flex-1 pb-10">
        {/* Main Calendar Grid */}
        <div className="xl:col-span-3 bg-white/70 backdrop-blur-sm rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
          <div className="grid grid-cols-7 bg-slate-50/50 border-b border-slate-100">
             {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
               <div key={d} className="py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{d}</div>
             ))}
          </div>
          
          <div className="flex-1 grid grid-cols-7 auto-rows-fr">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="border-r border-b border-slate-100/50 bg-slate-50/20" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDay(day);
              const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
              const isSelected = selectedDate?.toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
              
              const hasEvents = dayEvents.length > 0;

              return (
                <div 
                  key={day} 
                  onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                  className={`min-h-[110px] p-2 border-r border-b border-slate-100 transition-all cursor-pointer hover:z-10 hover:shadow-xl hover:shadow-indigo-500/5 ${
                    isSelected ? "bg-white ring-2 ring-inset ring-indigo-500 z-10" : hasEvents ? "bg-indigo-50/20" : "bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                     <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black transition-all ${
                       isToday ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : isSelected ? "text-indigo-600" : "text-slate-400"
                     }`}>
                       {day}
                     </span>
                  </div>
                  <div className="space-y-1">
                     {dayEvents.slice(0, 2).map(e => (
                       <div key={e.id} className="px-2 py-1.5 bg-white border border-slate-100 rounded-lg shadow-sm text-[9px] font-black text-slate-600 truncate border-l-2 border-l-indigo-400">
                          {e.title}
                       </div>
                     ))}
                     {dayEvents.length > 2 && (
                        <div className="text-[8px] font-black text-indigo-400 pl-1 uppercase tracking-tighter">+{dayEvents.length - 2} Events</div>
                     )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Details */}
        <div className="xl:col-span-1">
           <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] border border-slate-200/50 shadow-sm p-8 h-full flex flex-col">
              <div className="mb-8">
                 <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Selected Timeline</h4>
                 <h3 className="text-xl font-black text-slate-900 tracking-tight" suppressHydrationWarning>
                    {selectedDate?.toLocaleString("en-US", { day: "numeric", month: "long" })}
                 </h3>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
                 {!selectedDate || getEventsForDay(selectedDate.getDate()).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center gap-5 opacity-40">
                       <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400">
                          <CalendarIcon className="w-8 h-8" />
                       </div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">No Events<br/>Scheduled</p>
                    </div>
                 ) : (
                    getEventsForDay(selectedDate.getDate()).map(event => (
                      <div key={event.id} className="group relative bg-white border border-slate-100 rounded-[2rem] p-6 transition-all hover:shadow-2xl hover:shadow-indigo-600/5 hover:border-indigo-100">
                         <div className="flex items-start justify-between mb-4">
                            <h4 className="text-sm font-black text-slate-900 pr-6 leading-tight uppercase tracking-tight">{event.title}</h4>
                            {canManage(event) && (
                               <div className="flex gap-1">
                                  <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(event); }} className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                                     <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDelete(event.id); }} className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                     <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                               </div>
                            )}
                         </div>
                         
                         {event.description && <p className="text-[11px] font-medium text-slate-400 mb-4 line-clamp-3 leading-relaxed">{event.description}</p>}
                         
                         <div className="flex flex-wrap gap-2">
                            <div className="flex items-center gap-1.5 text-[9px] font-black text-indigo-600 bg-indigo-50 w-fit px-2.5 py-1.5 rounded-xl uppercase tracking-wider">
                               <Clock className="w-3 h-3" />
                               {formatAMPM(event.startTime)} – {formatAMPM(event.endTime)}
                            </div>
                            <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 bg-slate-50 border border-slate-100 w-fit px-2.5 py-1.5 rounded-xl uppercase tracking-wider">
                               <Users className="w-3 h-3" />
                               {event.audience.replace("_", " ")}
                            </div>
                         </div>
                      </div>
                    ))
                 )}
              </div>
           </div>
        </div>
      </div>

      {/* FORM MODAL */}
      {isFormModalOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
               <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-3">
                     <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                        <Sparkles className="w-5 h-5 text-white" />
                     </div>
                     <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase tracking-wider">
                        {editingEvent ? "Update Event" : "Create Event"}
                     </h3>
                  </div>
                  <button 
                    onClick={() => setIsFormModalOpen(false)}
                    className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-slate-100 shadow-none hover:shadow-sm"
                  >
                     <X className="w-5 h-5" />
                  </button>
               </div>

               <div className="p-8 space-y-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Title</label>
                     <input 
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        placeholder="e.g. Annual Symposium"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-sm font-bold text-slate-900 placeholder:text-slate-300 outline-none focus:bg-white focus:border-indigo-400 transition-all"
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Details</label>
                     <textarea 
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        placeholder="Description..."
                        rows={3}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-sm font-bold text-slate-900 placeholder:text-slate-300 outline-none focus:bg-white focus:border-indigo-400 transition-all resize-none"
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Starts At</label>
                        <div className="flex items-center gap-2 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-200 focus-within:bg-white focus-within:border-indigo-400 transition-all">
                           <input 
                             type="time"
                             value={formData.startTime}
                             onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                             className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none"
                           />
                           <span className="text-[9px] font-black text-indigo-600 whitespace-nowrap">{formatAMPM(formData.startTime)}</span>
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ends At</label>
                        <div className="flex items-center gap-2 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-200 focus-within:bg-white focus-within:border-indigo-400 transition-all">
                           <input 
                             type="time"
                             value={formData.endTime}
                             onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                             className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none"
                           />
                           <span className="text-[9px] font-black text-indigo-600 whitespace-nowrap">{formatAMPM(formData.endTime)}</span>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Audience</label>
                     <select 
                        value={formData.audience}
                        onChange={e => setFormData({...formData, audience: e.target.value as any})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-400 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%22%20fill%3D%22none%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:16px_16px] bg-[right_1.25rem_center] bg-no-repeat"
                     >
                        <option value="ALL">All Participants</option>
                        <option value="INSTITUTION_ADMIN">Management Only</option>
                        <option value="TEACHERS">Staff & Management</option>
                        <option value="STUDENTS">Students & Staff</option>
                     </select>
                  </div>

                  <div className="flex gap-3 pt-4">
                     <button onClick={() => setIsFormModalOpen(false)} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">Cancel</button>
                     <button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                     >
                        {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                        {saving ? "Processing..." : "Confirm Event"}
                     </button>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
