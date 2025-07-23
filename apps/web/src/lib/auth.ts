const region     = import.meta.env.VITE_COGNITO_REGION as string;
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID as string;
const clientId   = import.meta.env.VITE_COGNITO_CLIENT_ID as string;
const redirect   = import.meta.env.VITE_COGNITO_REDIRECT_URI as string;
const logoutUri  = import.meta.env.VITE_COGNITO_LOGOUT_URI as string;
const domain     = import.meta.env.VITE_COGNITO_HOSTED_UI_DOMAIN as string;

const TOKEN_KEY = "cognitoTokens";

/** Begin hosted-UI login */
export function login() {
  const url = new URL(`https://${domain}/oauth2/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("redirect_uri", redirect);
  // PKCE auto-handled by Cognito SPA clients; no code_verifier needed here
  window.location.href = url.toString();
}

/** Exchange auth code for tokens */
export async function exchangeCodeForTokens(code: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    code,
    redirect_uri: redirect,
  });

  const res = await fetch(`https://${domain}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error("Token exchange failed");
  const tokens = await res.json(); // { id_token, access_token, refresh_token, expires_in, token_type }
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  return tokens;
}

export function getTokens() {
  const raw = localStorage.getItem(TOKEN_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function decodeJwt(token: string) {
  const [, payload] = token.split(".");
  const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(b64));
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  const url = new URL(`https://${domain}/logout`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("logout_uri", logoutUri);
  window.location.href = url.toString();
}
