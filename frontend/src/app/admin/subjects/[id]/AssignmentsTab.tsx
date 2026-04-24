"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import {
  Plus, Trash, FileText, Users, Calendar,
  Edit2, Eye, EyeOff, ChevronLeft, ChevronRight,
  X, ImageIcon, Paperclip, Loader2,
} from "lucide-react";
import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────
type AssignmentQuestionRow = {
  id?: string;
  text: string;
  imageUrl: string | null;
  pdfUrl: string | null;
};

type AssignmentRow = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  isPublished: boolean;
  questions: AssignmentQuestionRow[];
  _count: { submissions: number };
};

type AssignmentSubmissionRow = {
  id: string;
  studentId: string;
  fileUrl: string;
  submittedAt: string;
  student: { id: string; name: string; email: string };
};

type PaginatedAssignments = {
  data: AssignmentRow[];
  total: number;
  page: number;
  totalPages: number;
};

type Props = { subjectId: string };

type AssignmentForm = {
  title: string;
  description?: string;
  dueDate?: string;
  questions: { text: string; imageUrl?: string; pdfUrl?: string }[];
};

const LIMIT = 8;

// ── QuestionAttachment helper component ────────────────────────────────────
function QuestionAttachment({
  label,
  accept,
  uploading,
  currentUrl,
  onUpload,
  onUrlChange,
  icon,
  colorClass,
}: {
  label: string;
  accept: string;
  uploading: boolean;
  currentUrl?: string;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUrlChange: (url: string) => void;
  icon: React.ReactNode;
  colorClass: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      <div className="flex gap-2 items-center">
        <label
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors shrink-0 ${
            uploading
              ? "border-slate-200 text-slate-400 bg-slate-50 pointer-events-none"
              : colorClass
          }`}
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
          {uploading ? "Uploading…" : "Upload"}
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={onUpload}
            disabled={uploading}
          />
        </label>
        <input
          type="text"
          className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="or paste URL…"
          value={currentUrl ?? ""}
          onChange={(e) => onUrlChange(e.target.value)}
        />
        {currentUrl && (
          <a
            href={currentUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-xs font-semibold underline text-blue-600"
          >
            View
          </a>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export function AssignmentsTab({ subjectId }: Props) {
  const [view, setView] = useState<"list" | "create" | "submissions">("list");
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Edit modal
  const [editTarget, setEditTarget] = useState<AssignmentRow | null>(null);

  // Submissions view
  const [submissions, setSubmissions] = useState<AssignmentSubmissionRow[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);

  // Per-question upload loading { "create-0-image": true, … }
  const [uploadingQ, setUploadingQ] = useState<Record<string, boolean>>({});

  // Create Form
  const createForm = useForm<AssignmentForm>({
    defaultValues: { questions: [{ text: "" }] },
  });
  const {
    fields: createFields,
    append: createAppend,
    remove: createRemove,
  } = useFieldArray({ control: createForm.control, name: "questions" });

  // Edit Form
  const editForm = useForm<AssignmentForm>();
  const {
    fields: editFields,
    append: editAppend,
    remove: editRemove,
  } = useFieldArray({ control: editForm.control, name: "questions" });

  // ── Helpers ──────────────────────────────────────────────────────────────

  const loadAssignments = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const res = await api.get<PaginatedAssignments>(
          `/subjects/${subjectId}/assignments?page=${p}&limit=${LIMIT}`
        );
        const body = res.data;
        setAssignments(Array.isArray(body.data) ? body.data : []);
        setTotalPages(body.totalPages ?? 1);
        setPage(body.page ?? p);
      } catch {
        setError("Failed to load assignments.");
      } finally {
        setLoading(false);
      }
    },
    [subjectId]
  );

  useEffect(() => {
    if (view === "list") loadAssignments(page);
  }, [view, loadAssignments]); // eslint-disable-line react-hooks/exhaustive-deps

  async function uploadFile(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await api.post<{ fileUrl: string }>(
      `/subjects/${subjectId}/assignments/upload`,
      fd,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return res.data.fileUrl;
  }

  function makeUploadHandler(
    prefix: "create" | "edit",
    index: number,
    kind: "image" | "pdf",
    setValue: (field: `questions.${number}.imageUrl` | `questions.${number}.pdfUrl`, val: string) => void
  ) {
    return async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const key = `${prefix}-${index}-${kind}`;
      setUploadingQ((prev) => ({ ...prev, [key]: true }));
      try {
        const url = await uploadFile(file);
        setValue(
          kind === "image" ? `questions.${index}.imageUrl` : `questions.${index}.pdfUrl`,
          url
        );
      } catch {
        alert(`Failed to upload ${kind}.`);
      } finally {
        setUploadingQ((prev) => ({ ...prev, [key]: false }));
      }
    };
  }

  const loadSubmissions = async (assignmentId: string) => {
    setView("submissions");
    setSubsLoading(true);
    try {
      const res = await api.get<AssignmentSubmissionRow[]>(
        `/subjects/${subjectId}/assignments/${assignmentId}/submissions`
      );
      setSubmissions(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError("Failed to load submissions.");
    } finally {
      setSubsLoading(false);
    }
  };

  const onCreate = async (data: AssignmentForm) => {
    setError(null);
    try {
      await api.post(`/subjects/${subjectId}/assignments`, {
        ...data,
        questions: data.questions.map((q) => ({
          text: q.text,
          imageUrl: q.imageUrl || undefined,
          pdfUrl: q.pdfUrl || undefined,
        })),
      });
      createForm.reset({ questions: [{ text: "" }] });
      setView("list");
    } catch {
      setError("Failed to create assignment.");
    }
  };

  const openEdit = (item: AssignmentRow) => {
    setEditTarget(item);
    editForm.reset({
      title: item.title,
      description: item.description ?? "",
      dueDate: item.dueDate ? new Date(item.dueDate).toISOString().slice(0, 16) : "",
      questions: item.questions.map((q) => ({
        text: q.text,
        imageUrl: q.imageUrl ?? "",
        pdfUrl: q.pdfUrl ?? "",
      })),
    });
  };

  const onEdit = async (data: AssignmentForm) => {
    if (!editTarget) return;
    try {
      await api.patch(`/subjects/${subjectId}/assignments/${editTarget.id}`, {
        ...data,
        dueDate: data.dueDate || null,
        questions: data.questions.map((q) => ({
          text: q.text,
          imageUrl: q.imageUrl || undefined,
          pdfUrl: q.pdfUrl || undefined,
        })),
      });
      setEditTarget(null);
      loadAssignments(page);
    } catch {
      alert("Failed to update assignment.");
    }
  };

  const deleteAssignment = async (id: string) => {
    if (!confirm("Delete this assignment permanently?")) return;
    try {
      await api.delete(`/subjects/${subjectId}/assignments/${id}`);
      loadAssignments(page);
    } catch {
      alert("Failed to delete.");
    }
  };

  const togglePublish = async (id: string) => {
    try {
      await api.patch(`/subjects/${subjectId}/assignments/${id}/toggle-publish`);
      setAssignments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isPublished: !a.isPublished } : a))
      );
    } catch {
      alert("Failed to toggle publish status.");
    }
  };

  // ── Reusable question row (create or edit) ────────────────────────────────
  function QuestionRow({
    prefix,
    index,
    onRemove,
    watchImageUrl,
    watchPdfUrl,
    register,
    setValue,
  }: {
    prefix: "create" | "edit";
    index: number;
    onRemove: () => void;
    watchImageUrl?: string;
    watchPdfUrl?: string;
    register: (field: `questions.${number}.text` | `questions.${number}.imageUrl` | `questions.${number}.pdfUrl`, opts?: object) => object;
    setValue: (field: `questions.${number}.imageUrl` | `questions.${number}.pdfUrl`, val: string) => void;
  }) {
    return (
      <div className="p-4 border border-slate-100 bg-slate-50 rounded-2xl relative group">
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-4 right-4 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash className="w-4 h-4" />
        </button>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          Question {index + 1}
        </label>
        <textarea
          {...register(`questions.${index}.text`, { required: true })}
          className="w-full border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px] mb-4"
          placeholder="Write the question here…"
        />
        <div className="space-y-3">
          <QuestionAttachment
            label="Image (optional)"
            accept="image/*"
            uploading={!!uploadingQ[`${prefix}-${index}-image`]}
            currentUrl={watchImageUrl}
            onUpload={makeUploadHandler(prefix, index, "image", setValue)}
            onUrlChange={(v) => setValue(`questions.${index}.imageUrl`, v)}
            icon={<ImageIcon className="w-3.5 h-3.5" />}
            colorClass="border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
          />
          <QuestionAttachment
            label="PDF (optional)"
            accept=".pdf,application/pdf"
            uploading={!!uploadingQ[`${prefix}-${index}-pdf`]}
            currentUrl={watchPdfUrl}
            onUpload={makeUploadHandler(prefix, index, "pdf", setValue)}
            onUrlChange={(v) => setValue(`questions.${index}.pdfUrl`, v)}
            icon={<Paperclip className="w-3.5 h-3.5" />}
            colorClass="border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100"
          />
        </div>
      </div>
    );
  }

  // ── VIEW: Create ──────────────────────────────────────────────────────────
  if (view === "create") {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
          <h2 className="text-xl font-bold text-slate-900">Create Assignment</h2>
          <button
            onClick={() => setView("list")}
            className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
        </div>
        {error && <div className="p-3 mb-4 text-sm text-red-800 bg-red-50 rounded-xl">{error}</div>}

        <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Title</label>
              <input
                {...createForm.register("title", { required: true })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Chapter 4 Exercises"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Due Date (optional)</label>
              <input
                type="datetime-local"
                {...createForm.register("dueDate")}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
              <textarea
                {...createForm.register("description")}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                placeholder="Extra instructions…"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-slate-800 block mb-3">Questions</label>
            <div className="space-y-4">
              {createFields.map((field, index) => (
                <QuestionRow
                  key={field.id}
                  prefix="create"
                  index={index}
                  onRemove={() => createRemove(index)}
                  watchImageUrl={createForm.watch(`questions.${index}.imageUrl`)}
                  watchPdfUrl={createForm.watch(`questions.${index}.pdfUrl`)}
                  register={(f, opts) => createForm.register(f as any, opts)}
                  setValue={(f, v) => createForm.setValue(f as any, v)}
                />
              ))}
              <button
                type="button"
                onClick={() => createAppend({ text: "" })}
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 font-semibold text-sm hover:border-slate-300 hover:bg-slate-50 transition-colors flex justify-center items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Question
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              disabled={createForm.formState.isSubmitting}
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl shadow-md transition-colors disabled:opacity-50"
            >
              {createForm.formState.isSubmitting ? "Saving…" : "Create Assignment"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── VIEW: Submissions ─────────────────────────────────────────────────────
  if (view === "submissions") {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setView("list")}
          className="text-sm font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-2 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Assignments
        </button>
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
            <Users className="w-5 h-5 text-indigo-500" />
            <h2 className="font-bold text-slate-800">Student Submissions</h2>
          </div>
          {subsLoading ? (
            <div className="p-12 text-center text-slate-400">Loading…</div>
          ) : submissions.length === 0 ? (
            <div className="p-16 text-center text-slate-500">No students have submitted yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Student</th>
                    <th className="px-6 py-3 font-semibold">Email</th>
                    <th className="px-6 py-3 font-semibold">Submitted On</th>
                    <th className="px-6 py-3 font-semibold text-right">Work</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {submissions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">{s.student.name}</td>
                      <td className="px-6 py-4 text-slate-500">{s.student.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(s.submittedAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <a
                          href={s.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-100 transition-colors text-xs"
                        >
                          <FileText className="w-4 h-4" /> View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── VIEW: List ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Edit Assignment</h3>
              <button
                onClick={() => setEditTarget(null)}
                className="text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto px-8 pb-8 pt-6 flex-1">
              <form id="edit-form" onSubmit={editForm.handleSubmit(onEdit)} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Title</label>
                    <input
                      {...editForm.register("title", { required: true })}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Due Date</label>
                    <input
                      type="datetime-local"
                      {...editForm.register("dueDate")}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                    <textarea
                      {...editForm.register("description")}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 min-h-[70px]"
                      placeholder="Extra instructions…"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-800 block mb-3">Questions</label>
                  <div className="space-y-3">
                    {editFields.map((field, index) => (
                      <QuestionRow
                        key={field.id}
                        prefix="edit"
                        index={index}
                        onRemove={() => editRemove(index)}
                        watchImageUrl={editForm.watch(`questions.${index}.imageUrl`)}
                        watchPdfUrl={editForm.watch(`questions.${index}.pdfUrl`)}
                        register={(f, opts) => editForm.register(f as any, opts)}
                        setValue={(f, v) => editForm.setValue(f as any, v)}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => editAppend({ text: "" })}
                      className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 font-semibold text-sm hover:border-slate-300 hover:bg-slate-50 transition-colors flex justify-center items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add Question
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <div className="px-8 py-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button
                onClick={() => setEditTarget(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                form="edit-form"
                type="submit"
                disabled={editForm.formState.isSubmitting}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-colors disabled:opacity-50"
              >
                {editForm.formState.isSubmitting ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Assignments
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage subject assignments and submissions</p>
        </div>
        <button
          onClick={() => setView("create")}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Create Assignment
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading assignments…</div>
      ) : assignments.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 p-16 text-center flex flex-col items-center gap-3">
          <FileText className="w-12 h-12 text-slate-300" />
          <p className="text-slate-500 font-medium">No assignments yet.</p>
          <button
            onClick={() => setView("create")}
            className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
          >
            Create your first →
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {assignments.map((item) => (
              <div
                key={item.id}
                className={`group relative flex flex-col bg-white border rounded-3xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden ${
                  item.isPublished
                    ? "border-slate-200 hover:border-indigo-200"
                    : "border-slate-200 bg-slate-50/60 opacity-70"
                }`}
              >
                {/* Status badge */}
                <div className="absolute top-4 right-4">
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-widest px-2 py-1 rounded-full border ${
                      item.isPublished
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    {item.isPublished ? "Published" : "Draft"}
                  </span>
                </div>

                {/* Body */}
                <div className="flex-1 mb-5">
                  <h3 className="font-bold text-slate-900 text-lg pr-20 leading-tight mb-1 group-hover:text-indigo-700 transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-sm text-slate-500 line-clamp-2 mt-1">{item.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-4 text-xs font-semibold text-slate-400 flex-wrap">
                    <span className="bg-slate-100 rounded-full px-2.5 py-1">
                      {item.questions.length} questions
                    </span>
                    {item.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(item.dueDate).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-slate-100 pt-4 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => loadSubmissions(item.id)}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                  >
                    <div className="relative">
                      <Users className="w-4 h-4" />
                      {item._count.submissions > 0 && (
                        <span className="absolute -top-1.5 -right-2 text-[9px] font-bold bg-indigo-600 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                          {item._count.submissions}
                        </span>
                      )}
                    </div>
                    <span>Submissions</span>
                  </button>
                  <button
                    onClick={() => openEdit(item)}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => togglePublish(item.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-semibold transition-colors ${
                      item.isPublished
                        ? "text-amber-600 hover:bg-amber-50"
                        : "text-emerald-600 hover:bg-emerald-50"
                    }`}
                  >
                    {item.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span>{item.isPublished ? "Unpublish" : "Publish"}</span>
                  </button>
                </div>
                <button
                  onClick={() => deleteAssignment(item.id)}
                  className="mt-2 w-full text-center py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                disabled={page <= 1}
                onClick={() => { const p = page - 1; setPage(p); loadAssignments(p); }}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-slate-700">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => { const p = page + 1; setPage(p); loadAssignments(p); }}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
