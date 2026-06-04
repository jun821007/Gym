"use client";

import { useState } from "react";
import { setAuthPersistence } from "@/lib/supabase/client";

interface AuthScreenProps {
  initialError?: string;
  defaultRemember?: boolean;
  onSignIn: (email: string, password: string, remember: boolean) => Promise<void>;
  onSignUp: (email: string, password: string, remember: boolean) => Promise<void>;
  onResetPassword: (email: string) => Promise<void>;
}

export function AuthScreen({
  initialError = "",
  defaultRemember = true,
  onSignIn,
  onSignUp,
  onResetPassword,
}: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(defaultRemember);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [info, setInfo] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    setAuthPersistence(remember);
    try {
      if (mode === "login") {
        await onSignIn(email.trim(), password, remember);
      } else {
        if (password.length < 6) {
          throw new Error("密碼至少 6 碼");
        }
        await onSignUp(email.trim(), password, remember);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "登入失敗");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    const trimmed = email.trim();
    if (!trimmed) {
      setError("請先輸入 Email，再按忘記密碼");
      return;
    }
    setError("");
    setInfo("");
    setLoading(true);
    try {
      await onResetPassword(trimmed);
      setInfo("已寄出重設密碼信，請到信箱點連結後用新密碼登入。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "寄信失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-bg-app px-6">
      <div className="w-full max-w-sm pixel-card pixel-card--hero !p-5">
        <h1 className="text-center text-xl font-bold text-accent-light">
          身體管理
        </h1>
        <p className="mt-1 text-center text-sm text-text-muted">
          {mode === "login" ? "登入你的冒險者檔案" : "建立新帳號"}
        </p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="block">
            <span className="text-sm text-text-muted">Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 min-h-[48px] w-full rounded-xl border border-border bg-bg-app px-3 outline-none focus:border-accent"
            />
          </label>
          <label className="block">
            <span className="text-sm text-text-muted">密碼</span>
            <input
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 min-h-[48px] w-full rounded-xl border border-border bg-bg-app px-3 outline-none focus:border-accent"
            />
          </label>

          <label className="flex items-start gap-2 text-sm text-text-muted">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
            />
            <span>
              保持登入（建議勾選：關閉瀏覽器後仍維持登入；取消則僅本次分頁有效）
            </span>
          </label>

          {error && (
            <p className="whitespace-pre-line text-center text-sm text-danger">
              {error}
            </p>
          )}
          {info && (
            <p className="text-center text-sm text-accent-light">{info}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="min-h-[48px] w-full rounded-xl bg-accent font-bold text-bg-app disabled:opacity-50"
          >
            {loading
              ? "處理中…"
              : mode === "login"
                ? "登入"
                : "註冊"}
          </button>
        </form>

        {mode === "login" && (
          <button
            type="button"
            className="mt-3 w-full text-center text-sm text-text-muted underline"
            onClick={handleForgotPassword}
            disabled={loading}
          >
            忘記密碼？
          </button>
        )}

        <button
          type="button"
          className="mt-4 w-full text-center text-sm text-accent-light underline"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
            setInfo("");
          }}
        >
          {mode === "login" ? "還沒帳號？註冊" : "已有帳號？登入"}
        </button>
      </div>
    </div>
  );
}
