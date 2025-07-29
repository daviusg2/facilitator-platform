import { createContext, useContext, useMemo, useState } from "react";

type AuthContextValue = {
  idToken: string | null;
  setFromCallback?: (hash: string) => void;
  signOut: () => void;                         // ← add
  orgId?: string | null;
  name?: string | null;
  email?: string | null;
};

const AuthContext = createContext<AuthContextValue>({
  idToken: null,
  signOut: () => {},                           // ← default noop
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [idToken, setIdToken] = useState<string | null>(
    localStorage.getItem("id_token")
  );

  const signOut = () => {
    localStorage.removeItem("id_token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("token_expires_at");
    // hard redirect to wipe in-memory state
    window.location.href = "/";
  };

  const setFromCallback = (hash: string) => {
    // optional: keep a copy for debugging
    try {
      const clean = hash.startsWith("#") ? hash.slice(1) : hash;
      const params = new URLSearchParams(clean);
      const token = params.get("id_token");
      const access = params.get("access_token");
      const expiresIn = params.get("expires_in");

      if (token) {
        localStorage.setItem("id_token", token);
        if (access) localStorage.setItem("access_token", access);
        if (expiresIn) {
          const exp = Date.now() + Number(expiresIn) * 1000;
          localStorage.setItem("token_expires_at", String(exp));
        }
        setIdToken(token);
      }
    } catch (e) {
      console.error("setFromCallback error", e);
    }
  };

  const value = useMemo(
    () => ({
      idToken,
      setFromCallback,
      signOut,                     // ← expose
    }),
    [idToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

