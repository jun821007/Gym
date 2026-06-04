"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { translateAuthError } from "@/lib/supabase/auth-errors";
import {
  getRememberPreference,
  getSupabase,
  isSupabaseConfigured,
  setAuthPersistence,
} from "@/lib/supabase/client";
import { fetchProfile } from "@/lib/supabase/repository";
import { DEFAULT_BODY_GOALS } from "@/lib/body-goals";
import type { BodyGoals, UserProfile } from "@/lib/types";

export function AppGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goals, setGoals] = useState<BodyGoals>(DEFAULT_BODY_GOALS);

  const loadUser = useCallback(async (userId: string) => {
    const supabase = getSupabase();
    const result = await fetchProfile(supabase, userId);
    if (result) {
      setProfile(result.profile);
      setGoals(result.goals);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setBooting(false);
      return;
    }

    setAuthPersistence(getRememberPreference());
    const supabase = getSupabase();

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        setProfileLoading(true);
        try {
          await loadUser(data.session.user.id);
        } catch (e) {
          setAuthError(
            translateAuthError(
              e instanceof Error ? e.message : "載入角色檔案失敗",
            ),
          );
        } finally {
          setProfileLoading(false);
          setBooting(false);
        }
      } else {
        setBooting(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next?.user) loadUser(next.user.id);
      else {
        setProfile(null);
        setGoals(DEFAULT_BODY_GOALS);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUser]);

  async function signIn(email: string, password: string, remember: boolean) {
    setAuthError("");
    setAuthPersistence(remember);
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(translateAuthError(error.message));
    if (data.user) await loadUser(data.user.id);
  }

  async function signUp(email: string, password: string, remember: boolean) {
    setAuthError("");
    setAuthPersistence(remember);
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(translateAuthError(error.message));
    if (data.session?.user) {
      await loadUser(data.session.user.id);
    } else {
      throw new Error("註冊成功，請到 Email 點確認連結後再登入");
    }
  }

  async function resetPassword(email: string) {
    setAuthError("");
    const supabase = getSupabase();
    const redirectTo =
      typeof window !== "undefined" ? window.location.origin : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) throw new Error(translateAuthError(error.message));
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center p-6 text-center text-sm text-text-muted">
        請在 .env.local 設定 NEXT_PUBLIC_SUPABASE_URL 與
        NEXT_PUBLIC_SUPABASE_ANON_KEY
      </div>
    );
  }

  if (booting) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-text-muted">
        載入中…
      </div>
    );
  }

  if (session && !profile && (booting || profileLoading)) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-text-muted">
        載入冒險者檔案…
      </div>
    );
  }

  if (!session || !profile) {
    return (
      <AuthScreen
        initialError={authError}
        defaultRemember={getRememberPreference()}
        onSignIn={signIn}
        onSignUp={signUp}
        onResetPassword={resetPassword}
      />
    );
  }

  return (
    <Dashboard
      session={session}
      initialProfile={profile}
      initialGoals={goals}
      onProfilePersist={setProfile}
      onGoalsPersist={setGoals}
    />
  );
}
