export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-180px)] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm">
        404
      </div>
      <h1 className="mt-5 text-2xl font-semibold text-slate-900">
        Page not found
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        The page you’re looking for doesn’t exist, or you don’t have access.
      </p>
      <a
        href="/"
        className="mt-6 inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
      >
        Go to home
      </a>
    </div>
  );
}

