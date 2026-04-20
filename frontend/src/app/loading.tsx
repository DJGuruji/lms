export default function Loading() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-180px)] max-w-3xl flex-col items-center justify-center px-6 py-16">
      <div className="w-full rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.1)]">
        <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        </div>
        <div className="mt-4 h-24 animate-pulse rounded-2xl bg-slate-100" />
      </div>
      <p className="mt-5 text-sm text-slate-500">Loading…</p>
    </div>
  );
}

