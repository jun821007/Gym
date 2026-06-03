"use client";

import { useState } from "react";
import { setAuthPersistence } from "@/lib/supabase/client";

interface AuthScreenProps {
  onSignIn: (email: string, password: string, remember: boolean) => Promise<void>;
  onSignUp: (email: string, password: string, remember: boolean) => Promise<void>;
}

export function AuthScreen({ onSignIn, onSignUp }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
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

          <label className="flex items-center gap-2 text-sm text-text-muted">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            保持登入（關閉則關閉瀏覽器後需重登）
          </label>

          {error && (
            <p className="text-center text-sm text-danger">{error}</p>
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

        <button
          type="button"
          className="mt-4 w-full text-center text-sm text-accent-light underline"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
        >
          {mode === "login" ? "還沒帳號？註冊" : "已有帳號？登入"}
        </button>
      </div>
    </div>
  );
}
