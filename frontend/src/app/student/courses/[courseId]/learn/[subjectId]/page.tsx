"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, Film, Tags, FolderOpen, Folder,
  FileText, Paperclip, ImageIcon, ExternalLink,
  Calendar, CheckCircle2, Clock, AlertCircle,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { api } from "@/lib/api";
import { ContentPreview } from "@/components/ContentPreview";
import { StudentShell } from "@/components/student/StudentShell";

// ── Types ──────────────────────────────────────────────────────────────────
type ContentRow = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  fileUrl: string;
  subjectId: string;
  categoryId: string | null;
};

type Category = {
  id: string;
  name: string;
  description: string | null;
};

type QBItem = {
  id: string;
  title: string;
  fileUrl: string;
  fileType: "image" | "pdf";
  createdAt: string;
};

type QBFolder = {
  id: string;
  name: string;
  _count: { items: number };
  items: QBItem[];
};

type AssignmentQuestion = {
  id: string;
  text: string;
  imageUrl: string | null;
  pdfUrl: string | null;
};

type AssignmentRow = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  questions: AssignmentQuestion[];
  submissions: { id: string }[];
};

type ActiveTab = "content" | "questionbank" | "assignments";

// ── Main Component ─────────────────────────────────────────────────────────
export default function SubjectContentPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const subjectId = params.subjectId as string;

  const [activeTab, setActiveTab] = useState<ActiveTab>("content");

  // Content state
  const [items, setItems] = useState<ContentRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [preview, setPreview] = useState<ContentRow | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(true);
  const [viewed, setViewed] = useState<Record<string, true>>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Question Bank state
  const [qbFolders, setQbFolders] = useState<QBFolder[]>([]);
  const [qbLoading, setQbLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<QBFolder | null>(null);

  // Assignments state
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [expandedAssign, setExpandedAssign] = useState<string | null>(null);

  // ── Loaders ───────────────────────────────────────────────────────────────
  const loadContent = useCallback(async () => {
    setContentError(null);
    try {
      const [contentRes, categoryRes] = await Promise.all([
        api.get<ContentRow[]>(`/student/contents?subjectId=${subjectId}`),
        api.get<Category[]>(`/student/contents/categories?subjectId=${subjectId}`),
      ]);
      const loadedItems = Array.isArray(contentRes.data) ? contentRes.data : [];
      setItems(loadedItems);
      setCategories(Array.isArray(categoryRes.data) ? categoryRes.data : []);
      if (loadedItems.length > 0) setPreview(loadedItems[0]);
    } catch {
      setContentError("Could not load subject contents.");
    } finally {
      setContentLoading(false);
    }
  }, [subjectId]);

  const loadQB = useCallback(async () => {
    setQbLoading(true);
    try {
      const res = await api.get<QBFolder[]>(`/student/subjects/${subjectId}/question-bank/folders`);
      setQbFolders(Array.isArray(res.data) ? res.data : []);
    } finally {
      setQbLoading(false);
    }
  }, [subjectId]);

  const loadAssignments = useCallback(async () => {
    setAssignLoading(true);
    try {
      const res = await api.get<AssignmentRow[]>(`/student/assignments?subjectId=${subjectId}`);
      setAssignments(Array.isArray(res.data) ? res.data : []);
    } finally {
      setAssignLoading(false);
    }
  }, [subjectId]);

  useEffect(() => { loadContent(); }, [loadContent]);

  useEffect(() => {
    if (activeTab === "questionbank" && qbFolders.length === 0 && !qbLoading) loadQB();
    if (activeTab === "assignments" && assignments.length === 0 && !assignLoading) loadAssignments();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track content views
  useEffect(() => {
    const id = preview?.id;
    if (!id || viewed[id]) return;
    setViewed(m => ({ ...m, [id]: true }));
    void api.post(`/student/contents/view?contentId=${id}`).catch(() => undefined);
  }, [preview?.id, viewed]);

  const filteredItems = activeCategory
    ? items.filter(i => activeCategory === "uncategorized" ? !i.categoryId : i.categoryId === activeCategory)
    : items;

  // ── Tab nav helper ─────────────────────────────────────────────────────────
  const tabClass = (t: ActiveTab) =>
    `flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
      activeTab === t
        ? "border-indigo-600 text-indigo-700 bg-indigo-50/40"
        : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
    }`;

  return (
    <StudentShell title="Subject Contents">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link
          href={`/student/courses/${courseId}/learn`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors bg-white border border-slate-200 shadow-sm rounded-full px-4 py-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to subjects
        </Link>

        {/* Tab bar */}
        <div className="flex border-b border-slate-200 bg-white rounded-t-2xl overflow-hidden shadow-sm">
          <button className={tabClass("content")} onClick={() => setActiveTab("content")}>
            <Film className="w-4 h-4" /> Content
          </button>
          <button className={tabClass("questionbank")} onClick={() => setActiveTab("questionbank")}>
            <FolderOpen className="w-4 h-4" /> Question Bank
          </button>
          <button className={tabClass("assignments")} onClick={() => setActiveTab("assignments")}>
            <FileText className="w-4 h-4" /> Assignments
          </button>
        </div>

        {/* ── CONTENT TAB ──────────────────────────────────────────────────── */}
        {activeTab === "content" && (
          <>
            {contentError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{contentError}</div>
            )}
            {contentLoading ? (
              <div className="flex justify-center items-center h-48 text-slate-500 font-medium">Loading content…</div>
            ) : (
              <div className="grid gap-8 lg:grid-cols-12">
                {/* Left sidebar */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  {/* Category filter */}
                  <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm overflow-hidden p-2">
                    <div className="px-4 py-3 border-b border-slate-100 mb-2 flex items-center gap-2 text-indigo-900 font-bold">
                      <Tags className="w-5 h-5 text-indigo-500" /> Content Segregations
                    </div>
                    <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto px-2">
                      <button
                        onClick={() => setActiveCategory(null)}
                        className={`text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeCategory === null ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50"}`}
                      >
                        All Contents ({items.length})
                      </button>
                      {categories.map(cat => {
                        const count = items.filter(i => i.categoryId === cat.id).length;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex justify-between items-center ${activeCategory === cat.id ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                          >
                            {cat.name}
                            <span className={`text-xs px-2 py-0.5 rounded-full ${activeCategory === cat.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{count}</span>
                          </button>
                        );
                      })}
                      {items.some(i => !i.categoryId) && (
                        <button
                          onClick={() => setActiveCategory("uncategorized")}
                          className={`text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex justify-between items-center ${activeCategory === "uncategorized" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                        >
                          Uncategorized
                          <span className={`text-xs px-2 py-0.5 rounded-full ${activeCategory === "uncategorized" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{items.filter(i => !i.categoryId).length}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* List */}
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2 font-bold text-slate-800">
                      <Film className="w-5 h-5 text-blue-500" /> Lessons List
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[500px]">
                      {filteredItems.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-sm">No items found.</div>
                      ) : (
                        <ul className="divide-y divide-slate-100 p-2">
                          {filteredItems.map(item => (
                            <li key={item.id}>
                              <button
                                onClick={() => setPreview(item)}
                                className={`w-full text-left rounded-xl p-4 transition-all ${preview?.id === item.id ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50"}`}
                              >
                                <div className="font-bold text-slate-900">{item.title}</div>
                                {item.description && <div className="text-xs text-slate-500 mt-1 line-clamp-1">{item.description}</div>}
                                <div className="mt-2 inline-block px-2 py-0.5 border border-slate-200 rounded-md text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-white">{item.type}</div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>

                {/* Media player */}
                <div className="lg:col-span-7">
                  {preview ? (
                    <div className="sticky top-6">
                      <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-slate-900/10">
                        <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                          <h3 className="text-white font-bold">{preview.title}</h3>
                          <a href={preview.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors">Open Window</a>
                        </div>
                        <ContentPreview title={preview.title} type={preview.type} fileUrl={preview.fileUrl} />
                        {preview.description && (
                          <div className="p-6 bg-white text-slate-600 text-sm border-t border-slate-100">
                            <strong className="text-slate-900 block mb-1">Instructor Note:</strong>
                            {preview.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-[400px] items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 text-sm font-medium text-slate-400">
                      Select a lesson to preview media.
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── QUESTION BANK TAB ────────────────────────────────────────────── */}
        {activeTab === "questionbank" && (
          <div className="space-y-6">
            {qbLoading ? (
              <div className="p-12 text-center text-slate-400">Loading question bank…</div>
            ) : qbFolders.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed border-slate-200 p-16 text-center flex flex-col items-center gap-3">
                <FolderOpen className="w-12 h-12 text-slate-300" />
                <p className="text-slate-500 font-medium">No question bank documents available yet.</p>
              </div>
            ) : !selectedFolder ? (
              /* ── Folder card grid ── */
              <div>
                <p className="text-sm text-slate-500 mb-4 font-medium">Select a folder to view its documents</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {qbFolders.map(folder => (
                    <button
                      key={folder.id}
                      onClick={() => setSelectedFolder(folder)}
                      className="group flex flex-col items-center gap-3 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-amber-300 transition-all duration-200 text-center"
                    >
                      {/* Folder icon with item count badge */}
                      <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                          <Folder className="w-8 h-8 text-amber-500" />
                        </div>
                        <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] bg-indigo-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center px-1 shadow-md">
                          {folder._count.items}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 group-hover:text-amber-700 transition-colors line-clamp-2 leading-tight">{folder.name}</p>
                        <p className="text-xs text-slate-400 mt-1">{folder._count.items} document{folder._count.items !== 1 ? "s" : ""}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* ── Document cards inside selected folder ── */
              <div className="space-y-4">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedFolder(null)}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> All Folders
                  </button>
                  <span className="text-slate-300">/</span>
                  <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <FolderOpen className="w-4 h-4 text-amber-500" />
                    {selectedFolder.name}
                  </span>
                </div>

                {selectedFolder.items.length === 0 ? (
                  <div className="rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center flex flex-col items-center gap-3">
                    <FileText className="w-10 h-10 text-slate-300" />
                    <p className="text-slate-500 font-medium text-sm">No documents in this folder yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {selectedFolder.items.map(item => (
                      <a
                        key={item.id}
                        href={item.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-indigo-200 transition-all duration-200"
                      >
                        {/* Thumbnail */}
                        {item.fileType === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.fileUrl}
                            alt={item.title}
                            className="w-full h-32 object-cover bg-slate-100"
                          />
                        ) : (
                          <div className="w-full h-32 bg-gradient-to-br from-rose-50 to-rose-100 flex flex-col items-center justify-center gap-2 border-b border-rose-100">
                            <Paperclip className="w-10 h-10 text-rose-400" />
                            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">PDF</span>
                          </div>
                        )}

                        {/* Info */}
                        <div className="p-3">
                          <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-snug mb-2">{item.title}</p>
                          <div className="flex items-center justify-between">
                            <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                              item.fileType === "pdf"
                                ? "bg-rose-100 text-rose-600"
                                : "bg-blue-100 text-blue-600"
                            }`}>
                              {item.fileType === "pdf"
                                ? <Paperclip className="w-2.5 h-2.5" />
                                : <ImageIcon className="w-2.5 h-2.5" />
                              }
                              {item.fileType}
                            </span>
                            <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── ASSIGNMENTS TAB ──────────────────────────────────────────────── */}
        {activeTab === "assignments" && (
          <div className="space-y-6">
            {assignLoading ? (
              <div className="p-12 text-center text-slate-400">Loading assignments…</div>
            ) : assignments.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed border-slate-200 p-16 text-center flex flex-col items-center gap-3">
                <FileText className="w-12 h-12 text-slate-300" />
                <p className="text-slate-500 font-medium">No assignments for this subject yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {assignments.map(assign => {
                  const submitted = assign.submissions.length > 0;
                  const overdue = assign.dueDate ? new Date(assign.dueDate) < new Date() : false;
                  const isOpen = expandedAssign === assign.id;

                  // Status config
                  const status = submitted
                    ? { label: "Submitted", icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700 border-emerald-200", iconColor: "text-emerald-500", cardBorder: "border-emerald-100" }
                    : overdue
                    ? { label: "Overdue", icon: AlertCircle, color: "bg-red-50 text-red-600 border-red-200", iconColor: "text-red-400", cardBorder: "border-red-100" }
                    : { label: "Pending", icon: Clock, color: "bg-amber-50 text-amber-700 border-amber-200", iconColor: "text-amber-400", cardBorder: "border-slate-200" };

                  const StatusIcon = status.icon;

                  return (
                    <div
                      key={assign.id}
                      className={`bg-white border rounded-3xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden ${status.cardBorder}`}
                    >
                      {/* Card header */}
                      <div className="p-5">
                        {/* Status badge */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border ${status.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </span>
                          <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                            {assign.questions.length} Q{assign.questions.length !== 1 ? "s" : ""}
                          </span>
                        </div>

                        <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2 mb-2">{assign.title}</h3>

                        {assign.description && (
                          <p className="text-xs text-slate-500 line-clamp-2 mb-2">{assign.description}</p>
                        )}

                        {assign.dueDate && (
                          <div className={`flex items-center gap-1.5 text-xs font-semibold mt-2 ${overdue && !submitted ? "text-red-500" : "text-slate-400"}`}>
                            <Calendar className="w-3.5 h-3.5" />
                            Due: {new Date(assign.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                            {overdue && !submitted && " · Overdue"}
                          </div>
                        )}
                      </div>

                      {/* Expandable questions */}
                      <div className="border-t border-slate-100">
                        <button
                          onClick={() => setExpandedAssign(isOpen ? null : assign.id)}
                          className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                        >
                          <span>View Questions</span>
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {isOpen && (
                          <div className="px-5 pb-4 space-y-3 border-t border-slate-100 pt-3 bg-slate-50/50">
                            {assign.questions.map((q, idx) => (
                              <div key={q.id} className="p-3 rounded-2xl bg-white border border-slate-100 shadow-sm">
                                <p className="text-xs font-semibold text-slate-800 mb-2">
                                  <span className="text-indigo-500 mr-1">Q{idx + 1}.</span>
                                  {q.text}
                                </p>
                                <div className="flex gap-2 flex-wrap">
                                  {q.imageUrl && (
                                    <a
                                      href={q.imageUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors"
                                    >
                                      <ImageIcon className="w-3 h-3" /> Image
                                    </a>
                                  )}
                                  {q.pdfUrl && (
                                    <a
                                      href={q.pdfUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg hover:bg-rose-100 transition-colors"
                                    >
                                      <Paperclip className="w-3 h-3" /> PDF
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Submit CTA */}
                      {!submitted && !overdue && (
                        <div className="px-5 pb-5 pt-3">
                          <Link
                            href="/student/assignments"
                            className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-600/20 transition-colors"
                          >
                            Submit Assignment →
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </StudentShell>
  );
}
