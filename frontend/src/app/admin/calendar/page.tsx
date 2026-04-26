"use client";

import CalendarPage from "@/components/CalendarPage";
import { useAuthStore } from "@/lib/auth-store";

export default function AdminCalendar() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "INSTITUTION_ADMIN";
  const isTeacher = user?.role === "TEACHER";

  return <CalendarPage isAdmin={isAdmin} isTeacher={isTeacher} />;
}
