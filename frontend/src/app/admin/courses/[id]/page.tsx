"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Layers, Plus, ArrowLeft, X, BookOpen, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";
import { useParams } from "next/navigation";
import { TimeTableTab } from "./TimeTableTab";

type Subject = { id: string; name: string; courseId: string };
type CreateForm = { name: string };

export default function CourseSubjectsPage() {
  const params = useParams();
  const courseId = params.id as string;
  const [activeTab, setActiveTab] = useState<"subjects" | "timetable">("subjects");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [maxPage, setMaxPage] = useState(1);

  const { register, handleSubmit, reset } = useForm<CreateForm>();

  const loadSubjects = useCallback(async (pageStr = 1) => {
    if (!courseId) return;
    setError(null);
    try {
      const res = await api.get<{data: Subject[], totalPages: number}>(`/subjects?courseId=${courseId}&page=${pageStr}&limit=10`);
      if (res.data && res.data.data) {
        setSubjects(res.data.data);
        setMaxPage(res.data.totalPages || 1);
        setPage(pageStr);
      }
    } catch {
      setSubjects([]);
      setError("Could not load subjects.");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  async function onCreate(data: CreateForm) {
    if (!courseId) return;
    setError(null);
    try {
      await api.post("/subjects", {
        name: data.name.trim(),
        courseId,
      });
      reset();
      setIsModalOpen(false);
      await loadSubjects(1);
    } catch {
      setError("Failed to create subject.");
    }
  }

  return (
    <>
      {/* CREATE SUBJECT MODAL - MOVED TO TOP OF FRAGMENT FOR BETTER STACKING */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all">
           <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                       <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">New Subject</h3>
                 </div>
                 <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-slate-100 hover:shadow-sm"
                 >
                    <X className="w-5 h-5" />
                 </button>
              </div>

              <form onSubmit={handleSubmit(onCreate)} className="p-8 space-y-6">
                 <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Subject Name</label>
                    <div className="relative group">
                       <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                       <input 
                          {...register("name", { required: true })}
                          autoFocus
                          placeholder="e.g. Theoretical Physics"
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-900 font-bold placeholder:text-slate-300 outline-none focus:bg-white focus:border-indigo-400 transition-all"
                       />
                    </div>
                    <p className="text-[10px] font-medium text-slate-400 ml-1 italic">This will create a new segregation for the course curriculum.</p>
                 </div>

                 <div className="flex items-center gap-3 pt-4">
                    <button 
                       type="button"
                       onClick={() => setIsModalOpen(false)}
                       className="flex-1 px-6 py-4 rounded-2xl text-sm font-black text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                       Cancel
                    </button>
                    <button 
                       type="submit"
                       className="flex-[2] bg-indigo-600 text-white px-6 py-4 rounded-2xl text-sm font-black shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 hover:-translate-y-0.5 active:scale-95 transition-all"
                    >
                       Establish Subject
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/courses"
              className="rounded-full p-2.5 text-slate-400 bg-white border border-slate-100 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Curriculum Control</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Subject Segregation & Scheduling
              </p>
            </div>
          </div>

          {activeTab === "subjects" && (
             <button
               onClick={() => setIsModalOpen(true)}
               className="group flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all active:scale-95"
             >
               <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform" />
               Create New Subject
             </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-white/50 backdrop-blur-sm rounded-t-3xl px-2">
          <button
            onClick={() => setActiveTab("subjects")}
            className={`py-4 px-8 text-sm font-bold transition-all relative ${
              activeTab === "subjects"
                ? "text-indigo-600"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Subjects ({subjects.length})
            {activeTab === "subjects" && <div className="absolute bottom-0 left-4 right-4 h-1 bg-indigo-600 rounded-full" />}
          </button>
          <button
            onClick={() => setActiveTab("timetable")}
            className={`py-4 px-8 text-sm font-bold transition-all relative ${
              activeTab === "timetable"
                ? "text-indigo-600"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Time Table
            {activeTab === "timetable" && <div className="absolute bottom-0 left-4 right-4 h-1 bg-indigo-600 rounded-full" />}
          </button>
        </div>

        {activeTab === "subjects" ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {error && (
              <div className="rounded-2xl border border-red-100 bg-red-50/50 px-6 py-4 text-sm font-bold text-red-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {loading ? (
                <p className="py-20 text-center text-slate-400 font-bold col-span-full uppercase tracking-widest text-xs">Synchronizing Subjects…</p>
              ) : subjects.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 gap-4">
                   <div className="p-5 bg-slate-50 rounded-full text-slate-200">
                      <BookOpen className="w-12 h-12" />
                   </div>
                   <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No subjects established yet</p>
                   <button onClick={() => setIsModalOpen(true)} className="text-indigo-600 font-black text-sm hover:underline">Launch first subject →</button>
                </div>
              ) : (
                subjects.map((s) => (
                  <Link
                    key={s.id}
                    href={`/admin/subjects/${s.id}`}
                    className="group relative flex flex-col justify-between rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1.5 hover:border-indigo-300 hover:shadow-2xl hover:shadow-indigo-600/10"
                  >
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                       <Layers className="w-20 h-20 -rotate-12 translate-x-4 -translate-y-4" />
                    </div>

                    <div>
                      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 transition-all group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-indigo-600/30">
                        <Layers className="h-7 w-7" />
                      </div>
                      <h3 className="text-lg font-black text-slate-900 transition-colors group-hover:text-indigo-700">
                        {s.name}
                      </h3>
                      <p className="mt-1 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Manage Content
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>

            {maxPage > 1 && (
              <div className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm">
                <button 
                  disabled={page <= 1}
                  onClick={() => loadSubjects(page - 1)}
                  className="text-xs font-black uppercase tracking-widest px-6 py-3 border border-slate-200 bg-white rounded-xl disabled:opacity-30 hover:bg-slate-50 transition-colors"
                >
                  Previous
                </button>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Page {page} of {maxPage}</span>
                <button
                  disabled={page >= maxPage}
                  onClick={() => loadSubjects(page + 1)}
                  className="text-xs font-black uppercase tracking-widest px-6 py-3 border border-slate-200 bg-white rounded-xl disabled:opacity-30 hover:bg-slate-50 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        ) : (
          <TimeTableTab courseId={courseId} />
        )}
      </div>
    </>
  );
}
