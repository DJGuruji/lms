"use client";

import { useCallback, useEffect, useState } from "react";
import { 
  Users as PeersIcon, 
  Search, 
  Mail, 
  Loader2, 
  UserCircle,
  MessageCircle,
  Heart,
  GraduationCap
} from "lucide-react";
import { api } from "@/lib/api";
import { StudentShell } from "@/components/student/StudentShell";

type Peer = {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  role: string;
};

export default function StudentPeersPage() {
  const [activeTab, setActiveTab] = useState<"peers" | "teachers">("peers");
  const [items, setItems] = useState<Peer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === "peers" ? "/peers" : "/peers/teachers";
      const res = await api.get<{ items: Peer[]; total: number }>(
        `${endpoint}?page=${page}&limit=${limit}`
      );
      setItems(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.error("Failed to load list", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, activeTab]);

  useEffect(() => {
    load();
  }, [load]);

  const pageCount = Math.max(1, Math.ceil(total / limit));

  return (
    <StudentShell title="Classmates & Teachers">
      <div className="space-y-8 animate-in fade-in duration-700">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white/40 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/50 shadow-xl shadow-blue-900/5">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              {activeTab === "peers" ? <PeersIcon className="h-7 w-7" /> : <GraduationCap className="h-7 w-7" />}
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {activeTab === "peers" ? "Your Peers" : "Your Teachers"}
              </h1>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                {activeTab === "peers" ? "Connect with your classmates" : "Connect with your mentors"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="bg-blue-50 px-4 py-2 rounded-full text-blue-700 font-black text-sm">
                {total} {activeTab === "peers" ? "Classmate" : "Teacher"}{total === 1 ? "" : "s"}
             </div>
          </div>
        </header>

        {/* Sub-nav Tabs */}
        <div className="flex border-b border-slate-200 px-2 overflow-x-auto no-scrollbar">
          {[
            { id: "peers", label: "Peers", icon: PeersIcon },
            { id: "teachers", label: "Teachers", icon: GraduationCap },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setPage(1);
              }}
              className={`py-4 px-8 text-sm font-bold transition-all relative flex items-center gap-2 ${
                activeTab === tab.id
                  ? "text-blue-600"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-4 right-4 h-1 bg-blue-600 rounded-full animate-in slide-in-from-bottom-1 duration-300" />
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 rounded-[2.5rem] bg-white border border-slate-100 animate-pulse" />
            ))
          ) : items.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
              <div className="mx-auto h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-200 mb-4">
                {activeTab === "peers" ? <PeersIcon className="h-10 w-10" /> : <GraduationCap className="h-10 w-10" />}
              </div>
              <h3 className="text-xl font-black text-slate-900">No {activeTab} found yet</h3>
              <p className="text-slate-400 font-medium">It looks like the list is currently empty.</p>
            </div>
          ) : (
            items.map((p) => (
              <div 
                key={p.id}
                className="group relative flex flex-col items-center justify-center bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm transition-all hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-200 overflow-hidden"
              >
                {/* Decorative background element */}
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-blue-50 group-hover:scale-150 transition-transform duration-500 opacity-50" />
                
                <div className="relative mb-6">
                  <div className="h-24 w-24 rounded-[2rem] bg-linear-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-600 transition-transform group-hover:rotate-12">
                    <UserCircle className="h-14 w-14" />
                  </div>
                  {activeTab === "peers" && (
                    <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-xl bg-white border-4 border-white shadow-lg flex items-center justify-center">
                      <Heart className="h-4 w-4 text-pink-500 fill-pink-500" />
                    </div>
                  )}
                </div>

                <div className="text-center mb-6">
                  <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-700 transition-colors">
                    {p.name}
                  </h3>
                  <div className="flex items-center justify-center gap-1.5 mt-1 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                    <Mail className="h-3 w-3" />
                    {p.email}
                  </div>
                </div>

                <div className="flex gap-2 w-full pt-4 border-t border-slate-50">
                  <button className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-slate-50 py-3 text-xs font-black text-slate-600 hover:bg-blue-600 hover:text-white transition-all">
                    <MessageCircle className="h-4 w-4" />
                    Message
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {pageCount > 1 && (
          <div className="flex items-center justify-between p-6 bg-white/40 backdrop-blur-md border border-white/50 rounded-[2.5rem] shadow-xl shadow-blue-900/5">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-6 py-3 rounded-2xl bg-white border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Previous Page
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(pageCount, 10) }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`h-10 w-10 rounded-xl text-xs font-black transition-all ${
                    page === i + 1 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-110" 
                      : "bg-white text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              disabled={page >= pageCount}
              onClick={() => setPage(page + 1)}
              className="px-6 py-3 rounded-2xl bg-white border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next Page
            </button>
          </div>
        )}
      </div>
    </StudentShell>
  );
}
