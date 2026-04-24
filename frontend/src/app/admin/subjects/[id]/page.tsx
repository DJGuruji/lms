"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Film, FileUp, Link as LinkIcon, ArrowLeft, Tags, ListTree, MoreHorizontal, Trash2, Edit2, Pencil, FileText } from "lucide-react";
import { ContentPreview } from "@/components/ContentPreview";
import { api } from "@/lib/api";
import { useParams } from "next/navigation";
import { AssignmentsTab } from "./AssignmentsTab";

// --- Types ---
type ContentCategory = {
  id: string;
  name: string;
  description: string | null;
  subjectId: string;
};

type ContentRow = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  fileUrl: string;
  subjectId: string;
  categoryId: string | null;
};

type UploadForm = {
  title: string;
  description?: string;
  type: string;
  categoryId?: string;
};

type CategoryForm = {
  name: string;
  description?: string;
};

// --- Limits ---
const FILE_LIMITS = {
  video: 50 * 1024 * 1024,
  pdf: 25 * 1024 * 1024,
  audio: 25 * 1024 * 1024,
  image: 10 * 1024 * 1024,
};

export default function SubjectContentPage() {
  const params = useParams();
  const subjectId = params.id as string;
  
  const [activeTab, setActiveTab] = useState<"contents" | "categories" | "assignments">("contents");
  
  // Data
  const [categories, setCategories] = useState<ContentCategory[]>([]);
  const [items, setItems] = useState<ContentRow[]>([]);
  
  // Pagination
  const [contentPage, setContentPage] = useState(1);
  const [contentMaxPage, setContentMaxPage] = useState(1);

  // States
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<ContentRow | null>(null);

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Forms
  const { register: regContent, handleSubmit: subContent, reset: resContent, watch } = useForm<UploadForm>({
    defaultValues: { type: "Video" },
  });
  
  const { register: regCat, handleSubmit: subCat, reset: resCat } = useForm<CategoryForm>();

  const selectedType = watch("type");

  // Loaders
  const loadCategories = useCallback(async () => {
    if (!subjectId) return;
    try {
      const res = await api.get<ContentCategory[]>(`/contents/categories?subjectId=${subjectId}`);
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch {
      setCategories([]);
    }
  }, [subjectId]);

  const loadContent = useCallback(async (pageStr = 1) => {
    if (!subjectId) return;
    try {
      // Endpoint handles pagination
      const res = await api.get<{data: ContentRow[], totalPages: number}>(`/contents?subjectId=${subjectId}&page=${pageStr}&limit=10`);
      if (res.data && res.data.data) {
        setItems(res.data.data);
        setContentMaxPage(res.data.totalPages || 1);
        setContentPage(pageStr);
        setPreview((prev) => {
          if (prev && res.data.data.some((x) => x.id === prev.id)) {
            return res.data.data.find((x) => x.id === prev.id) ?? null;
          }
          return null;
        });
      }
    } catch {
      setItems([]);
      setPreview(null);
    }
  }, [subjectId]);

  useEffect(() => {
    loadCategories();
    loadContent();
  }, [loadCategories, loadContent]);

  // Actions
  async function onUpload(data: UploadForm) {
    if (!file) return setError("Please choose a file.");
    
    // File size limits check
    const typeStr = data.type.toLowerCase();
    const size = file.size;
    if (typeStr === 'video' && size > FILE_LIMITS.video) return setError('Video exceeds 50 MB.');
    if (typeStr === 'pdf' && size > FILE_LIMITS.pdf) return setError('PDF exceeds 25 MB.');
    if (typeStr === 'audio' && size > FILE_LIMITS.audio) return setError('Audio exceeds 25 MB.');
    if (typeStr === 'image' && size > FILE_LIMITS.image) return setError('Image exceeds 10 MB.');

    setError(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", data.title.trim());
      if (data.description) fd.append("description", data.description.trim());
      fd.append("subjectId", subjectId);
      fd.append("type", data.type);
      if (data.categoryId) fd.append("categoryId", data.categoryId);
      
      await api.post("/contents/upload", fd);
      resContent({ title: "", description: "", type: data.type, categoryId: "" });
      setFile(null);
      await loadContent(1); // Back to page 1
    } catch (err: any) {
      setError(err?.response?.data?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onCreateCategory(data: CategoryForm) {
    try {
      await api.post("/contents/categories", {
        name: data.name,
        description: data.description,
        subjectId
      });
      resCat();
      setCatModalOpen(false);
      await loadCategories();
    } catch {
      alert("Failed to create category");
    }
  }

  async function onDeleteCategory(id: string) {
    if (!confirm("Delete category?")) return;
    try {
      await api.delete(`/contents/categories/${id}`);
      await loadCategories();
    } catch {
      alert("Failed to delete");
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => window.history.back()}
          className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Subject Space</h2>
          <p className="text-sm text-[var(--lms-muted)]">
            Manage categories and learning assets.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("contents")}
          className={`py-3 px-6 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'contents' ? 'border-blue-600 text-blue-700 bg-blue-50/30' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
        >
          <ListTree className="w-4 h-4" /> Contents
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("categories")}
          className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition ${
            activeTab === "categories"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
          }`}
        >
          <Tags className="h-4 w-4" />
          Categories
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("assignments")}
          className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition ${
            activeTab === "assignments"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
          }`}
        >
          <FileText className="h-4 w-4" />
          Assignments
        </button>
      </div>

      {activeTab === "assignments" && (
        <AssignmentsTab subjectId={subjectId} />
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
            <h3 className="font-semibold text-slate-800">Organize your content</h3>
            <button
              onClick={() => setCatModalOpen(true)}
              className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              + Create Category
            </button>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {categories.length === 0 ? (
               <div className="col-span-full py-12 text-center text-slate-500">No categories added yet.</div>
            ) : categories.map(cat => (
              <div key={cat.id} className="p-5 border border-slate-200 rounded-xl bg-white shadow-sm flex flex-col justify-between">
                 <div>
                   <h4 className="font-bold text-slate-800 uppercase tracking-tight">{cat.name}</h4>
                   <p className="text-sm text-slate-500 mt-1">{cat.description || "No description"}</p>
                 </div>
                 <div className="flex gap-2 justify-end mt-4">
                    <button className="text-blue-500 hover:text-blue-700 p-1"><Edit2 className="w-4 h-4"/></button>
                    <button onClick={() => onDeleteCategory(cat.id)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4"/></button>
                 </div>
              </div>
            ))}
          </div>

          {/* New Category Modal */}
          {catModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                <h3 className="text-lg font-bold mb-4">Create New Category</h3>
                <form onSubmit={subCat(onCreateCategory)} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Category Name</label>
                    <input {...regCat("name", {required: true})} className="w-full mt-1 border border-slate-200 rounded-xl px-4 py-2 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white" placeholder="Christmas Exam Special" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Description</label>
                    <textarea {...regCat("description")} rows={3} className="w-full mt-1 border border-slate-200 rounded-xl px-4 py-2 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white" placeholder="Study materials for the holidays"></textarea>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <button type="button" onClick={() => setCatModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                    <button type="submit" className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">Create</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contents Tab */}
      {activeTab === 'contents' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
            <h3 className="font-semibold text-slate-800">Manage learning assets</h3>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <FileUp className="h-4 w-4" /> Upload Asset
            </button>
          </div>

          {/* New Content Modal */}
          {uploadModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                <form onSubmit={subContent(onUpload)} className="p-6">
                  <h3 className="flex items-center gap-2 font-bold text-lg text-slate-900 border-b border-slate-100 pb-4 mb-6">
                    <FileUp className="h-5 w-5 text-blue-600" />
                    Upload Asset
                  </h3>
                  
                  <div className="space-y-5">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Title</label>
                      <input
                        {...regContent("title", { required: true })}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                        placeholder="Lesson title"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Category</label>
                        <select
                          {...regContent("categoryId")}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option value="">-- No Category --</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Format</label>
                        <select
                          {...regContent("type", {required: true})}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option value="Video">Video</option>
                          <option value="PDF">PDF</option>
                          <option value="Audio">Audio</option>
                          <option value="Image">Image</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">File</label>
                      <input
                        type="file"
                        accept="application/pdf,video/*,audio/*,image/*"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        className="mt-1 block w-full text-sm text-slate-500 file:mr-2 file:rounded-xl file:border-0 file:bg-blue-50 file:px-3 file:py-2.5 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Description (Optional)</label>
                      <textarea
                        {...regContent("description")}
                        rows={2}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                        placeholder="Additional context or notes..."
                      ></textarea>
                    </div>
                  </div>
                  
                  {error && <p className="mt-4 text-sm font-medium text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}
                  
                  <div className="flex justify-end gap-3 border-t border-slate-100 pt-5 mt-6">
                    <button type="button" onClick={() => setUploadModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                    <button
                      type="submit"
                      disabled={busy}
                      className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-60 transition"
                    >
                      {busy ? "Uploading…" : "Publish"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex justify-between items-center">
                  <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                    <Film className="h-5 w-5 text-blue-600" />
                    Content Library
                  </h3>
                </div>
                <ul className="divide-y divide-slate-100">
                  {items.length === 0 ? (
                     <li className="px-6 py-12 text-center text-slate-500 bg-slate-50/50">No files yet for this subject.</li>
                  ) : (
                    items.map((row) => (
                      <li key={row.id}>
                        <button
                          type="button"
                          onClick={() => setPreview(row)}
                          className={`flex w-full flex-col gap-2 px-6 py-4 text-left transition sm:flex-row sm:items-center sm:justify-between ${
                            preview?.id === row.id ? "bg-blue-50/80" : "hover:bg-slate-50"
                          }`}
                        >
                          <div>
                            <p className="font-bold text-slate-900">{row.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500">{row.type}</span>
                              {row.categoryId && (
                                <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-md">
                                  {categories.find(c => c.id === row.categoryId)?.name || "Categorized"}
                                </span>
                              )}
                            </div>
                            {row.description && <p className="text-xs text-slate-400 mt-2 line-clamp-1">{row.description}</p>}
                          </div>
                          <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600">
                            <LinkIcon className="h-4 w-4" />
                            {preview?.id === row.id ? "Previewing" : "Preview"}
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>

                {/* Pagination Controls */}
                {contentMaxPage > 1 && (
                  <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-100">
                     <button 
                        disabled={contentPage <= 1}
                        onClick={() => loadContent(contentPage - 1)}
                        className="text-sm px-4 py-2 border border-slate-200 bg-white rounded-lg disabled:opacity-50"
                      >
                       Previous
                     </button>
                     <span className="text-sm font-medium text-slate-600">Page {contentPage} of {contentMaxPage}</span>
                     <button
                        disabled={contentPage >= contentMaxPage}
                        onClick={() => loadContent(contentPage + 1)}
                        className="text-sm px-4 py-2 border border-slate-200 bg-white rounded-lg disabled:opacity-50"
                     >
                       Next
                     </button>
                  </div>
                )}
            </div>
          </div>

          {preview && (
            <div className="mt-8 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-inner">
              <div className="flex justify-between items-center">
                 <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Pencil className="w-4 h-4 text-slate-400" />
                    Preview: {preview.title}
                 </h3>
                 <a
                  href={preview.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-blue-100 text-blue-700 px-4 py-1 text-xs font-bold hover:bg-blue-200 transition"
                >
                  Pop Out
                </a>
              </div>
              <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/60 aspect-video">
                <ContentPreview
                  title={preview.title}
                  type={preview.type}
                  fileUrl={preview.fileUrl}
                />
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
