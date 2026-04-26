"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Trophy,
  GraduationCap,
  FileText,
  Users,
} from "lucide-react";
import { CalendarNavLink } from "../CalendarNavLink";

const nav = [
  { href: "/student", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/student/courses", label: "My courses", icon: BookOpen },
  { href: "/student/assignments", label: "Assignments", icon: FileText },
  { href: "/student/peers", label: "Peers", icon: Users },
  { href: "/student/results", label: "Results", icon: Trophy },
];

export function StudentSidebar() {
  const pathname = usePathname();

  function active(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="sticky top-0 z-20 flex w-full shrink-0 flex-row gap-1 overflow-x-auto border-b border-[var(--lms-border)] bg-[var(--lms-sidebar)] px-2 py-2 md:h-screen md:w-56 md:flex-col md:gap-0 md:overflow-visible md:border-b-0 md:border-r md:px-0 md:py-0 md:shadow-[4px_0_24px_-12px_rgba(15,23,42,0.06)] lg:w-60">
      <div className="flex h-14 shrink-0 items-center gap-2 px-3 md:h-16 md:border-b md:border-[var(--lms-border)] md:px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md shadow-blue-500/25">
          <GraduationCap className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            E-Skool
          </p>
          <p className="text-sm font-bold text-slate-900">Learn</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-row gap-1 p-2 md:flex-col md:gap-0.5 md:p-3 overflow-y-auto custom-scrollbar">
        {nav.map(({ href, label, icon: Icon, exact }) => {
          const on = active(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors md:gap-3 md:py-2.5 ${
                on
                  ? "bg-[var(--lms-primary-soft)] text-blue-700 shadow-sm md:border-l-[3px] md:border-blue-600"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 md:border-l-[3px] md:border-transparent"
              }`}
            >
              <Icon
                className={`h-5 w-5 shrink-0 ${on ? "text-blue-600" : "text-slate-400"}`}
              />
              {label}
            </Link>
          );
        })}
        
        <CalendarNavLink 
          href="/student/calendar" 
          active={active("/student/calendar")} 
        />
      </nav>
      <div className="hidden border-t border-[var(--lms-border)] p-4 text-xs text-[var(--lms-muted)] md:block">
        Stay on track · you got this
      </div>
    </aside>
  );
}
