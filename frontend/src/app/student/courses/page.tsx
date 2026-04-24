"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, Layers } from "lucide-react";
import { api } from "@/lib/api";
import { StudentShell } from "@/components/student/StudentShell";

type Subject = { id: string; name: string };
type CourseBlock = {
  enrollmentId: string;
  course: { id: string; name: string; subjects: Subject[] };
};

export default function StudentCoursesPage() {
  const [rows, setRows] = useState<CourseBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<CourseBlock[]>("/student/courses");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch {
      setRows([]);
      setError("Could not load your courses. You may need to be enrolled.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <StudentShell title="My courses">
      <div className="mx-auto max-w-3xl space-y-6">
        <p className="text-sm text-[var(--lms-muted)]">
          Courses your institute assigned — open a course to watch content or take
          exams.
        </p>

        {error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-full rounded-3xl border border-slate-100 bg-white px-6 py-12 text-center text-slate-500 shadow-sm">
              <div className="animate-pulse flex flex-col items-center gap-3">
                 <div className="h-10 w-10 bg-slate-200 rounded-full"></div>
                 <div className="h-4 w-32 bg-slate-200 rounded-lg"></div>
              </div>
            </div>
          ) : rows.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-slate-500">
              No enrollments yet. Ask your teacher to enroll you in a course.
            </div>
          ) : (
            rows.map(({ course }, i) => (
              <div
                key={course.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-sm ring-1 ring-slate-900/5 transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_12px_40px_-24px_rgba(37,99,235,0.4)]"
              >
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                   <BookOpen className="w-16 h-16 transform rotate-12" />
                </div>
                <div className="p-6 pb-4">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                    {course.name}
                  </h3>
                  <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
                     <span className="bg-slate-100 px-2 py-1 rounded-md">{course.subjects.length} Subject{course.subjects.length === 1 ? "" : "s"}</span>
                  </div>
                </div>

                <div className="px-6 py-4 flex flex-col gap-3">
                   <div className="space-y-1">
                      {course.subjects.slice(0, 3).map((s) => (
                        <div key={s.id} className="flex items-center gap-2 text-sm text-slate-600">
                          <Layers className="h-3 w-3 shrink-0 text-slate-400" />
                          <span className="truncate">{s.name}</span>
                        </div>
                      ))}
                      {course.subjects.length > 3 && (
                         <div className="text-xs text-slate-400 pl-5 font-medium">+ {course.subjects.length - 3} more</div>
                      )}
                      {course.subjects.length === 0 && (
                         <div className="text-sm text-slate-400 italic">No subjects added yet</div>
                      )}
                   </div>
                </div>
                
                <div className="border-t border-slate-50 bg-slate-50/50 p-6 pt-4 flex gap-3 z-10">
                   <Link
                     href={`/student/courses/${course.id}/learn`}
                     className="flex-1 flex justify-center items-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:scale-[1.02] transition-all"
                   >
                     Study
                     <ChevronRight className="h-4 w-4" />
                   </Link>
                   <Link
                     href={`/student/courses/${course.id}/exams`}
                     className="flex-1 flex justify-center items-center rounded-xl bg-white border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
                   >
                     Exams
                   </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </StudentShell>
  );
}
