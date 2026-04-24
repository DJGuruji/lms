"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Calendar, Link as LinkIcon, Upload, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";
import { StudentShell } from "@/components/student/StudentShell";

type AssignmentQuestionRow = {
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
  subject: { name: string; course: { name: string } };
  questions: AssignmentQuestionRow[];
  submissions: { fileUrl: string; submittedAt: string }[];
};

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Submission State
  const [activeAssignment, setActiveAssignment] = useState<AssignmentRow | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<AssignmentRow[]>("/student/assignments");
      setAssignments(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError("Failed to load assignments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssignment || (!fileUrl && !fileObj)) return;
    setSubmitting(true);
    try {
      let finalUrl = fileUrl;
      // If student attached a file instead of a URL, upload it first:
      if (fileObj) {
         const fd = new FormData();
         fd.append("file", fileObj);
         const uploadRes = await api.post<{fileUrl: string}>("/student/assignments/upload", fd, {
            headers: { "Content-Type": "multipart/form-data" }
         });
         finalUrl = uploadRes.data.fileUrl;
      }
      await api.post(`/student/assignments/${activeAssignment.id}/submit`, { fileUrl: finalUrl });
      setActiveAssignment(null);
      setFileUrl("");
      setFileObj(null);
      loadAssignments();
    } catch {
      alert("Failed to submit assignment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (activeAssignment) {
    const isSubmitted = activeAssignment.submissions && activeAssignment.submissions.length > 0;
    
    return (
      <StudentShell title="Submit Assignment">
        <div className="mx-auto max-w-4xl space-y-6">
          <button onClick={() => setActiveAssignment(null)} className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-2">
             &larr; Back to assignments list
          </button>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
             <div className="p-8 border-b border-indigo-100 bg-indigo-50/30">
                <div className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2">{activeAssignment.subject.course.name} &bull; {activeAssignment.subject.name}</div>
                <h1 className="text-2xl font-bold text-slate-900">{activeAssignment.title}</h1>
                {activeAssignment.description && <p className="mt-3 text-slate-600 leading-relaxed">{activeAssignment.description}</p>}
             </div>
             
             <div className="p-8">
                <h2 className="font-bold text-slate-800 mb-4">{activeAssignment.questions.length} Questions</h2>
                <div className="space-y-6">
                   {activeAssignment.questions.map((q, i) => (
                      <div key={q.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
                         <h3 className="font-bold text-slate-800 mb-2">Q{i+1}. {q.text}</h3>
                         {(q.imageUrl || q.pdfUrl) && (
                            <div className="flex gap-3 mt-3">
                               {q.imageUrl && <a href={q.imageUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1"><LinkIcon className="w-4 h-4" /> Attached Image</a>}
                               {q.pdfUrl && <a href={q.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1"><LinkIcon className="w-4 h-4" /> Attached PDF</a>}
                            </div>
                         )}
                      </div>
                   ))}
                </div>
             </div>
             
             <div className="p-8 bg-slate-50 border-t border-slate-100">
                <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                   <Upload className="w-5 h-5 text-indigo-500" />
                   Your Submission
                </h2>
                {isSubmitted && (
                   <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <div>
                         <p className="font-semibold text-green-900">You have already submitted this assignment!</p>
                         <p className="text-sm text-green-700 mt-1">Submitted on: {new Date(activeAssignment.submissions[0].submittedAt).toLocaleString()}</p>
                         <a href={activeAssignment.submissions[0].fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline mt-2 inline-block font-semibold">View my submission</a>
                         <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-green-200">Submit a new link below if you wish to override your previous work.</p>
                      </div>
                   </div>
                )}
                <form onSubmit={onSubmit} className="flex flex-col gap-3">
                   <div className="flex gap-3">
                     <input
                       type="url"
                       placeholder="Option 1: Paste link to your work (Google Drive, Dropbox, etc.)"
                       className="flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium"
                       value={fileUrl}
                       onChange={(e) => {
                          setFileUrl(e.target.value);
                          if (e.target.value) setFileObj(null); // prefer URL if typing URL
                       }}
                       disabled={!!fileObj}
                     />
                   </div>
                   <div className="flex items-center gap-3">
                      <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">OR</span>
                      <label className="flex-1 cursor-pointer">
                         <div className={`rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium transition-colors ${fileObj ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                            {fileObj ? fileObj.name : "Option 2: Click to upload a file from your device"}
                         </div>
                         <input type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip" onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                               setFileObj(e.target.files[0]);
                               setFileUrl(""); // prefer file if selecting file
                            }
                         }} />
                      </label>
                   </div>
                   <button disabled={submitting || (!fileUrl && !fileObj)} type="submit" className="mt-2 text-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition-colors disabled:opacity-50">
                      {submitting ? "Uploading..." : isSubmitted ? "Override Submission" : "Submit Assignment"}
                   </button>
                </form>
             </div>
          </div>
        </div>
      </StudentShell>
    );
  }

  return (
    <StudentShell title="My Assignments">
      <div className="mx-auto max-w-5xl space-y-6">
        <p className="text-sm text-[var(--lms-muted)]">
          Assignments assigned from all your enrolled courses.
        </p>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center text-slate-500 font-medium">Loading assignments...</div>
        ) : assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
             <FileText className="w-16 h-16 text-slate-300 mb-4 drop-shadow-sm" />
             <h3 className="text-lg font-bold text-slate-700 mb-1">No Assignments Yet!</h3>
             <p className="text-slate-500 text-sm">When your teachers assign homework, it will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {assignments.filter(a => !a.dueDate || new Date(a.dueDate) > new Date()).map(item => {
                const isSubmitted = item.submissions && item.submissions.length > 0;
                let statusColor = "bg-amber-100 text-amber-700 border-amber-200";
                let statusText = "Pending";
                if (isSubmitted) {
                   statusColor = "bg-green-100 text-green-700 border-green-200";
                   statusText = "Submitted";
                }
                
                return (
                  <div key={item.id} className="group flex flex-col bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-indigo-200 transition-all duration-300">
                     <div className="flex justify-between items-start mb-4">
                        <div className={`text-xs font-extrabold uppercase tracking-wide px-2 py-1 rounded-md border ${statusColor}`}>
                           {statusText}
                        </div>
                        {item.dueDate && (
                          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                             <Calendar className="w-3.5 h-3.5" /> {new Date(item.dueDate).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </div>
                        )}
                     </div>
                     <h3 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-indigo-700 transition-colors">{item.title}</h3>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{item.subject.course.name} — {item.subject.name}</p>
                     
                     <div className="mt-6 pt-6 border-t border-slate-100 mt-auto">
                        <button onClick={() => setActiveAssignment(item)} className="w-full text-center px-4 py-2.5 rounded-xl text-sm font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white transition-colors">
                           {isSubmitted ? "View Details" : "Start Assignment"}
                        </button>
                     </div>
                  </div>
                );
             })}
          </div>
        )}
      </div>
    </StudentShell>
  );
}
