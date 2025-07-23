import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { exchangeCodeForTokens } from "../lib/auth";

export default function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const code = params.get("code");
    if (!code) return;
    exchangeCodeForTokens(code)
      .then(() => navigate("/", { replace: true }))
      .catch((err) => {
        console.error(err);
        navigate("/?auth=error", { replace: true });
      });
  }, [params, navigate]);

  return <p className="p-6 text-center">Signing you in…</p>;
}
