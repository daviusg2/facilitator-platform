import { createContext, useContext, useEffect, useState } from "react";
import { getTokens, decodeJwt } from "../lib/auth";

type AuthUser = {
  sub: string;
  email?: string;
  orgId?: string;
  role?: string;
  idToken?: string;
};

const AuthContext = createContext<AuthUser | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const tokens = getTokens();
    if (!tokens?.id_token) return;
    const payload = decodeJwt(tokens.id_token);
    setUser({
      sub: payload.sub,
      email: payload.email,
      orgId: payload["custom:orgId"],
      role: payload["custom:role"],
      idToken: tokens.id_token,
    });
  }, []);

  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
