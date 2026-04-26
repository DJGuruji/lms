"use client";

import Link from "next/link";
import { Home, ArrowLeft, Ghost, Search, HelpCircle } from "lucide-react";
import { useEffect, useState } from "react";

export default function NotFound() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-50 flex flex-col items-center justify-center p-6">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-400/10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-indigo-400/10 blur-[120px] rounded-full animate-pulse [animation-delay:2s]" />
      
      {/* Floating Shapes */}
      <div className="absolute top-20 left-[20%] w-12 h-12 border-4 border-blue-200 rounded-2xl rotate-12 animate-bounce [animation-duration:5s]" />
      <div className="absolute bottom-40 right-[15%] w-16 h-16 border-4 border-indigo-200 rounded-full animate-bounce [animation-duration:7s]" />
      <div className="absolute top-1/2 right-[10%] w-8 h-8 bg-blue-100 rounded-lg -rotate-12 animate-pulse" />

      <div className="relative z-10 max-w-2xl w-full text-center space-y-8">
        {/* Animated 404 Graphic */}
        <div className="relative inline-block">
          <h1 className="text-[12rem] font-black text-slate-200/50 leading-none select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="relative">
                <Ghost className="w-24 h-24 text-blue-600 animate-bounce [animation-duration:3s]" />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-slate-200/50 blur-md rounded-full scale-x-150 animate-pulse" />
             </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-4xl font-bold text-slate-900 tracking-tight">
            Oops! You've drifted into space.
          </h2>
          <p className="text-lg text-slate-500 max-w-md mx-auto leading-relaxed">
            The page you're looking for has been moved to another galaxy or never existed in this timeline.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/"
            className="group flex items-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-3xl font-bold shadow-[0_20px_40px_-12px_rgba(37,99,235,0.4)] hover:shadow-[0_25px_50px_-12px_rgba(37,99,235,0.5)] hover:-translate-y-1 transition-all duration-300 active:scale-95"
          >
            <Home className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            Back to Dashboard
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-3 bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-3xl font-bold shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
            Previous Page
          </button>
        </div>

        {/* Quick Links / Suggestions */}
        <div className="pt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-lg mx-auto">
           <div className="p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/20 text-center space-y-2">
              <Search className="w-5 h-5 text-blue-500 mx-auto" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Search</p>
           </div>
           <div className="p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/20 text-center space-y-2">
              <HelpCircle className="w-5 h-5 text-indigo-500 mx-auto" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Support</p>
           </div>
           <div className="p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/20 text-center space-y-2">
              <Ghost className="w-5 h-5 text-slate-400 mx-auto" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Report</p>
           </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-8 text-sm font-medium text-slate-400">
        &copy; {new Date().getFullYear()} LMS Guruji • All rights reserved
      </div>
    </div>
  );
}
