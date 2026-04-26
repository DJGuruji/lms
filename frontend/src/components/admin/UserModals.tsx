"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Loader2, Shield, Mail, UserCircle, AlertCircle, BookOpen, Sparkles } from "lucide-react";
import { api } from "@/lib/api";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  role: string;
};

export type FullUser = UserRow & {
  enrollments?: { courseId: string; subjectId?: string }[];
  teacherSubjects?: { subjectId: string; subject: { courseId: string } }[];
};

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

export function ModalShell({
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
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
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
        <div className="px-6 py-5 max-h-[80vh] overflow-y-auto custom-scrollbar">{children}</div>
      </div>
    </div>
  );
}

export function UserModal({
  title,
  busy,
  roleOptions,
  courses,
  subjectsByCourse,
  onLoadSubjects,
  onClose,
  onSubmit,
  defaultCourseIds = [],
}: {
  title: string;
  busy: boolean;
  roleOptions: { value: string; label: string }[];
  courses: { id: string; name: string }[];
  subjectsByCourse: Record<string, { id: string; name: string }[]>;
  onLoadSubjects: (courseId: string) => void;
  onClose: () => void;
  onSubmit: (payload: any) => void;
  defaultCourseIds?: string[];
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(roleOptions[0]?.value || "STUDENT");

  // Student
  const [courseIds, setCourseIds] = useState<string[]>(defaultCourseIds);
  const [subjectId, setSubjectId] = useState("");

  // Teacher
  const [teacherCourses, setTeacherCourses] = useState<string[]>([]);
  const [teacherSubjectIds, setTeacherSubjectIds] = useState<string[]>([]);

  useEffect(() => {
    if (role === "STUDENT" && courses.length && !courseIds.length) {
      setCourseIds([courses[0].id]);
    }
  }, [role, courses, courseIds]);

  useEffect(() => {
    if (role === "STUDENT" && courseIds.length) courseIds.forEach(c => onLoadSubjects(c));
  }, [role, courseIds, onLoadSubjects]);

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
        <Field label="Full name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20"
            placeholder="John Doe"
          />
        </Field>
        <Field label="Email address">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20"
            placeholder="john@example.com"
          />
        </Field>
        <Field label="Phone number">
          <input
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20"
            placeholder="+1 (555) 000-0000"
          />
        </Field>
        <Field label="Account role">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-400"
          >
            {roleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Initial password">
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
          <Field label="Courses (multiple)">
            <select
              multiple
              value={courseIds}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                setCourseIds(selected);
                setSubjectId("");
                selected.forEach(c => onLoadSubjects(c));
              }}
              className="h-32 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"
            >
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
              disabled={courseIds.length === 0}
            >
              <option value="">None</option>
              {courseIds.flatMap(c => subjectsByCourse[c] ?? []).map((s) => (
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
                  const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                  setTeacherCourses(selected);
                  setTeacherSubjectIds((prev) => {
                    const allowed = new Set(selected.flatMap((c) => (subjectsByCourse[c] ?? []).map((s) => s.id)));
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
                  const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
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
            </Field>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">Cancel</button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onSubmit({
            role,
            name: name.trim(),
            email: email.trim(),
            mobile: mobile.trim() || undefined,
            password: password.trim() || undefined,
            ...(role === "STUDENT" ? { courseIds, subjectId: subjectId || undefined } : {}),
            ...(role === "TEACHER" ? { teacherSubjectIds } : {}),
          })}
          className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Create user"}
        </button>
      </div>
    </ModalShell>
  );
}

export function EditUserModal({
  user,
  busy,
  courses,
  subjectsByCourse,
  onLoadSubjects,
  onClose,
  onSubmit,
}: {
  user: UserRow;
  busy: boolean;
  courses: { id: string; name: string }[];
  subjectsByCourse: Record<string, { id: string; name: string }[]>;
  onLoadSubjects: (courseId: string) => void;
  onClose: () => void;
  onSubmit: (payload: any) => void;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [mobile, setMobile] = useState(user.mobile ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);

  // Student
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [subjectId, setSubjectId] = useState("");

  // Teacher
  const [teacherCourses, setTeacherCourses] = useState<string[]>([]);
  const [teacherSubjectIds, setTeacherSubjectIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchFull = async () => {
      try {
        const res = await api.get<FullUser>(`/users/${user.id}`);
        const full = res.data;
        if (full.role === "STUDENT" && full.enrollments?.length) {
          const cids = full.enrollments.map(e => e.courseId);
          setCourseIds(cids);
          setSubjectId(full.enrollments[0].subjectId || "");
          cids.forEach(c => onLoadSubjects(c));
        } else if (full.role === "TEACHER" && full.teacherSubjects?.length) {
          const sids = full.teacherSubjects.map(ts => ts.subjectId);
          const cids = Array.from(new Set(full.teacherSubjects.map(ts => ts.subject.courseId)));
          setTeacherCourses(cids);
          setTeacherSubjectIds(sids);
          cids.forEach(c => onLoadSubjects(c));
        }
      } catch (err) {
        console.error("Failed to load full user details", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFull();
  }, [user.id, user.role, onLoadSubjects]);

  const teacherSubjects = useMemo(() => {
    const list = teacherCourses.flatMap((c) => subjectsByCourse[c] ?? []);
    const byId = new Map<string, { id: string; name: string }>();
    for (const s of list) byId.set(s.id, s);
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [teacherCourses, subjectsByCourse]);

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
            placeholder="Leave empty to keep current"
          />
        </Field>
      </div>

      {loading ? (
        <div className="mt-6 py-10 text-center text-slate-400 animate-pulse">Loading assignments…</div>
      ) : (
        <>
          {user.role === "STUDENT" && (
            <div className="mt-6 grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 md:grid-cols-2">
              <Field label="Courses (multiple)">
                <select
                  multiple
                  value={courseIds}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                    setCourseIds(selected);
                    setSubjectId("");
                    selected.forEach(c => onLoadSubjects(c));
                  }}
                  className="h-32 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"
                >
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
                  disabled={courseIds.length === 0}
                >
                  <option value="">None</option>
                  {courseIds.flatMap(c => subjectsByCourse[c] ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          {user.role === "TEACHER" && (
            <div className="mt-6 space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Courses (multiple)">
                  <select
                    multiple
                    value={teacherCourses}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                      setTeacherCourses(selected);
                      selected.forEach(c => onLoadSubjects(c));
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
                      const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
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
                </Field>
              </div>
            </div>
          )}
        </>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">Cancel</button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onSubmit({
              name: name.trim(),
              email: email.trim(),
              mobile: mobile.trim(),
              ...(password.trim() ? { password: password.trim() } : {}),
              ...(user.role === "STUDENT" ? { courseIds, subjectId: subjectId || undefined } : {}),
              ...(user.role === "TEACHER" ? { teacherSubjectIds } : {}),
            })
          }
          className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </ModalShell>
  );
}

export function BulkUploadModal({
  onClose,
  onUploaded,
  onError,
  courses,
  initialCourseId,
}: {
  onClose: () => void;
  onUploaded: () => void | Promise<void>;
  onError: (msg: string) => void;
  courses: { id: string; name: string }[];
  initialCourseId?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const exampleCsv = useMemo(() => {
    const anyCourse = initialCourseId || courses[0]?.id || "COURSE_UUID";
    return [
      "username,email,password,role,course,subject,mobile",
      `Student One,student1@example.com,Passw0rd!,STUDENT,${anyCourse},,`,
      `Teacher One,teacher1@example.com,Passw0rd!,TEACHER,,SUBJECT_UUID1|SUBJECT_UUID2,+911234567890`,
      `Institution Admin,admin1@example.com,Passw0rd!,INSTITUTION_ADMIN,,,`,
    ].join("\r\n");
  }, [courses, initialCourseId]);

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
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">CSV file</label>
          <input
            type="file"
            accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => downloadExample()} className="text-xs font-semibold text-blue-600 hover:underline">Download example CSV</button>
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end pt-4">
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">Cancel</button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void upload()}
            className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export function ConfirmDeleteModal({
  busy,
  user,
  onClose,
  onConfirm,
}: {
  busy: boolean;
  user: UserRow;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell title="Delete member" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900">Are you absolutely sure?</h4>
          <p className="mt-1 text-sm text-slate-500">
            This will permanently remove <b>{user.name}</b> ({user.email}). 
            All their activity records, results, and submissions will be lost.
          </p>
        </div>
        <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">Cancel</button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 flex items-center gap-2"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? "Deleting…" : "Yes, delete"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
