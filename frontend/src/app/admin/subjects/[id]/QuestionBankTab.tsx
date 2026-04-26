"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus, Folder, FolderOpen, Trash2, Pencil, FileText,
  ImageIcon, Paperclip, Loader2, ChevronLeft, ChevronRight,
  X, Upload, Check,
} from "lucide-react";
import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────
type QBFolder = {
  id: string;
  name: string;
  createdAt: string;
  _count: { items: number };
};

type QBItem = {
  id: string;
  title: string;
  fileUrl: string;
  fileType: "image" | "pdf";
  createdAt: string;
};

type PaginatedItems = {
  data: QBItem[];
  total: number;
  page: number;
  totalPages: number;
};

type Props = { subjectId: string };

// ── Helpers ────────────────────────────────────────────────────────────────
function FileTypeBadge({ type }: { type: string }) {
  const isPdf = type === "pdf";
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
        isPdf
          ? "bg-rose-50 text-rose-600 border-rose-200"
          : "bg-blue-50 text-blue-600 border-blue-200"
      }`}
    >
      {isPdf ? <Paperclip className="w-2.5 h-2.5" /> : <ImageIcon className="w-2.5 h-2.5" />}
      {type}
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export function QuestionBankTab({ subjectId }: Props) {
  const [folders, setFolders] = useState<QBFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<QBFolder | null>(null);
  const [items, setItems] = useState<QBItem[]>([]);
  const [itemPage, setItemPage] = useState(1);
  const [itemTotalPages, setItemTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Create folder modal
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderSaving, setFolderSaving] = useState(false);

  // Rename folder inline
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingVal, setRenamingVal] = useState("");

  // Upload item modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit item inline
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // ── Loaders ───────────────────────────────────────────────────────────────
  const loadFolders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<QBFolder[]>(`/subjects/${subjectId}/question-bank/folders`);
      setFolders(Array.isArray(res.data) ? res.data : []);
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  const loadItems = useCallback(async (folder: QBFolder, page = 1) => {
    setItemsLoading(true);
    try {
      const res = await api.get<PaginatedItems>(
        `/subjects/${subjectId}/question-bank/folders/${folder.id}/items?page=${page}`
      );
      setItems(Array.isArray(res.data.data) ? res.data.data : []);
      setItemPage(res.data.page ?? page);
      setItemTotalPages(res.data.totalPages ?? 1);
    } finally {
      setItemsLoading(false);
    }
  }, [subjectId]);

  useEffect(() => { loadFolders(); }, [loadFolders]);

  const selectFolder = (f: QBFolder) => {
    setSelectedFolder(f);
    setItemPage(1);
    loadItems(f, 1);
  };

  // ── Folder actions ────────────────────────────────────────────────────────
  async function createFolder() {
    if (!folderName.trim()) return;
    setFolderSaving(true);
    try {
      await api.post(`/subjects/${subjectId}/question-bank/folders`, { name: folderName.trim() });
      setFolderName("");
      setFolderModalOpen(false);
      await loadFolders();
    } finally {
      setFolderSaving(false);
    }
  }

  async function deleteFolder(id: string) {
    if (!confirm("Delete this folder and all its documents?")) return;
    await api.delete(`/subjects/${subjectId}/question-bank/folders/${id}`);
    if (selectedFolder?.id === id) { setSelectedFolder(null); setItems([]); }
    loadFolders();
  }

  async function saveRename(id: string) {
    if (!renamingVal.trim()) return;
    await api.patch(`/subjects/${subjectId}/question-bank/folders/${id}`, { name: renamingVal.trim() });
    setRenamingId(null);
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name: renamingVal.trim() } : f));
    if (selectedFolder?.id === id) setSelectedFolder(f => f ? { ...f, name: renamingVal.trim() } : f);
  }

  // ── Upload item ───────────────────────────────────────────────────────────
  async function handleUpload() {
    if (!selectedFolder || !uploadFile || !uploadTitle.trim()) {
      setUploadError("Title and file are required.");
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      // 1. Upload file
      const fd = new FormData();
      fd.append("file", uploadFile);
      const uploadRes = await api.post<{ fileUrl: string }>(
        `/subjects/${subjectId}/question-bank/upload`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      const fileUrl = uploadRes.data.fileUrl;
      const fileType = uploadFile.type.startsWith("image/") ? "image" : "pdf";

      // 2. Create item record
      await api.post(`/subjects/${subjectId}/question-bank/folders/${selectedFolder.id}/items`, {
        title: uploadTitle.trim(),
        fileUrl,
        fileType,
      });

      setUploadTitle("");
      setUploadFile(null);
      setUploadModalOpen(false);
      await loadItems(selectedFolder, itemPage);
      await loadFolders(); // refresh count
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  // ── Edit item ─────────────────────────────────────────────────────────────
  async function saveEditItem(itemId: string) {
    if (!editingTitle.trim()) return;
    await api.patch(`/subjects/${subjectId}/question-bank/items/${itemId}`, { title: editingTitle.trim() });
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, title: editingTitle.trim() } : i));
    setEditingItemId(null);
  }

  async function deleteItem(itemId: string) {
    if (!confirm("Delete this document?")) return;
    await api.delete(`/subjects/${subjectId}/question-bank/items/${itemId}`);
    if (selectedFolder) loadItems(selectedFolder, itemPage);
    loadFolders();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Create Folder Modal */}
      {folderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-8 space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">New Folder</h3>
              <button onClick={() => setFolderModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              autoFocus
              value={folderName}
              onChange={e => setFolderName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createFolder()}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              placeholder="e.g. Chapter 3 MCQs"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setFolderModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50">Cancel</button>
              <button onClick={createFolder} disabled={folderSaving || !folderName.trim()} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                {folderSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {uploadModalOpen && selectedFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Upload Document</h3>
              <button onClick={() => { setUploadModalOpen(false); setUploadError(null); }} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-xl px-3 py-2 flex items-center gap-2">
              <Folder className="w-3.5 h-3.5" /> {selectedFolder.name}
            </div>
            {uploadError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{uploadError}</p>}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Title</label>
              <input
                value={uploadTitle}
                onChange={e => setUploadTitle(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Chapter 3 Q1 Image"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">File (Image or PDF, max 25 MB)</label>
              <div
                className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadFile ? (
                  <div className="flex flex-col items-center gap-2">
                    {uploadFile.type.startsWith("image/") ? (
                      <ImageIcon className="w-8 h-8 text-blue-500" />
                    ) : (
                      <Paperclip className="w-8 h-8 text-rose-500" />
                    )}
                    <p className="text-sm font-semibold text-slate-700 truncate max-w-[240px]">{uploadFile.name}</p>
                    <p className="text-xs text-slate-400">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-slate-300" />
                    <p className="text-sm text-slate-400 font-medium">Click to select file</p>
                    <p className="text-xs text-slate-300">PNG, JPG, PDF</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,application/pdf"
                  className="hidden"
                  onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => { setUploadModalOpen(false); setUploadError(null); }} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50">Cancel</button>
              <button onClick={handleUpload} disabled={uploading || !uploadFile || !uploadTitle.trim()} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? "Uploading…" : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-amber-500" />
            Question Bank
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Organise question documents in folders</p>
        </div>
        <button
          onClick={() => setFolderModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition"
        >
          <Plus className="h-4 w-4" /> New Folder
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Folder list */}
        <div className="lg:col-span-4 space-y-2">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading folders…</div>
          ) : folders.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center flex flex-col items-center gap-3">
              <Folder className="w-10 h-10 text-slate-300" />
              <p className="text-slate-500 font-medium text-sm">No folders yet.</p>
              <button onClick={() => setFolderModalOpen(true)} className="text-sm font-bold text-indigo-600 hover:text-indigo-700">Create first folder →</button>
            </div>
          ) : (
            folders.map(f => (
              <div
                key={f.id}
                className={`group flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all duration-150 ${
                  selectedFolder?.id === f.id
                    ? "bg-indigo-50 border-indigo-200 shadow-sm"
                    : "bg-white border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30"
                }`}
                onClick={() => { if (renamingId !== f.id) selectFolder(f); }}
              >
                {selectedFolder?.id === f.id ? (
                  <FolderOpen className="w-5 h-5 text-indigo-500 shrink-0" />
                ) : (
                  <Folder className="w-5 h-5 text-amber-400 shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  {renamingId === f.id ? (
                    <input
                      autoFocus
                      value={renamingVal}
                      onChange={e => setRenamingVal(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") saveRename(f.id);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      onClick={e => e.stopPropagation()}
                      className="w-full text-sm font-semibold border-b border-indigo-400 outline-none bg-transparent text-slate-900 pb-0.5"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-slate-900 truncate">{f.name}</p>
                  )}
                  <p className="text-xs text-slate-400">{f._count.items} document{f._count.items !== 1 ? "s" : ""}</p>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
                  {renamingId === f.id ? (
                    <button onClick={() => saveRename(f.id)} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button onClick={() => { setRenamingId(f.id); setRenamingVal(f.name); }} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => deleteFolder(f.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Item panel */}
        <div className="lg:col-span-8">
          {!selectedFolder ? (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 font-medium text-sm">
              ← Select a folder to view its documents
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-amber-500" />
                  {selectedFolder.name}
                </h3>
                <button
                  onClick={() => { setUploadTitle(""); setUploadFile(null); setUploadError(null); setUploadModalOpen(true); }}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload Document
                </button>
              </div>

              {itemsLoading ? (
                <div className="p-12 text-center text-slate-400">Loading…</div>
              ) : items.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center flex flex-col items-center gap-3">
                  <FileText className="w-10 h-10 text-slate-300" />
                  <p className="text-slate-500 font-medium text-sm">No documents yet.</p>
                  <button onClick={() => setUploadModalOpen(true)} className="text-sm font-bold text-emerald-600 hover:text-emerald-700">Upload first document →</button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {items.map(item => (
                      <div
                        key={item.id}
                        className="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                      >
                        {/* Preview */}
                        <a href={item.fileUrl} target="_blank" rel="noreferrer" className="block">
                          {item.fileType === "image" ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.fileUrl}
                              alt={item.title}
                              className="w-full h-36 object-cover bg-slate-100"
                            />
                          ) : (
                            <div className="w-full h-36 bg-rose-50 flex items-center justify-center">
                              <Paperclip className="w-12 h-12 text-rose-300" />
                            </div>
                          )}
                        </a>

                        {/* Info */}
                        <div className="p-3 space-y-2">
                          {editingItemId === item.id ? (
                            <div className="flex gap-2">
                              <input
                                autoFocus
                                value={editingTitle}
                                onChange={e => setEditingTitle(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") saveEditItem(item.id); if (e.key === "Escape") setEditingItemId(null); }}
                                className="flex-1 text-sm border-b border-indigo-400 outline-none bg-transparent text-slate-900"
                              />
                              <button onClick={() => saveEditItem(item.id)} className="text-emerald-600 hover:text-emerald-700">
                                <Check className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <p className="text-sm font-semibold text-slate-800 line-clamp-2 leading-tight">{item.title}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <FileTypeBadge type={item.fileType} />
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingItemId(item.id); setEditingTitle(item.title); }} className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deleteItem(item.id)} className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {itemTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        disabled={itemPage <= 1}
                        onClick={() => { const p = itemPage - 1; setItemPage(p); loadItems(selectedFolder, p); }}
                        className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-semibold text-slate-700">Page {itemPage} of {itemTotalPages}</span>
                      <button
                        disabled={itemPage >= itemTotalPages}
                        onClick={() => { const p = itemPage + 1; setItemPage(p); loadItems(selectedFolder, p); }}
                        className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
