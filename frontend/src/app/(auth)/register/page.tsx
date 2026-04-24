"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import Script from "next/script";
import { GraduationCap, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore, type AuthUser } from "@/lib/auth-store";
import { canAccessAdmin } from "@/lib/roles";

type RegisterForm = {
  instituteName: string;
  subdomain: string;
  adminName: string;
  email: string;
  password: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>();

  async function onSubmit(data: RegisterForm) {
    setError(null);
    setLoading(true);
    try {
      let recaptchaToken = "";
      if (typeof window !== "undefined" && (window as any).grecaptcha) {
        recaptchaToken = await new Promise<string>((resolve) => {
          (window as any).grecaptcha.ready(() => {
            (window as any).grecaptcha
              .execute(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "", { action: "register" })
              .then((token: string) => resolve(token));
          });
        });
      }

      const res = await api.post<{
        access_token: string;
        user: AuthUser;
      }>("/auth/register", { ...data, recaptchaToken });
      const { access_token, user } = res.data;
      setAuth(access_token, user);
      router.push(
        canAccessAdmin(user.role) ? "/admin/dashboard" : "/student",
      );
    } catch (e: unknown) {
      const msg =
        typeof e === "object" &&
        e !== null &&
        "response" in e &&
        typeof (e as { response?: { data?: { message?: unknown } } }).response
          ?.data?.message === "string"
          ? String(
              (e as { response: { data: { message: string } } }).response.data
                .message,
            )
          : "Registration failed.";
      setError(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Script
        src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}`}
        strategy="afterInteractive"
      />
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/80 to-indigo-100/60 px-4 py-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(37,99,235,0.12),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.1),transparent_45%)]" />
      <div className="relative w-full max-w-lg">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Create institute
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Register your organization and admin account
          </p>
        </div>

        <div className="rounded-3xl border border-white/80 bg-white/95 p-8 shadow-xl shadow-slate-900/5 backdrop-blur-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                role="alert"
              >
                {error}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Institute name
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none ring-blue-500/20 focus:border-blue-400 focus:ring-4"
                  {...register("instituteName", { required: true })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Subdomain
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none ring-blue-500/20 focus:border-blue-400 focus:ring-4"
                  placeholder="my-school"
                  {...register("subdomain", { required: true })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Your name
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none ring-blue-500/20 focus:border-blue-400 focus:ring-4"
                  {...register("adminName", { required: true })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none ring-blue-500/20 focus:border-blue-400 focus:ring-4"
                  {...register("email", { required: true })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 outline-none ring-blue-500/20 focus:border-blue-400 focus:ring-4"
                    {...register("password", {
                      required: true,
                      minLength: { value: 8, message: "Min 8 characters" },
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.password.message}
                  </p>
                )}
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Creating…" : "Create institute"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">
            Already have access?{" "}
            <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
              Sign in
            </Link>
          </p>
        </div>
        </div>
      </div>
    </>
  );
}
