"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, ClipboardList, TrendingUp, Users } from "lucide-react";
import { api } from "@/lib/api";
import { StatCard } from "@/components/admin/StatCard";

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.1)]">
      <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
      <div className="mt-4 h-9 w-24 animate-pulse rounded bg-slate-100" />
      <div className="mt-3 h-3 w-40 animate-pulse rounded bg-slate-100" />
    </div>
  );
}

function ProgressChart({
  range,
}: {
  range: "week" | "month" | "year";
}) {
  const data = useMemo(() => {
    if (range === "week") return { label: ["M", "T", "W", "T", "F", "S", "S"], values: [40, 65, 45, 80, 55, 90, 70] };
    if (range === "month") return { label: ["W1", "W2", "W3", "W4"], values: [55, 72, 68, 84] };
    return { label: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"], values: [45, 50, 58, 62, 67, 72, 70, 76, 81, 79, 86, 90] };
  }, [range]);

  return (
    <>
      <div className="flex h-48 items-end justify-between gap-2 px-2">
        {data.values.map((h, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <div
              className="w-full max-w-[40px] rounded-t-lg bg-linear-to-t from-blue-600 to-blue-400 opacity-90 shadow-sm transition hover:opacity-100"
              style={{ height: `${h}%` }}
            />
            <span className="text-[10px] font-medium uppercase text-slate-400">
              {data.label[i]}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
        <TrendingUp className="h-4 w-4 text-emerald-500" />
        Progress trending up — keep publishing new modules.
      </div>
    </>
  );
}

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState({
    courses: 0,
    users: 0,
    exams: 0,
  });
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"week" | "month" | "year">("week");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [c, u, e] = await Promise.all([
          api.get("/courses"),
          api.get("/users?page=1&limit=1"),
          api.get("/exams"),
        ]);
        if (!cancelled) {
          setCounts({
            courses: Array.isArray(c.data) ? c.data.length : 0,
            users: Number((u.data as any)?.total ?? 0),
            exams: Array.isArray(e.data) ? e.data.length : 0,
          });
        }
      } catch {
        if (!cancelled) setCounts({ courses: 0, users: 0, exams: 0 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Welcome to your academy
        </h2>
        <p className="text-sm text-(--lms-muted)">
          Overview of activity — inspired by a calm, data-rich control center.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              label="Total courses"
              value={counts.courses}
              icon={BookOpen}
              accent="blue"
            />
            <StatCard
              label="Users"
              value={counts.users}
              icon={Users}
              accent="indigo"
              hint="+ enrolled learners & staff"
            />
            <StatCard
              label="Exams"
              value={counts.exams}
              icon={ClipboardList}
              accent="emerald"
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.1)] lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Class pulse</h3>
            <div className="flex items-center gap-2">
              {(["week", "month", "year"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    range === r
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="h-56 animate-pulse rounded-2xl bg-slate-50" />
          ) : (
            <ProgressChart range={range} />
          )}
        </div>

        {loading ? (
          <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.1)]">
            <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
            <div className="space-y-3">
              <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
            </div>
          </div>
        ) : (
          <div className="space-y-4 rounded-2xl border border-slate-100 bg-linear-to-b from-white to-blue-50/40 p-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.1)]">
            <h3 className="font-semibold text-slate-900">Quick focus</h3>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex gap-2 rounded-xl bg-white/80 px-3 py-2 shadow-sm">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange-400" />
                Review unpublished courses
              </li>
              <li className="flex gap-2 rounded-xl bg-white/80 px-3 py-2 shadow-sm">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                Upload lesson assets to Content
              </li>
              <li className="flex gap-2 rounded-xl bg-white/80 px-3 py-2 shadow-sm">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-400" />
                Schedule exams for active cohorts
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
