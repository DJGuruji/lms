"use client";

import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { usePathname } from "next/navigation";

export function CalendarNavLink({ href, active }: { href: string; active: boolean }) {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get<number>("/calendar/notifications");
        setCount(res.data);
      } catch (err) {
        // Silently ignore notification fetch errors
      }
    };

    fetchNotifications();
    // Refresh every 5 minutes
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [pathname]);

  // If we are on the calendar page, the count should eventually disappear
  // The page itself marks as viewed, but we can clear it locally immediately
  useEffect(() => {
    if (pathname === href) {
      setCount(0);
    }
  }, [pathname, href]);

  return (
    <Link
      href={href}
      className={`relative flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors md:gap-3 md:py-2.5 ${
        active
          ? "border-blue-600 bg-blue-50 text-blue-700 md:border-l-[3px]"
          : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900 md:border-l-[3px]"
      }`}
    >
      <Calendar
        className={`h-5 w-5 shrink-0 ${active ? "text-blue-600" : "text-slate-400"}`}
      />
      <span>Calendar</span>
      
      {count > 0 && !active && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white shadow-lg shadow-red-200 animate-in zoom-in duration-300">
           {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
