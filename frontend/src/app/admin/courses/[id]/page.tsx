"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Layers, Plus, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";
import { useParams } from "next/navigation";

type Subject = { id: string; name: string; courseId: string };
type CreateForm = { name: string };

export default function CourseSubjectsPage() {
  const params = useParams();
  const courseId = params.id as string;
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [maxPage, setMaxPage] = useState(1);

  const { register, handleSubmit, reset } = useForm<CreateForm>();

  const loadSubjects = useCallback(async (pageStr = 1) => {
    if (!courseId) return;
    setError(null);
    try {
      const res = await api.get<{data: Subject[], totalPages: number}>(`/subjects?courseId=${courseId}&page=${pageStr}&limit=10`);
      if (res.data && res.data.data) {
        setSubjects(res.data.data);
        setMaxPage(res.data.totalPages || 1);
        setPage(pageStr);
      }
    } catch {
      setSubjects([]);
      setError("Could not load subjects.");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  async function onCreate(data: CreateForm) {
    if (!courseId) return;
    setError(null);
    try {
      await api.post("/subjects", {
        name: data.name.trim(),
        courseId,
      });
      reset();
      await loadSubjects(1);
    } catch {
      setError("Failed to create subject.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/courses"
          className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Course Subjects</h2>
          <p className="text-sm text-[var(--lms-muted)]">
            Manage sections/subjects for this course.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onCreate)}
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
      >
        <div className="min-w-[200px] flex-1">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Create new subject
          </label>
          <input
            {...register("name", { required: true })}
            placeholder="e.g. Algebra I"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
        >
          <Plus className="h-4 w-4" />
          Add subject
        </button>
      </form>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading ? (
          <p className="py-12 text-center text-slate-500 col-span-full">Loading subjects…</p>
        ) : subjects.length === 0 ? (
          <p className="py-12 text-center text-slate-500 col-span-full">No subjects yet. Create one above.</p>
        ) : (
          subjects.map((s) => (
            <Link
              key={s.id}
              href={`/admin/subjects/${s.id}`}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_8px_30px_-12px_rgba(37,99,235,0.2)]"
            >
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                    <Layers className="h-6 w-6" />
                  </div>
                </div>
                <h3 className="font-semibold text-slate-900 transition-colors group-hover:text-blue-700">
                  {s.name}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Manage content
                </p>
              </div>
            </Link>
          ))
        )}
      </div>

      {maxPage > 1 && (
         <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-100 rounded-xl">
            <button 
               disabled={page <= 1}
               onClick={() => loadSubjects(page - 1)}
               className="text-sm px-4 py-2 border border-slate-200 bg-white rounded-lg disabled:opacity-50"
             >
              Previous
            </button>
            <span className="text-sm font-medium text-slate-600">Page {page} of {maxPage}</span>
            <button
               disabled={page >= maxPage}
               onClick={() => loadSubjects(page + 1)}
               className="text-sm px-4 py-2 border border-slate-200 bg-white rounded-lg disabled:opacity-50"
            >
              Next
            </button>
         </div>
      )}
    </div>
  );
}
