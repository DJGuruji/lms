"use client";

import CalendarPage from "@/components/CalendarPage";
import { StudentShell } from "@/components/student/StudentShell";

export default function StudentCalendar() {
  return (
    <StudentShell title="Academic Calendar">
      <CalendarPage isAdmin={false} isTeacher={false} />
    </StudentShell>
  );
}
