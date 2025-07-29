import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthCallbackPage() {
  const { setFromCallback } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;

    const params = new URLSearchParams(hash);
    const idToken = params.get("id_token");
    const accessToken = params.get("access_token");
    const expiresIn = params.get("expires_in") ?? "3600";

    if (idToken) {
      localStorage.setItem("id_token", idToken);
      if (accessToken) localStorage.setItem("access_token", accessToken);
      const exp = Date.now() + Number(expiresIn) * 1000;
      localStorage.setItem("token_expires_at", String(exp));

      setFromCallback?.(window.location.hash);
      navigate("/dashboard", { replace: true });
    } else {
      console.error("No id_token found in callback fragment");
      navigate("/", { replace: true });
    }
  }, [setFromCallback, navigate]);

  return <div className="p-6 text-sm text-gray-600">Signing you in…</div>;
}


