"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  GraduationCap,
} from "lucide-react";
import { CalendarNavLink } from "../CalendarNavLink";

const nav = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/courses", label: "Courses", icon: BookOpen },
  { href: "/admin/exams", label: "Exams", icon: ClipboardList },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 z-20 flex w-full shrink-0 flex-row gap-1 overflow-x-auto border-b border-[var(--lms-border)] bg-[var(--lms-sidebar)] px-2 py-2 md:h-screen md:w-64 md:flex-col md:gap-0 md:overflow-visible md:border-b-0 md:border-r md:px-0 md:py-0 md:shadow-[4px_0_24px_-12px_rgba(15,23,42,0.08)]">
      <div className="flex h-14 shrink-0 items-center gap-2 px-4 md:h-16 md:border-b md:border-[var(--lms-border)] md:px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/25">
          <GraduationCap className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            LMS
          </p>
          <p className="text-sm font-bold text-slate-900">Admin</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-row gap-1 p-2 md:flex-col md:gap-0.5 md:p-3 overflow-y-auto custom-scrollbar">
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors md:gap-3 md:py-2.5 ${
                active
                  ? "border-blue-600 bg-blue-50 text-blue-700 md:border-l-[3px]"
                  : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900 md:border-l-[3px]"
              }`}
            >
              <Icon
                className={`h-5 w-5 shrink-0 ${active ? "text-blue-600" : "text-slate-400"}`}
              />
              {label}
            </Link>
          );
        })}

        <CalendarNavLink 
          href="/admin/calendar" 
          active={pathname === "/admin/calendar" || pathname.startsWith("/admin/calendar/")} 
        />
      </nav>
      <div className="hidden border-t border-[var(--lms-border)] p-4 text-xs text-[var(--lms-muted)] md:block">
        &copy; {new Date().getFullYear()} Guruji Krishna
      </div>
    </aside>
  );
}
