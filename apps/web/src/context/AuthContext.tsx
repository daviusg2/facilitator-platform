import { createContext, useContext, useCallback } from "react";
import { create } from "zustand";
import { useNavigate } from 'react-router-dom';

/* ---------- Zustand slice (readable outside React) ---------- */
interface AuthState {
  idToken?: string;
  accessToken?: string;
  setIdToken: (t?: string) => void;
  setAccessToken: (t?: string) => void;
  setTokens: (idToken?: string, accessToken?: string) => void;
}

export const useAuth = create<AuthState>((set) => ({
  idToken: localStorage.getItem("id_token") ?? undefined,
  accessToken: localStorage.getItem("access_token") ?? undefined,
  
  setIdToken: (t) => {
    if (t) localStorage.setItem("id_token", t);
    else localStorage.removeItem("id_token");
    set({ idToken: t });
  },
  
  setAccessToken: (t) => {
    if (t) localStorage.setItem("access_token", t);
    else localStorage.removeItem("access_token");
    set({ accessToken: t });
  },
  
  setTokens: (idToken, accessToken) => {
    // Handle id_token
    if (idToken) localStorage.setItem("id_token", idToken);
    else localStorage.removeItem("id_token");
    
    // Handle access_token
    if (accessToken) localStorage.setItem("access_token", accessToken);
    else localStorage.removeItem("access_token");
    
    set({ idToken, accessToken });
  },
}));

/* ---------- Navigation helper (use this in components that need navigation) ---------- */
export const useAuthNavigation = () => {
  const setTokens = useAuth((s) => s.setTokens);
  
  const completeAuth = useCallback(
    (hash: string, navigate: (path: string, options?: any) => void) => {
      const p = new URLSearchParams(hash.replace(/^#/, ""));
      const idToken = p.get("id_token") ?? undefined;
      const accessToken = p.get("access_token") ?? undefined;
      
      console.log("🔍 Available tokens in URL:", {
        access_token: accessToken ? "present" : "missing",
        id_token: idToken ? "present" : "missing",
      });
      
      if (idToken || accessToken) {
        setTokens(idToken, accessToken);
        navigate("/dashboard", { replace: true });
      } else {
        console.error("No id_token or access_token in callback");
        navigate("/", { replace: true });
      }
    },
    [setTokens]
  );

  return { completeAuth };
};

/* ---------- React provider (for sign‑in / sign‑out helpers) ---------- */
interface Ctx {
  signIn: () => void;
  signOut: () => void;
  // called by AuthCallbackPage
  completeAuth: (hashFragment: string) => void;
}
const Ctx = createContext<Ctx | null>(null);
export const useAuthActions = () => useContext(Ctx)!;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const setTokens = useAuth((s) => s.setTokens);

  const signIn = useCallback(() => {
    const dom = import.meta.env.VITE_COGNITO_HOSTED_UI_DOMAIN;
    const client = import.meta.env.VITE_COGNITO_CLIENT_ID;
    const redirect = encodeURIComponent(import.meta.env.VITE_COGNITO_REDIRECT_URI);
    const url = `https://${dom}/oauth2/authorize?client_id=${client}&response_type=token&scope=openid%20email%20profile&redirect_uri=${redirect}`;
    window.location.assign(url);
  }, []);

  const signOut = useCallback(() => {
    setTokens(undefined, undefined);
    const dom = import.meta.env.VITE_COGNITO_HOSTED_UI_DOMAIN;
    const client = import.meta.env.VITE_COGNITO_CLIENT_ID;
    const logout = import.meta.env.VITE_COGNITO_LOGOUT_URI;
    
    // Cognito logout requires both client_id and logout_uri parameters
    const logoutUrl = `https://${dom}/logout?client_id=${client}&logout_uri=${encodeURIComponent(logout)}`;
    
    window.location.assign(logoutUrl);
  }, [setTokens]);

  const completeAuth = useCallback(
    (hash: string) => {
      const p = new URLSearchParams(hash.replace(/^#/, ""));
      const idToken = p.get("id_token") ?? undefined;
      const accessToken = p.get("access_token") ?? undefined;
      
      console.log("🔍 Available tokens in URL:", {
        access_token: accessToken ? "present" : "missing",
        id_token: idToken ? "present" : "missing",
      });
      
      if (idToken || accessToken) {
        setTokens(idToken, accessToken);
        navigate("/dashboard", { replace: true });
      } else {
        console.error("No access_token or id_token in callback");
        navigate("/", { replace: true });
      }
    },
    [setTokens, navigate]
  );

  return (
    <Ctx.Provider value={{ signIn, signOut, completeAuth }}>
      {children}
    </Ctx.Provider>
  );
}
