"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Film, Tags } from "lucide-react";
import { api } from "@/lib/api";
import { ContentPreview } from "@/components/ContentPreview";
import { StudentShell } from "@/components/student/StudentShell";

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

export default function SubjectContentPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const subjectId = params.subjectId as string;

  const [items, setItems] = useState<ContentRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [preview, setPreview] = useState<ContentRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewed, setViewed] = useState<Record<string, true>>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [contentRes, categoryRes] = await Promise.all([
        api.get<ContentRow[]>(`/student/contents?subjectId=${subjectId}`),
        api.get<Category[]>(`/student/contents/categories?subjectId=${subjectId}`)
      ]);
      
      const loadedItems = Array.isArray(contentRes.data) ? contentRes.data : [];
      setItems(loadedItems);
      setCategories(Array.isArray(categoryRes.data) ? categoryRes.data : []);

      if (loadedItems.length > 0) setPreview(loadedItems[0]);

    } catch {
      setError("Could not load subject contents.");
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const id = preview?.id;
    if (!id) return;
    if (viewed[id]) return;
    setViewed((m) => ({ ...m, [id]: true }));
    void api.post(`/student/contents/view?contentId=${id}`).catch(() => undefined);
  }, [preview?.id, viewed]);

  const filteredItems = activeCategory 
    ? items.filter(i => activeCategory === 'uncategorized' ? !i.categoryId : i.categoryId === activeCategory)
    : items;

  return (
    <StudentShell title="Subject Contents">
      <div className="mx-auto max-w-6xl space-y-8">
        <Link
          href={`/student/courses/${courseId}/learn`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors bg-white border border-slate-200 shadow-sm rounded-full px-4 py-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to subjects
        </Link>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-48 text-slate-500 font-medium">Loading content segregations...</div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-12">
            
            {/* Left Sidebar: Segregations & List */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              
              {/* Categories/Segregation Selector */}
              <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm overflow-hidden p-2">
                <div className="px-4 py-3 border-b border-slate-100 mb-2 flex items-center gap-2 text-indigo-900 font-bold">
                   <Tags className="w-5 h-5 text-indigo-500"/> Content Segregations
                </div>
                <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto px-2">
                   <button
                     onClick={() => setActiveCategory(null)}
                     className={`text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeCategory === null ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 hover:bg-slate-50'}`}
                   >
                     All Contents ({items.length})
                   </button>
                   {categories.map(cat => {
                     const count = items.filter(i => i.categoryId === cat.id).length;
                     return (
                       <button
                         key={cat.id}
                         onClick={() => setActiveCategory(cat.id)}
                         className={`text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex justify-between items-center ${activeCategory === cat.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 hover:bg-slate-50'}`}
                       >
                         {cat.name}
                         <span className={`text-xs px-2 py-0.5 rounded-full ${activeCategory === cat.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                       </button>
                     )
                   })}
                   {items.some(i => !i.categoryId) && (
                     <button
                       onClick={() => setActiveCategory('uncategorized')}
                       className={`text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex justify-between items-center ${activeCategory === 'uncategorized' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 hover:bg-slate-50'}`}
                     >
                       Uncategorized
                       <span className={`text-xs px-2 py-0.5 rounded-full ${activeCategory === 'uncategorized' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{items.filter(i => !i.categoryId).length}</span>
                     </button>
                   )}
                </div>
              </div>

              {/* Content List */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
                 <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2 font-bold text-slate-800">
                    <Film className="w-5 h-5 text-blue-500"/>
                    Lessons List
                 </div>
                 <div className="flex-1 overflow-y-auto max-h-[500px]">
                    {filteredItems.length === 0 ? (
                       <div className="p-8 text-center text-slate-500 text-sm">No items found in this category.</div>
                    ) : (
                      <ul className="divide-y divide-slate-100 p-2">
                        {filteredItems.map(item => (
                           <li key={item.id}>
                             <button
                               onClick={() => setPreview(item)}
                               className={`w-full text-left rounded-xl p-4 transition-all ${
                                 preview?.id === item.id ? 'bg-blue-50 ring-1 ring-blue-200 outline-none' : 'hover:bg-slate-50'
                               }`}
                             >
                                <div className="font-bold text-slate-900 group-hover:text-blue-700">{item.title}</div>
                                {item.description && <div className="text-xs text-slate-500 mt-1 line-clamp-1">{item.description}</div>}
                                <div className="mt-2 inline-block px-2 py-0.5 border border-slate-200 rounded-md text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-white">
                                   {item.type}
                                </div>
                             </button>
                           </li>
                        ))}
                      </ul>
                    )}
                 </div>
              </div>
            </div>

            {/* Right Side: Media Player */}
            <div className="lg:col-span-7">
               {preview ? (
                  <div className="sticky top-6">
                    <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-slate-900/10">
                       <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                          <h3 className="text-white font-bold">{preview.title}</h3>
                          <a href={preview.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors">Open Window</a>
                       </div>
                       <ContentPreview
                         title={preview.title}
                         type={preview.type}
                         fileUrl={preview.fileUrl}
                       />
                       {preview.description && (
                         <div className="p-6 bg-white text-slate-600 text-sm border-t border-slate-100">
                           <strong className="text-slate-900 block mb-1">Instructor Note:</strong>
                           {preview.description}
                         </div>
                       )}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-[400px] items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-medium text-slate-400">
                    Select a lesson to preview media.
                  </div>
                )}
            </div>

          </div>
        )}
      </div>
    </StudentShell>
  );
}
