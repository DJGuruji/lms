"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";

type Course = { id: string; name: string; instituteId: string };

type Form = { name: string };

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [maxPage, setMaxPage] = useState(1);

  const { register, handleSubmit, reset } = useForm<Form>();

  const load = useCallback(async (pageStr = 1) => {
    setError(null);
    try {
      const res = await api.get<{ data: Course[], totalPages: number }>(`/courses?page=${pageStr}&limit=10`);
      if (res.data && res.data.data) {
        setCourses(res.data.data);
        setMaxPage(res.data.totalPages || 1);
        setPage(pageStr);
      }
    } catch {
      setError("Could not load courses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onCreate(data: Form) {
    setError(null);
    try {
      await api.post("/courses", { name: data.name.trim() });
      reset();
      await load(1);
    } catch {
      setError("Failed to create course.");
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this course?")) return;
    setError(null);
    try {
      await api.delete(`/courses/${id}`);
      await load(page);
    } catch {
      setError("Could not delete course.");
    }
  }

  const filtered = courses.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">All courses</h2>
          <p className="text-sm text-[var(--lms-muted)]">
            Curate modules like a catalog — drag-feel layout, polished rows.
          </p>
        </div>
        <form
          onSubmit={handleSubmit(onCreate)}
          className="flex flex-wrap items-center gap-2"
        >
          <input
            {...register("name", { required: true })}
            placeholder="New course name"
            className="min-w-[200px] rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none ring-blue-500/20 focus:border-blue-400 focus:ring-4"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create new course
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <BookOpen className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none ring-blue-500/20 focus:border-blue-400 focus:ring-4"
          />
        </div>
        <select className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 outline-none">
          <option>All categories…</option>
        </select>
        <select className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 outline-none">
          <option>All statuses…</option>
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading ? (
          <p className="py-12 text-center text-slate-500 col-span-full">Loading courses…</p>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-slate-500 col-span-full">No courses yet.</p>
        ) : (
          filtered.map((course) => (
            <Link
              key={course.id}
              href={`/admin/courses/${course.id}`}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_8px_30px_-12px_rgba(37,99,235,0.2)]"
            >
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      onDelete(course.id);
                    }}
                    className="rounded-lg p-2 text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="font-semibold text-slate-900 transition-colors group-hover:text-blue-700">
                  {course.name}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Manage subjects & content
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
              onClick={() => load(page - 1)}
              className="text-sm px-4 py-2 border border-slate-200 bg-white rounded-lg disabled:opacity-50"
            >
             Previous
           </button>
           <span className="text-sm font-medium text-slate-600">Page {page} of {maxPage}</span>
           <button
              disabled={page >= maxPage}
              onClick={() => load(page + 1)}
              className="text-sm px-4 py-2 border border-slate-200 bg-white rounded-lg disabled:opacity-50"
           >
             Next
           </button>
        </div>
      )}
    </div>
  );
}
