"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Film } from "lucide-react";
import { api } from "@/lib/api";
import { ContentPreview } from "@/components/ContentPreview";
import { StudentShell } from "@/components/student/StudentShell";

type Subject = { id: string; name: string };
type CourseRow = {
  course: { id: string; name: string; subjects: Subject[] };
};
type ContentRow = {
  id: string;
  title: string;
  type: string;
  fileUrl: string;
  subjectId: string;
};

function LearnPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = params.courseId as string;
  const subjectFromQuery = searchParams.get("subject") ?? "";

  const [courseName, setCourseName] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState(subjectFromQuery);
  const [items, setItems] = useState<ContentRow[]>([]);
  const [preview, setPreview] = useState<ContentRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewed, setViewed] = useState<Record<string, true>>({});

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
      const initial =
        subjectFromQuery && hit.course.subjects.some((s) => s.id === subjectFromQuery)
          ? subjectFromQuery
          : hit.course.subjects[0]?.id ?? "";
      setSubjectId(initial);
      if (initial && initial !== subjectFromQuery) {
        router.replace(`/student/courses/${courseId}/learn?subject=${initial}`, {
          scroll: false,
        });
      }
    } catch {
      setError("Could not load course.");
    } finally {
      setLoading(false);
    }
  }, [courseId, subjectFromQuery, router]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  const loadContent = useCallback(async () => {
    if (!subjectId) {
      setItems([]);
      setPreview(null);
      return;
    }
    setError(null);
    try {
      const res = await api.get<ContentRow[]>(
        `/student/contents?subjectId=${subjectId}`,
      );
      const data = Array.isArray(res.data) ? res.data : [];
      setItems(data);
      setPreview((prev) => {
        if (prev && data.some((x) => x.id === prev.id)) {
          return data.find((x) => x.id === prev.id) ?? null;
        }
        return data[0] ?? null;
      });
    } catch {
      setItems([]);
      setPreview(null);
      setError("Could not load lessons for this subject.");
    }
  }, [subjectId]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  useEffect(() => {
    const id = preview?.id;
    if (!id) return;
    if (viewed[id]) return;
    setViewed((m) => ({ ...m, [id]: true }));
    void api.post(`/student/contents/view?contentId=${id}`).catch(() => undefined);
  }, [preview?.id, viewed]);

  function selectSubject(id: string) {
    setSubjectId(id);
    router.replace(`/student/courses/${courseId}/learn?subject=${id}`, {
      scroll: false,
    });
  }

  const pastelFor = useMemo(
    () => ["#d1fae5", "#e9d5ff", "#fef9c3", "#cffafe", "#fde68a"],
    [],
  );

  return (
    <StudentShell title={courseName ? `Learn · ${courseName}` : "Watch content"}>
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href="/student/courses"
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to my courses
        </Link>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-3">
              {subjects.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectSubject(s.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition ${
                    subjectId === s.id
                      ? "bg-slate-900 text-white shadow-md"
                      : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                  }`}
                  style={
                    subjectId !== s.id
                      ? { backgroundColor: pastelFor[idx % pastelFor.length] }
                      : undefined
                  }
                >
                  {s.name}
                </button>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-5">
              <div className="space-y-3 lg:col-span-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Film className="h-4 w-4 text-blue-600" />
                  Lessons
                </h3>
                <ul className="space-y-2">
                  {items.length === 0 ? (
                    <li className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                      No content in this subject yet.
                    </li>
                  ) : (
                    items.map((row, i) => (
                      <li key={row.id}>
                        <button
                          type="button"
                          onClick={() => setPreview(row)}
                          className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${
                            preview?.id === row.id
                              ? "border-blue-300 bg-blue-50 ring-2 ring-blue-500/20"
                              : "border-slate-100 bg-white hover:border-blue-100"
                          }`}
                          style={{
                            backgroundColor:
                              preview?.id === row.id
                                ? undefined
                                : pastelFor[i % pastelFor.length],
                          }}
                        >
                          <span className="font-medium text-slate-900">
                            {row.title}
                          </span>
                          <span className="shrink-0 text-xs uppercase text-slate-500">
                            {row.type}
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div className="lg:col-span-3">
                {preview ? (
                  <ContentPreview
                    title={preview.title}
                    type={preview.type}
                    fileUrl={preview.fileUrl}
                  />
                ) : (
                  <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/80 p-8 text-center text-sm text-slate-500">
                    Select a lesson to preview video or PDF.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </StudentShell>
  );
}

export default function StudentLearnPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-slate-500">
          Loading…
        </div>
      }
    >
      <LearnPageContent />
    </Suspense>
  );
}
