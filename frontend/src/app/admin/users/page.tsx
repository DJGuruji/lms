"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  FileDown,
  Filter,
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
} from "lucide-react";
import { api } from "@/lib/api";
import { 
  UserRow, 
  UserModal, 
  EditUserModal, 
  BulkUploadModal, 
  ConfirmDeleteModal 
} from "@/components/admin/UserModals";

export default function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination/Filter State
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");

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
      });
      if (q.trim()) params.append("q", q.trim());
      if (roleFilter) params.append("role", roleFilter);
      if (courseFilter) params.append("courseId", courseFilter);
      if (subjectFilter) params.append("subjectId", subjectFilter);

      const res = await api.get<{ items: UserRow[]; total: number }>(
        `/users?${params.toString()}`,
      );
      setRows(res.data.items);
      setTotal(res.data.total);
    } catch {
      setError("Failed to load user directory.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, q, roleFilter, courseFilter, subjectFilter]);

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

  const loadSubjects = useCallback(async (courseId: string) => {
    if (!courseId) return;
    if (subjectsByCourse[courseId]) return;
    try {
      const res = await api.get<any>(`/subjects?courseId=${courseId}&limit=500`);
      const data = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setSubjectsByCourse((m) => ({
        ...m,
        [courseId]: data,
      }));
    } catch {
      setSubjectsByCourse((m) => ({ ...m, [courseId]: [] }));
    }
  }, [subjectsByCourse]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    if (courseFilter) loadSubjects(courseFilter);
  }, [courseFilter, loadSubjects]);

  const createUserAndAssignments = async (payload: any) => {
    setBusy(true);
    setError(null);
    try {
      await api.post("/users", payload);
      setCreateOpen(false);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create user.");
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
      setError(err.response?.data?.message || "Failed to update user.");
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
      setError("Failed to delete user.");
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.append("q", q.trim());
      if (roleFilter) params.append("role", roleFilter);
      if (courseFilter) params.append("courseId", courseFilter);
      if (subjectFilter) params.append("subjectId", subjectFilter);

      const res = await api.get(`/users/export?${params.toString()}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `users-export-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setError("Failed to export CSV.");
    }
  };

  const roleOptions: { value: string; label: string }[] = useMemo(() => [
    { value: "STUDENT", label: "Student" },
    { value: "TEACHER", label: "Teacher" },
    { value: "INSTITUTION_ADMIN", label: "Institution Admin" },
  ], []);

  const pageCount = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">User Directory</h2>
          <p className="text-sm font-medium text-slate-500">Manage students, teachers, and administrators.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <FileDown className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={() => setBulkOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            Bulk Upload
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition"
          >
            <Plus className="h-4 w-4" />
            Add Member
          </button>
        </div>
      </div>

      {/* Tabs / Sub-nav */}
      <div className="flex border-b border-slate-200 px-2 overflow-x-auto no-scrollbar">
        {[
          { id: "", label: "All Members" },
          { id: "STUDENT", label: "Students" },
          { id: "TEACHER", label: "Teachers" },
          { id: "INSTITUTION_ADMIN", label: "Administrators" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setRoleFilter(tab.id);
              setPage(1);
            }}
            className={`py-4 px-6 text-sm font-bold transition-all relative whitespace-nowrap ${
              roleFilter === tab.id
                ? "text-blue-600"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab.label}
            {roleFilter === tab.id && (
              <div className="absolute bottom-0 left-4 right-4 h-1 bg-blue-600 rounded-full animate-in fade-in zoom-in-95 duration-300" />
            )}
          </button>
        ))}
      </div>

      {/* Filters Area */}
      <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3 lg:grid-cols-4">
        <div className="relative col-span-1 lg:col-span-2">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:bg-white"
          />
        </div>
        <select
          value={courseFilter}
          onChange={(e) => {
            setCourseFilter(e.target.value);
            setSubjectFilter("");
            setPage(1);
          }}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
        >
          <option value="">All Courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={subjectFilter}
          onChange={(e) => {
            setSubjectFilter(e.target.value);
            setPage(1);
          }}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-2 px-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
          disabled={!courseFilter}
        >
          <option value="">All Subjects</option>
          {(subjectsByCourse[courseFilter] ?? []).map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <UsersIcon className="h-4 w-4 text-blue-600" />
            {total} member{total === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-xs font-medium text-slate-500">
              Page {page} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-6 py-4">Member</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Mobile</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 opacity-20" />
                    Loading directory…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No users yet.
                  </td>
                </tr>
              ) : (
                rows.map((u) => (
                  <tr
                    key={u.id}
                    className="transition hover:bg-blue-50/40"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-blue-100 to-indigo-100 text-blue-700">
                          <UserCircle className="h-6 w-6" />
                        </div>
                        <span className="font-medium text-slate-900">
                          {u.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        {u.email}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {u.mobile ? u.mobile : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        <Shield className="h-3 w-3" />
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditOpen(u)}
                          className="rounded-full border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteOpen(u)}
                          className="rounded-full border border-red-200 bg-white p-2 text-red-700 hover:bg-red-50"
                          title="Delete"
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
          title="Create user"
          busy={busy}
          roleOptions={roleOptions}
          courses={courses}
          subjectsByCourse={subjectsByCourse}
          onLoadSubjects={loadSubjects}
          onClose={() => setCreateOpen(false)}
          onSubmit={createUserAndAssignments}
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
