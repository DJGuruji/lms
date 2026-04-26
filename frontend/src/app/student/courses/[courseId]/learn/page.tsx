"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Layers, BookOpen, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { StudentShell } from "@/components/student/StudentShell";
import { StudentTimeTableModal } from "./StudentTimeTableModal";
import { Calendar } from "lucide-react";

type Subject = { id: string; name: string };
type CourseRow = {
  course: { id: string; name: string; subjects: Subject[] };
};

export default function StudentLearnPage() {
  const params = useParams();
  const courseId = params.courseId as string;

  const [courseName, setCourseName] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);

  const loadCourse = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<CourseRow[]>("/student/courses");
      const list = Array.isArray(res.data) ? res.data : [];
      const hit = list.find((r) => r.course.id === courseId);
      if (!hit) {
        setError("You are not enrolled in this course.");
        setCourseName("");
        setSubjects([]);
        return;
      }
      setCourseName(hit.course.name);
      setSubjects(hit.course.subjects);
    } catch {
      setError("Could not load course subjects.");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  return (
    <StudentShell title={courseName ? `Study · ${courseName}` : "Subjects"}>
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center gap-4">
          <Link
            href="/student/courses"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:shadow"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{courseName || "Course Subjects"}</h1>
            <p className="text-sm text-slate-500 mt-1">Select a subject to dive into the tailored content segregations</p>
          </div>
          <button
            onClick={() => setShowSchedule(true)}
            className="ml-auto flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:ring-indigo-300 hover:text-indigo-600 active:scale-95"
          >
            <Calendar className="h-4 w-4 text-indigo-500" />
            Time Table
          </button>
        </div>

        {showSchedule && (
          <StudentTimeTableModal courseId={courseId} onClose={() => setShowSchedule(false)} />
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center text-slate-400 font-medium">Loading subjects…</div>
        ) : subjects.length === 0 ? (
           <div className="flex min-h-[40vh] items-center justify-center text-slate-400 font-medium border-2 border-dashed border-slate-200 rounded-3xl">No subjects added to this course yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
             {subjects.map((s, index) => (
                <Link
                  key={s.id}
                  href={`/student/courses/${courseId}/learn/${s.id}`}
                  className="group relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-6 shadow-sm ring-1 ring-slate-900/5 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-[0_12px_40px_-24px_rgba(79,70,229,0.3)]"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                     <Layers className="w-20 h-20 transform -rotate-12 translate-x-4 -translate-y-4 text-indigo-900" />
                  </div>
                  
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                    <BookOpen className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-700 transition-colors mb-1">
                    {s.name}
                  </h3>
                  <div className="flex items-center text-indigo-600 font-semibold text-sm mt-8 gap-1 group-hover:gap-2 transition-all">
                     View Segregations <ChevronRight className="w-4 h-4" />
                  </div>
                </Link>
             ))}
          </div>
        )}
      </div>
    </StudentShell>
  );
}
