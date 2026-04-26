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
    if (!selectedDate) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
       alert("Cannot create events in the past.");
       return;
    }

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
    <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-700">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-4">
           <div className="h-12 w-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200">
              <CalendarIcon className="h-6 w-6" />
           </div>
           <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1">Academic Timeline</h3>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Institution Events</p>
           </div>
        </div>
        
        {/* Navigation Section */}
        <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/50">
           <button 
             onClick={prevMonth} 
             className="p-2 hover:bg-white hover:text-blue-600 hover:shadow-md rounded-xl transition-all text-slate-400 group"
             title="Previous Month"
           >
              <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
           </button>
           
           <div className="px-6 flex flex-col items-center min-w-[160px]">
              <span className="text-sm font-black text-slate-900 uppercase tracking-[0.1em]">
                {currentDate.toLocaleString("en-US", { month: "long" })}
              </span>
              <span className="text-[10px] font-black text-blue-600">{currentDate.getFullYear()}</span>
           </div>

           <button 
             onClick={nextMonth} 
             className="p-2 hover:bg-white hover:text-blue-600 hover:shadow-md rounded-xl transition-all text-slate-400 group"
             title="Next Month"
           >
              <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
           </button>
        </div>

        <div className="flex items-center gap-2">
           <button 
             onClick={() => setCurrentDate(new Date())} 
             className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-900 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 shadow-sm"
           >
             Today
           </button>
           {(isAdmin || isTeacher) && (
              <button
                onClick={handleOpenCreate}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Schedule Event
              </button>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 flex-1 pb-6">
        {/* Main Calendar Grid */}
        <div className="xl:col-span-3 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/20 overflow-hidden flex flex-col">
          <div className="grid grid-cols-7 bg-slate-900 border-b border-slate-800">
             {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
               <div key={d} className="py-4 text-center text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{d}</div>
             ))}
          </div>
          
          <div className="flex-1 grid grid-cols-7 auto-rows-fr">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="border-r border-b border-slate-100 bg-slate-50/50" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
              const dayEvents = getEventsForDay(day);
              const isToday = new Date().toDateString() === dObj.toDateString();
              const isSelected = selectedDate?.toDateString() === dObj.toDateString();
              const isPast = dObj < new Date(new Date().setHours(0,0,0,0));
              
              const hasEvents = dayEvents.length > 0;

              return (
                <div 
                  key={day} 
                  onClick={() => !isPast && setSelectedDate(dObj)}
                  className={`min-h-[100px] p-2 border-r border-b border-slate-100 transition-all cursor-pointer relative group/cell ${
                    isPast ? "bg-slate-50/40 cursor-not-allowed opacity-50" : "hover:bg-blue-50/30"
                  } ${
                    isSelected ? "bg-blue-50/50 ring-2 ring-inset ring-blue-500 z-10" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                     <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black transition-all ${
                       isToday ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : isSelected ? "text-blue-600 bg-blue-100/50" : "text-slate-900"
                     }`}>
                       {day}
                     </span>
                     {hasEvents && (
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                     )}
                  </div>
                  
                  <div className="space-y-1">
                     {dayEvents.slice(0, 1).map(e => (
                       <div key={e.id} className="px-2 py-1 bg-blue-600 text-white rounded-lg text-[9px] font-black truncate shadow-md shadow-blue-100 animate-in slide-in-from-bottom-1 duration-300">
                          {e.title}
                       </div>
                     ))}
                     {dayEvents.length > 1 && (
                        <div className="text-[8px] font-black text-blue-600 pl-1 uppercase tracking-tight">+{dayEvents.length - 1} More</div>
                     )}
                  </div>

                  {hasEvents && !isSelected && !isPast && (
                     <div className="absolute inset-0 bg-blue-600/5 pointer-events-none group-hover/cell:bg-transparent transition-colors" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Details */}
        <div className="xl:col-span-1">
           <div className="bg-slate-900 rounded-[2.5rem] p-8 h-full flex flex-col shadow-2xl shadow-slate-900/40 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-[64px] -mr-16 -mt-16 rounded-full" />
              
              <div className="mb-10 relative z-10">
                 <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                    <div className="h-1 w-4 bg-blue-600 rounded-full" />
                    Focus Date
                 </h4>
                 <h3 className="text-3xl font-black text-white tracking-tight leading-tight" suppressHydrationWarning>
                    {selectedDate?.toLocaleString("en-US", { day: "numeric", month: "long" })}
                 </h3>
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">{selectedDate?.getFullYear()}</p>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2 relative z-10">
                 {!selectedDate || getEventsForDay(selectedDate.getDate()).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center gap-6 opacity-40">
                       <div className="w-20 h-20 bg-slate-800 rounded-[2rem] flex items-center justify-center text-slate-600 border border-slate-700/50">
                          <CalendarIcon className="w-10 h-10" />
                       </div>
                       <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest leading-loose">Schedule Clear</p>
                    </div>
                 ) : (
                    getEventsForDay(selectedDate.getDate()).map(event => (
                      <div key={event.id} className="group relative bg-slate-800/50 border border-slate-700/50 rounded-[2rem] p-6 transition-all hover:bg-slate-800 hover:border-blue-500/50 hover:-translate-y-1">
                         <div className="flex items-start justify-between mb-4">
                            <h4 className="text-sm font-black text-white pr-6 leading-tight uppercase tracking-tight">{event.title}</h4>
                            {canManage(event) && (
                               <div className="flex gap-1">
                                  <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(event); }} className="p-2 text-slate-500 hover:text-white hover:bg-slate-700 rounded-xl transition-all">
                                     <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDelete(event.id); }} className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                                     <Trash2 className="w-4 h-4" />
                                  </button>
                               </div>
                            )}
                         </div>
                         
                         {event.description && <p className="text-xs font-medium text-slate-400 mb-6 line-clamp-3 leading-relaxed">{event.description}</p>}
                         
                         <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700/50">
                            <div className="flex items-center gap-2 text-[9px] font-black text-blue-400 bg-blue-500/10 px-3 py-2 rounded-xl uppercase tracking-wider">
                               <Clock className="w-3.5 h-3.5" />
                               {formatAMPM(event.startTime)}
                            </div>
                            <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 bg-slate-700/50 px-3 py-2 rounded-xl uppercase tracking-wider">
                               <Users className="w-3.5 h-3.5" />
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
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
               <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-4">
                     <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-200">
                        <Sparkles className="w-5 h-5" />
                     </div>
                     <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase tracking-wider">
                        {editingEvent ? "Update Event" : "Create Event"}
                     </h3>
                  </div>
                  <button onClick={() => setIsFormModalOpen(false)} className="p-3 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-slate-900 transition-all hover:shadow-md">
                     <X className="w-6 h-6" />
                  </button>
               </div>

               <div className="p-8 space-y-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Event Title</label>
                     <input 
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        placeholder="e.g. Annual Sports Meet"
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner"
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Event Details</label>
                     <textarea 
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        placeholder="Provide some context for participants..."
                        rows={3}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all resize-none shadow-inner"
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Start Time</label>
                        <input 
                           type="time"
                           value={formData.startTime}
                           onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                           className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">End Time</label>
                        <input 
                           type="time"
                           value={formData.endTime}
                           onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                           className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner"
                        />
                     </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Target Audience</label>
                     <select 
                        value={formData.audience}
                        onChange={e => setFormData({...formData, audience: e.target.value as any})}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%232563eb%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:18px_18px] bg-[right_1.5rem_center] bg-no-repeat shadow-inner"
                     >
                        <option value="ALL">All Participants</option>
                        <option value="INSTITUTION_ADMIN">Management Only</option>
                        <option value="TEACHERS">Staff & Management</option>
                        <option value="STUDENTS">Students & Staff</option>
                     </select>
                  </div>

                  <div className="flex gap-4 pt-4">
                     <button onClick={() => setIsFormModalOpen(false)} className="flex-1 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-colors">Cancel</button>
                     <button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-3"
                     >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
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
