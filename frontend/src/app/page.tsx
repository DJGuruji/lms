"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, GraduationCap, LogIn, Sparkles } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { canAccessAdmin } from "@/lib/roles";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const goIfLoggedIn = () => {
      const { token, user } = useAuthStore.getState();
      if (token && user) {
        router.replace(
          canAccessAdmin(user.role) ? "/admin/dashboard" : "/student",
        );
      }
    };

    const persist = useAuthStore.persist;
    if (persist?.onFinishHydration) {
      return persist.onFinishHydration(goIfLoggedIn);
    }
    goIfLoggedIn();
    return undefined;
  }, [router]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/90 to-indigo-100/70">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(37,99,235,0.14),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.12),transparent_50%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-16 pt-10 md:px-8 md:pb-24 md:pt-16 lg:px-12">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-slate-900">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
              <GraduationCap className="h-6 w-6" aria-hidden />
            </span>
            <span className="text-lg font-bold tracking-tight">LMS</span>
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur hover:bg-white"
            >
              <LogIn className="h-4 w-4" />
              Log in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-slate-800"
            >
              Start now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <main className="mt-14 flex flex-1 flex-col justify-center md:mt-20">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 shadow-sm ring-1 ring-blue-100">
            <Sparkles className="h-3.5 w-3.5" />
            Learning management
          </p>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 md:text-5xl lg:text-6xl">
            Run courses, content, and exams — in one calm workspace.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600 md:text-xl">
            Institutes use the admin console for curriculum and users; learners
            sign in to study, watch lessons, and take assessments. Pick up where
            you left off anytime.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700"
            >
              Start now — create your institute
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-8 py-3.5 text-base font-semibold text-slate-800 shadow-sm backdrop-blur hover:bg-white"
            >
              I already have an account
            </Link>
          </div>
        </main>

        <footer className="mt-16 border-t border-slate-200/80 pt-8 text-center text-sm text-slate-500 md:mt-24">
          Secure sign-in · role-based admin and student areas
        </footer>
      </div>
    </div>
  );
}
