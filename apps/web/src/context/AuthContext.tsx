import { createContext, useContext, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { create } from "zustand";

/* ---------- Zustand slice (readable outside React) ---------- */
interface AuthState {
  idToken?: string;
  setIdToken: (t?: string) => void;
}
export const useAuth = create<AuthState>((set) => ({
  idToken: localStorage.getItem("id_token") ?? undefined,
  setIdToken: (t) => {
    if (t) localStorage.setItem("id_token", t);
    else localStorage.removeItem("id_token");
    set({ idToken: t });
  },
}));

/* ---------- React provider (for sign‑in / sign‑out helpers) ---------- */
interface Ctx {
  signIn: () => void;
  signOut: () => void;
  // called by AuthCallbackPage
  completeAuth: (hashFragment: string) => void;
}
const Ctx = createContext<Ctx | null>(null);
export const useAuthActions = () => useContext(Ctx)!;

// Separate component that uses useNavigate
function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const setIdToken = useAuth((s) => s.setIdToken);

  const signIn = useCallback(() => {
    const dom = import.meta.env.VITE_COGNITO_HOSTED_UI_DOMAIN;
    const client = import.meta.env.VITE_COGNITO_CLIENT_ID;
    const redirect = encodeURIComponent(import.meta.env.VITE_COGNITO_REDIRECT_URI);
    const url = `https://${dom}/oauth2/authorize?client_id=${client}&response_type=token&scope=openid%20email%20profile&redirect_uri=${redirect}`;
    window.location.assign(url);
  }, []);

  const signOut = useCallback(() => {
    setIdToken(undefined);
    const dom = import.meta.env.VITE_COGNITO_HOSTED_UI_DOMAIN;
    const logout = import.meta.env.VITE_COGNITO_LOGOUT_URI;
    window.location.assign(`https://${dom}/logout?logout_uri=${encodeURIComponent(logout)}`);
  }, [setIdToken]);

  const completeAuth = useCallback(
    (hash: string) => {
      const p = new URLSearchParams(hash.replace(/^#/, ""));
      const tok = p.get("id_token") ?? undefined;
      if (tok) {
        setIdToken(tok);
        navigate("/dashboard", { replace: true });
      } else {
        console.error("No id_token in callback");
        navigate("/", { replace: true });
      }
    },
    [setIdToken, navigate]
  );

  return (
    <Ctx.Provider value={{ signIn, signOut, completeAuth }}>
      {children}
    </Ctx.Provider>
  );
}

// Main export - doesn't use useNavigate directly
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthProviderInner>{children}</AuthProviderInner>;
}

