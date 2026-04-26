"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Search,
  Shield,
  Trash2,
  UserCircle,
  Users as UsersIcon,
  X,
  FileUp,
} from "lucide-react";
import { api } from "@/lib/api";
import { 
  UserRow, 
  UserModal, 
  EditUserModal, 
  BulkUploadModal, 
  ConfirmDeleteModal 
} from "@/components/admin/UserModals";

export function StudentsTab({ courseId }: { courseId: string }) {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination/Filter State
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [q, setQ] = useState("");

  // Options State
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [subjectsByCourse, setSubjectsByCourse] = useState<
    Record<string, { id: string; name: string }[]>
  >({});

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<UserRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState<UserRow | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        courseId, // Filter by current course
        role: "STUDENT", // Only students
      });
      if (q.trim()) params.append("q", q.trim());

      const res = await api.get<{ items: UserRow[]; total: number }>(
        `/users?${params.toString()}`,
      );
      setRows(res.data.items);
      setTotal(res.data.total);
    } catch {
      setError("Failed to load student list.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, q, courseId]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  const loadCourses = useCallback(async () => {
    try {
      const res = await api.get<any>("/courses?limit=200");
      const data = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setCourses(data);
    } catch {
      setCourses([]);
    }
  }, []);

  const loadSubjects = useCallback(async (cid: string) => {
    if (!cid) return;
    if (subjectsByCourse[cid]) return;
    try {
      const res = await api.get<any>(`/subjects?courseId=${cid}&limit=500`);
      const data = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setSubjectsByCourse((m) => ({
        ...m,
        [cid]: data,
      }));
    } catch {
      setSubjectsByCourse((m) => ({ ...m, [cid]: [] }));
    }
  }, [subjectsByCourse]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const createUser = async (payload: any) => {
    setBusy(true);
    setError(null);
    try {
      await api.post("/users", payload);
      setCreateOpen(false);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create student.");
    } finally {
      setBusy(false);
    }
  };

  const updateUser = async (id: string, payload: any) => {
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/users/${id}`, payload);
      setEditOpen(null);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update student.");
    } finally {
      setBusy(false);
    }
  };

  const deleteUser = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/users/${id}`);
      setDeleteOpen(null);
      await load();
    } catch {
      setError("Failed to delete student.");
    } finally {
      setBusy(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search students by name or email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-400 shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBulkOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-all"
          >
            <FileUp className="h-4 w-4" />
            Bulk Upload
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add Student
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {error && (
          <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
               <AlertCircle className="h-4 w-4" />
               {error}
            </div>
            <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded">
               <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <UsersIcon className="h-4 w-4 text-indigo-600" />
            {total} Student{total === 1 ? "" : "s"} Enrolled
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-all"
            >
              Prev
            </button>
            <span className="text-xs font-bold text-slate-400">
              {page} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-all"
            >
              Next
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Email Address</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 opacity-20" />
                    <span className="font-medium">Fetching class list…</span>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center opacity-40">
                      <UsersIcon className="h-12 w-12 mb-4" />
                      <p className="text-lg font-black text-slate-900">No Students Found</p>
                      <p className="text-sm font-medium">Try adjusting your search or add a new student.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((u) => (
                  <tr
                    key={u.id}
                    className="transition hover:bg-slate-50/50 group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 font-bold group-hover:scale-110 transition-transform shadow-sm shadow-indigo-100">
                          {u.name.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {u.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 opacity-40" />
                        {u.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      {u.mobile || <span className="opacity-30 italic">Not set</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => setEditOpen(u)}
                          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-white hover:text-indigo-600 hover:border-indigo-200 hover:shadow-sm transition-all"
                          title="Edit Student"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteOpen(u)}
                          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 hover:shadow-sm transition-all"
                          title="Remove Student"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {createOpen && (
        <UserModal
          title="Add Student to Course"
          busy={busy}
          roleOptions={[{ value: "STUDENT", label: "Student" }]}
          courses={courses}
          subjectsByCourse={subjectsByCourse}
          onLoadSubjects={loadSubjects}
          onClose={() => setCreateOpen(false)}
          onSubmit={createUser}
          defaultCourseIds={[courseId]}
        />
      )}

      {bulkOpen && (
        <BulkUploadModal
          onClose={() => setBulkOpen(false)}
          onUploaded={async () => {
            setBulkOpen(false);
            await load();
          }}
          onError={(msg) => setError(msg)}
          courses={courses}
          initialCourseId={courseId}
        />
      )}

      {editOpen && (
        <EditUserModal
          user={editOpen}
          busy={busy}
          courses={courses}
          subjectsByCourse={subjectsByCourse}
          onLoadSubjects={loadSubjects}
          onClose={() => setEditOpen(null)}
          onSubmit={(payload) => updateUser(editOpen.id, payload)}
        />
      )}

      {deleteOpen && (
        <ConfirmDeleteModal
          busy={busy}
          user={deleteOpen}
          onClose={() => setDeleteOpen(null)}
          onConfirm={() => deleteUser(deleteOpen.id)}
        />
      )}
    </div>
  );
}
