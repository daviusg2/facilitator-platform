import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type AuthUser = {
  sub: string;
  email?: string;
  name?: string;
  orgId?: string;
  role?: string;
};

type AuthContextShape = {
  idToken: string | null;
  user: AuthUser | null;
  email?: string;
  orgId?: string;
  signIn: () => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextShape>({
  idToken: null,
  user: null,
  signIn: () => {},
  signOut: () => {},
});

function parseJwt<T = any>(token: string): T {
  const [, payload] = token.split(".");
  const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(decodeURIComponent(escape(json)));
}

function readHashToken(): string | null {
  // e.g. #id_token=...&access_token=...&token_type=Bearer&expires_in=3600
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.substring(1)
    : window.location.hash;
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  return params.get("id_token");
}



const COGNITO_DOMAIN = import.meta.env.VITE_COGNITO_DOMAIN as string;
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID as string;
const REDIRECT_URI = import.meta.env.VITE_COGNITO_REDIRECT_URI as string;
const LOGOUT_URI = import.meta.env.VITE_COGNITO_LOGOUT_URI as string;

function buildAuthorizeUrl() {
  if (!COGNITO_DOMAIN || !CLIENT_ID || !REDIRECT_URI) {
    console.error("Cognito env vars missing", { COGNITO_DOMAIN, CLIENT_ID, REDIRECT_URI });
    alert("Auth config missing. Check apps/web/.env");
    return "/";
  }
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "token",               // implicit for MVP
    scope: "openid email profile aws.cognito.signin.user.admin",
    redirect_uri: REDIRECT_URI,
  });
  return `${COGNITO_DOMAIN}/oauth2/authorize?${params.toString()}`;
}

function buildLogoutUrl() {
  if (!COGNITO_DOMAIN || !CLIENT_ID || !LOGOUT_URI) return "/";
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    logout_uri: LOGOUT_URI,
  });
  return `${COGNITO_DOMAIN}/logout?${params.toString()}`;
}


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [idToken, setIdToken] = useState<string | null>(() => localStorage.getItem("id_token"));
  const [user, setUser] = useState<AuthUser | null>(null);

  // On first load or callback, capture id_token from hash and persist
  useEffect(() => {
    const hashToken = readHashToken();
    if (hashToken) {
      setIdToken(hashToken);
      localStorage.setItem("id_token", hashToken); // <-- only use idToken variable that exists
      // Clean up the URL: keep path but remove the hash
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }
  }, []);

  // Whenever idToken changes, decode user
  useEffect(() => {
    if (!idToken) {
      setUser(null);
      return;
    }
    try {
      const payload = parseJwt<any>(idToken);
      const u: AuthUser = {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        orgId: payload["custom:orgId"],
        role: payload["custom:role"],
      };
      setUser(u);
    } catch (e) {
      console.error("Failed to decode idToken", e);
      setUser(null);
    }
  }, [idToken]);

  const signIn = () => {
  window.location.href = buildAuthorizeUrl();
};

  const signOut = () => {
  // clear local tokens then go to Hosted UI logout
  localStorage.removeItem("id_token");
  localStorage.removeItem("access_token");
  localStorage.removeItem("expires_at");
  window.location.href = buildLogoutUrl();
};

  const value = useMemo<AuthContextShape>(
    () => ({
      idToken,
      user,
      email: user?.email,
      orgId: user?.orgId,
      signIn,
      signOut,
    }),
    [idToken, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  return useContext(AuthContext);
}


