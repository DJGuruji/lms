"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, ClipboardList, RefreshCw, Users } from "lucide-react";
import { api } from "@/lib/api";
import { StatCard } from "@/components/admin/StatCard";
import {
  Bar,
  CartesianGrid,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  LineChart,
  Cell,
} from "recharts";

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.1)]">
      <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
      <div className="mt-4 h-9 w-24 animate-pulse rounded bg-slate-100" />
      <div className="mt-3 h-3 w-40 animate-pulse rounded bg-slate-100" />
    </div>
  );
}

type Range = "week" | "month" | "year";
type ChartType = "bar" | "line";
type MetricKey = "userGrowth" | "enrollments" | "examSubmissions" | "contentViews";

function fmtLabel(iso: string, range: Range) {
  const d = new Date(iso);
  if (range === "week") return d.toLocaleDateString(undefined, { weekday: "short" });
  if (range === "month") return `W${Math.ceil(d.getDate() / 7)}`;
  return d.toLocaleDateString(undefined, { month: "short" });
}

function ProgressChart({
  range,
  chartType,
  data,
}: {
  range: Range;
  chartType: ChartType;
  data: { label: string; value: number }[];
}) {
  const chartData = useMemo(
    () => data.map((p) => ({ name: fmtLabel(p.label, range), value: p.value })),
    [data, range],
  );
  return (
    <div className="h-60 w-full min-h-[240px]">
      <ResponsiveContainer width="100%" height="100%" minHeight={240} minWidth={0}>
        {chartType === "bar" ? (
          <BarChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={28} />
            <Tooltip />
            <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
          </BarChart>
        ) : (
          <LineChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={28} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function RoleSplitChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const colors = ["#2563eb", "#16a34a", "#f59e0b", "#7c3aed"];
  return (
    <div className="h-60 w-full min-h-[240px]">
      <ResponsiveContainer width="100%" height="100%" minHeight={240} minWidth={0}>
        <PieChart>
          <Tooltip />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={52}
            outerRadius={82}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState({
    courses: 0,
    users: 0,
    exams: 0,
  });
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("week");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [metric, setMetric] = useState<MetricKey>("userGrowth");
  const [roleSplit, setRoleSplit] = useState<
    { name: string; value: number }[]
  >([]);
  const [metrics, setMetrics] = useState<Record<MetricKey, { label: string; value: number }[]>>({
    userGrowth: [],
    enrollments: [],
    examSubmissions: [],
    contentViews: [],
  });

  const cacheKey = "adminDashboard:v1";

  async function refreshData(opts?: { showLoading?: boolean }) {
    const showLoading = opts?.showLoading ?? false;
    if (showLoading) setLoading(true);
    try {
      const [c, u, e, students, teachers, admins, m] = await Promise.all([
        api.get("/courses"),
        api.get("/users?page=1&limit=1"),
        api.get("/exams"),
        api.get("/users?page=1&limit=1&role=STUDENT"),
        api.get("/users?page=1&limit=1&role=TEACHER"),
        api.get("/users?page=1&limit=1&role=INSTITUTION_ADMIN"),
        api.get(`/dashboard/metrics?range=${range}`),
      ]);

      const next = {
        counts: {
          courses: Array.isArray(c.data) ? c.data.length : Number((c.data as any)?.total ?? 0),
          users: Number((u.data as any)?.total ?? 0),
          exams: Array.isArray(e.data) ? e.data.length : Number((e.data as any)?.total ?? 0),
        },
        roleSplit: [
          { name: "Students", value: Number((students.data as any)?.total ?? 0) },
          { name: "Teachers", value: Number((teachers.data as any)?.total ?? 0) },
          { name: "Admins", value: Number((admins.data as any)?.total ?? 0) },
        ],
        metrics: {
          userGrowth: (m.data as any)?.userGrowth ?? [],
          enrollments: (m.data as any)?.enrollments ?? [],
          examSubmissions: (m.data as any)?.examSubmissions ?? [],
          contentViews: (m.data as any)?.contentViews ?? [],
        } as Record<MetricKey, { label: string; value: number }[]>,
        at: Date.now(),
      };

      setCounts(next.counts);
      setRoleSplit(next.roleSplit);
      setMetrics(next.metrics);
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(cacheKey, JSON.stringify(next));
      }
    } catch {
      // If cached is present, keep UI stable; otherwise show zeros.
      if (roleSplit.length === 0 && counts.users === 0 && counts.courses === 0 && counts.exams === 0) {
        setCounts({ courses: 0, users: 0, exams: 0 });
        setRoleSplit([
          { name: "Students", value: 0 },
          { name: "Teachers", value: 0 },
          { name: "Admins", value: 0 },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // 1) Hydrate from cache instantly (no loading flash when navigating back)
    const cached =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem(cacheKey)
        : null;
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as {
          counts: typeof counts;
          roleSplit: { name: string; value: number }[];
          metrics?: Record<MetricKey, { label: string; value: number }[]>;
          at: number;
        };
        if (parsed?.counts) setCounts(parsed.counts);
        if (Array.isArray(parsed?.roleSplit)) setRoleSplit(parsed.roleSplit);
        if (parsed?.metrics) setMetrics(parsed.metrics);
        setLoading(false);
      } catch {
        // ignore cache parse errors
      }
    }
    // 2) Refresh in background without showing loading
    void refreshData({ showLoading: !cached });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // When range changes, pull fresh series (keep counts cached).
    void refreshData({ showLoading: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Welcome to your academy
            </h2>
            <p className="text-sm text-(--lms-muted)">
              Overview of activity — inspired by a calm, data-rich control center.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshData({ showLoading: true })}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
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
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="flex items-center gap-2">
                {(
                  [
                    { k: "userGrowth", label: "Users" },
                    { k: "enrollments", label: "Enrollments" },
                    { k: "examSubmissions", label: "Exam submissions" },
                    { k: "contentViews", label: "Content views" },
                  ] as const
                ).map((x) => (
                  <button
                    key={x.k}
                    type="button"
                    onClick={() => setMetric(x.k)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      metric === x.k
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {x.label}
                  </button>
                ))}
              </div>
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
              <div className="flex items-center gap-2">
                {(["bar", "line"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setChartType(t)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      chartType === t
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {loading ? (
            <div className="h-56 animate-pulse rounded-2xl bg-slate-50" />
          ) : (
            <ProgressChart range={range} chartType={chartType} data={metrics[metric] ?? []} />
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.1)]">
          <h3 className="font-semibold text-slate-900">Users by role</h3>
          {loading ? (
            <div className="mt-4 h-56 animate-pulse rounded-2xl bg-slate-50" />
          ) : (
            <>
              <RoleSplitChart data={roleSplit} />
              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs text-slate-600">
                {roleSplit.map((r) => (
                  <div key={r.name} className="rounded-xl bg-slate-50 px-2 py-2">
                    <div className="font-semibold text-slate-900">{r.value}</div>
                    <div className="text-slate-500">{r.name}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-linear-to-b from-white to-blue-50/40 p-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.1)] lg:col-span-2">
          <h3 className="font-semibold text-slate-900">Quick focus</h3>
          {loading ? (
            <div className="mt-4 space-y-3">
              <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : (
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
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
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.1)]">
          <h3 className="font-semibold text-slate-900">Totals</h3>
          {loading ? (
            <div className="mt-4 space-y-3">
              <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : (
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="font-semibold">Courses</span>
                <span className="text-slate-900">{counts.courses}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="font-semibold">Users</span>
                <span className="text-slate-900">{counts.users}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="font-semibold">Exams</span>
                <span className="text-slate-900">{counts.exams}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
