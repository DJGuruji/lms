"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Mail,
  Shield,
  UserCircle,
  Plus,
  Pencil,
  Trash2,
  X,
  Users as UsersIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

type UserRow = {
  id: string;
  name: string;
  email: string;
  mobile?: string | null;
  role: string;
};

export default function UsersPage() {
  const me = useAuthStore((s) => s.user);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<null | UserRow>(null);
  const [deleteOpen, setDeleteOpen] = useState<null | UserRow>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [subjectsByCourse, setSubjectsByCourse] = useState<
    Record<string, { id: string; name: string }[]>
  >({});

  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [courseFilter, setCourseFilter] = useState<string>("");
  const [subjectFilter, setSubjectFilter] = useState<string>("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (q.trim()) params.set("q", q.trim());
      if (roleFilter) params.set("role", roleFilter);
      if (courseFilter) params.set("courseId", courseFilter);
      if (subjectFilter) params.set("subjectId", subjectFilter);

      const res = await api.get<{
        items: UserRow[];
        total: number;
        page: number;
        limit: number;
      }>(`/users?${params.toString()}`);
      setRows(Array.isArray(res.data?.items) ? res.data.items : []);
      setTotal(Number(res.data?.total ?? 0));
    } catch {
      setError("Could not load users.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, q, roleFilter, courseFilter, subjectFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const canCreateInstitutionAdmin = me?.role === "SUPER_ADMIN" || me?.role === "ADMIN";
  const createRoleOptions = useMemo(() => {
    const base: {
      value: "STUDENT" | "TEACHER" | "INSTITUTION_ADMIN";
      label: string;
    }[] = [
      { value: "STUDENT", label: "Student" },
      { value: "TEACHER", label: "Teacher" },
    ];
    if (canCreateInstitutionAdmin) {
      base.push({ value: "INSTITUTION_ADMIN", label: "Institution admin" });
    }
    return base;
  }, [canCreateInstitutionAdmin]);

  const pageCount = Math.max(1, Math.ceil(total / limit));

  const loadCourses = useCallback(async () => {
    try {
      const res = await api.get<{ id: string; name: string }[]>("/courses");
      setCourses(Array.isArray(res.data) ? res.data : []);
    } catch {
      setCourses([]);
    }
  }, []);

  const loadSubjects = useCallback(async (courseId: string) => {
    if (!courseId) return;
    if (subjectsByCourse[courseId]) return;
    try {
      const res = await api.get<{ id: string; name: string }[]>(
        `/subjects?courseId=${courseId}`,
      );
      setSubjectsByCourse((m) => ({
        ...m,
        [courseId]: Array.isArray(res.data) ? res.data : [],
      }));
    } catch {
      setSubjectsByCourse((m) => ({ ...m, [courseId]: [] }));
    }
  }, [subjectsByCourse]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    if (courseFilter) void loadSubjects(courseFilter);
  }, [courseFilter, loadSubjects]);

  async function exportUsers() {
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (roleFilter) params.set("role", roleFilter);
      if (courseFilter) params.set("courseId", courseFilter);
      if (subjectFilter) params.set("subjectId", subjectFilter);

      const res = await api.get(`/users/export?${params.toString()}`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Failed to export users.");
    } finally {
      setBusy(false);
    }
  }

  async function createUserAndAssignments(payload: {
    name: string;
    email: string;
    mobile?: string;
    password?: string;
    role: "STUDENT" | "TEACHER" | "INSTITUTION_ADMIN";
    courseId?: string;
    subjectId?: string;
    teacherSubjectIds?: string[];
  }) {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{
        user: UserRow;
        temporaryPassword?: string;
      }>("/users", {
        name: payload.name,
        email: payload.email,
        password: payload.password || undefined,
        mobile: payload.mobile || undefined,
        role: payload.role,
      });
      const created = res.data.user;

      if (payload.role === "STUDENT" && payload.courseId) {
        await api.post("/enroll", {
          studentId: created.id,
          courseId: payload.courseId,
          ...(payload.subjectId ? { subjectId: payload.subjectId } : {}),
        });
      }

      if (payload.role === "TEACHER" && payload.teacherSubjectIds?.length) {
        await api.post("/users/teachers/assign-subjects", {
          teacherId: created.id,
          subjectIds: payload.teacherSubjectIds,
        });
      }

      setCreateOpen(false);
      await load();
    } catch {
      setError("Failed to create user. Check fields and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function updateUser(userId: string, payload: {
    name?: string;
    email?: string;
    mobile?: string;
    password?: string;
    role?: string;
  }) {
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/users/${userId}`, payload);
      setEditOpen(null);
      await load();
    } catch {
      setError("Failed to update user.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(userId: string) {
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/users/${userId}`);
      setDeleteOpen(null);
      await load();
    } catch {
      setError("Failed to delete user.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Users</h2>
          <p className="text-sm text-(--lms-muted)">
            Manage members inside your institute — create, edit, and remove with
            confidence.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
            disabled={busy}
          >
            <UsersIcon className="h-4 w-4" />
            Bulk upload
          </button>
          <button
            type="button"
            onClick={() => void exportUsers()}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
            disabled={busy}
          >
            <Shield className="h-4 w-4" />
            Export
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create user
          </button>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.1)] md:grid-cols-4">
        <div className="md:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Search
          </label>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search by username or email…"
            className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Role
          </label>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"
          >
            <option value="">All</option>
            <option value="STUDENT">Student</option>
            <option value="TEACHER">Teacher</option>
            <option value="INSTITUTION_ADMIN">Institution admin</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Course / Subject
          </label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <select
              value={courseFilter}
              onChange={(e) => {
                setCourseFilter(e.target.value);
                setSubjectFilter("");
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">All courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={subjectFilter}
              onChange={(e) => {
                setSubjectFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
              disabled={!courseFilter}
            >
              <option value="">All subjects</option>
              {(subjectsByCourse[courseFilter] ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.1)]">
        {error && (
          <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-800">
            {error}
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
              <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-(--lms-muted)">
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
          roleOptions={createRoleOptions}
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

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function UserModal({
  title,
  busy,
  roleOptions,
  courses,
  subjectsByCourse,
  onLoadSubjects,
  onClose,
  onSubmit,
}: {
  title: string;
  busy: boolean;
  roleOptions: { value: "STUDENT" | "TEACHER" | "INSTITUTION_ADMIN"; label: string }[];
  courses: { id: string; name: string }[];
  subjectsByCourse: Record<string, { id: string; name: string }[]>;
  onLoadSubjects: (courseId: string) => void;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    email: string;
    mobile?: string;
    password?: string;
    role: "STUDENT" | "TEACHER" | "INSTITUTION_ADMIN";
    courseId?: string;
    subjectId?: string;
    teacherSubjectIds?: string[];
  }) => void;
}) {
  const [role, setRole] = useState<"STUDENT" | "TEACHER" | "INSTITUTION_ADMIN">(
    roleOptions[0]?.value ?? "STUDENT",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");

  // Student enrollment
  const [courseId, setCourseId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  // Teacher subjects
  const [teacherCourses, setTeacherCourses] = useState<string[]>([]);
  const [teacherSubjectIds, setTeacherSubjectIds] = useState<string[]>([]);

  useEffect(() => {
    if (role === "STUDENT" && courses.length && !courseId) {
      setCourseId(courses[0].id);
    }
  }, [role, courses, courseId]);

  useEffect(() => {
    if (role === "STUDENT" && courseId) onLoadSubjects(courseId);
  }, [role, courseId, onLoadSubjects]);

  useEffect(() => {
    if (role === "TEACHER") {
      teacherCourses.forEach((c) => onLoadSubjects(c));
    }
  }, [role, teacherCourses, onLoadSubjects]);

  const teacherSubjects = useMemo(() => {
    const list = teacherCourses.flatMap((c) => subjectsByCourse[c] ?? []);
    const byId = new Map<string, { id: string; name: string }>();
    for (const s of list) byId.set(s.id, s);
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [teacherCourses, subjectsByCourse]);

  return (
    <ModalShell title={title} onClose={onClose}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Role">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20"
          >
            {roleOptions.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Username">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20"
            placeholder="Full name"
          />
        </Field>
        <Field label="Email">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20"
            placeholder="email@institute.com"
          />
        </Field>
        <Field label="Mobile">
          <input
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20"
            placeholder="+91..."
          />
        </Field>
        <Field label="Password">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20"
            placeholder="Minimum 8 characters"
            type="password"
          />
        </Field>
      </div>

      {role === "STUDENT" && (
        <div className="mt-6 grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 md:grid-cols-2">
          <Field label="Course (required)">
            <select
              value={courseId}
              onChange={(e) => {
                setCourseId(e.target.value);
                setSubjectId("");
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"
            >
              <option value="">Select course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Subject (optional)">
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"
              disabled={!courseId}
            >
              <option value="">None</option>
              {(subjectsByCourse[courseId] ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}

      {role === "TEACHER" && (
        <div className="mt-6 space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Courses (multiple)">
              <select
                multiple
                value={teacherCourses}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions).map(
                    (o) => o.value,
                  );
                  setTeacherCourses(selected);
                  setTeacherSubjectIds((prev) => {
                    const allowed = new Set(
                      selected.flatMap((c) =>
                        (subjectsByCourse[c] ?? []).map((s) => s.id),
                      ),
                    );
                    return prev.filter((sid) => allowed.has(sid));
                  });
                }}
                className="h-36 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Subjects (multiple)">
              <select
                multiple
                value={teacherSubjectIds}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions).map(
                    (o) => o.value,
                  );
                  setTeacherSubjectIds(selected);
                }}
                className="h-36 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                disabled={teacherSubjects.length === 0}
              >
                {teacherSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {teacherSubjects.length === 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  Select courses to load subjects.
                </p>
              )}
            </Field>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onSubmit({
              role,
              name: name.trim(),
              email: email.trim(),
              mobile: mobile.trim() || undefined,
              password: password.trim() || undefined,
              ...(role === "STUDENT"
                ? { courseId, subjectId: subjectId || undefined }
                : {}),
              ...(role === "TEACHER" ? { teacherSubjectIds } : {}),
            })
          }
          className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Create user"}
        </button>
      </div>
    </ModalShell>
  );
}

function EditUserModal({
  user,
  busy,
  onClose,
  onSubmit,
}: {
  user: UserRow;
  busy: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    name?: string;
    email?: string;
    mobile?: string;
    password?: string;
  }) => void;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [mobile, setMobile] = useState(user.mobile ?? "");
  const [password, setPassword] = useState("");

  return (
    <ModalShell title="Edit user" onClose={onClose}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Username">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20"
          />
        </Field>
        <Field label="Email">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20"
          />
        </Field>
        <Field label="Mobile">
          <input
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20"
          />
        </Field>
        <Field label="Reset password (optional)">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20"
            type="password"
            placeholder="Leave empty to keep current password"
          />
        </Field>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onSubmit({
              name: name.trim(),
              email: email.trim(),
              mobile: mobile.trim(),
              ...(password.trim() ? { password: password.trim() } : {}),
            })
          }
          className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </ModalShell>
  );
}

function ConfirmDeleteModal({
  user,
  busy,
  onClose,
  onConfirm,
}: {
  user: UserRow;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell title="Delete user" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This will permanently delete <b>{user.name}</b> and all data associated
          with the account (enrollments, results, assignments).
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {busy ? "Deleting…" : "Yes, delete"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function BulkUploadModal({
  onClose,
  onUploaded,
  onError,
  courses,
}: {
  onClose: () => void;
  onUploaded: () => void | Promise<void>;
  onError: (msg: string) => void;
  courses: { id: string; name: string }[];
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const exampleCsv = useMemo(() => {
    // Note: for bulk upload we accept course/subject as "id1|id2" (UUIDs).
    // Students: course can be multiple; subject is allowed only if exactly one course is provided.
    const anyCourse = courses[0]?.id ?? "COURSE_UUID";
    return [
      "username,email,password,role,course,subject,mobile",
      `Student One,student1@example.com,Passw0rd!,STUDENT,${anyCourse},,`,
      `Teacher One,teacher1@example.com,Passw0rd!,TEACHER,,SUBJECT_UUID1|SUBJECT_UUID2,+911234567890`,
      `Institution Admin,admin1@example.com,Passw0rd!,INSTITUTION_ADMIN,,,`,
    ].join("\r\n");
  }, [courses]);

  async function downloadExample() {
    const blob = new Blob([exampleCsv], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users-bulk-example.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  async function upload() {
    if (!file) {
      onError("Please choose a CSV file.");
      return;
    }
    onError("");
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      await api.post("/users/bulk", fd);
      await onUploaded();
    } catch {
      onError("Bulk upload failed. Please verify the CSV format and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell title="Bulk upload users (CSV)" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm text-slate-700">
          Allowed roles: <b>STUDENT</b>, <b>TEACHER</b>, <b>INSTITUTION_ADMIN</b>.
          Passwords are required; course/subject/mobile are optional.
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              CSV file
            </label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end justify-start gap-2">
            <button
              type="button"
              onClick={() => void downloadExample()}
              className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Download example CSV
            </button>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void upload()}
            className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-600">
        {label}
      </label>
      {children}
    </div>
  );
}
