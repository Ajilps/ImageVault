"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { getSession, SessionProvider, signIn, signOut, useSession } from "next-auth/react";

import { ApiError } from "@/lib/api";
import type { CurrentUser } from "@/lib/types";

type AuthContextValue = {
  user: CurrentUser | null;
  token: string | null;
  isReady: boolean;
  login: (input: { email: string; password: string }) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus>
      <AuthState>{children}</AuthState>
    </SessionProvider>
  );
}

function AuthState({ children }: { children: React.ReactNode }) {
  const { data: session, status, update } = useSession();

  useEffect(() => {
    const expireSession = () => { void signOut({ redirect: false }); };
    window.addEventListener("imagevault:authentication-expired", expireSession);
    if (session?.authError === "BACKEND_TOKEN_EXPIRED") expireSession();
    return () => window.removeEventListener("imagevault:authentication-expired", expireSession);
  }, [session?.authError]);

  const login = useCallback(async (input: { email: string; password: string }) => {
    const result = await signIn("credentials", { ...input, redirect: false });

    if (!result?.ok) {
      throw new ApiError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
    }

    const nextSession = await getSession();

    if (!nextSession?.user) {
      throw new ApiError("Your session could not be created. Please try again.", 500, "SESSION_UNAVAILABLE");
    }

    return nextSession.user;
  }, []);

  const logout = useCallback(() => {
    return signOut({ redirect: false }).then(() => undefined);
  }, []);

  const refresh = useCallback(async () => {
    await update();
  }, [update]);

  const value = useMemo(
    () => ({
      user: session?.authError ? null : session?.user ?? null,
      token: session?.authError ? null : session?.backendAccessToken ?? null,
      isReady: status !== "loading",
      login,
      logout,
      refresh,
    }),
    [login, logout, refresh, session, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
