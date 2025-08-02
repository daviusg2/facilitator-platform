import { useEffect } from "react";
import { useAuthActions } from "../context/AuthContext";

export default function AuthCallbackPage() {
  const { completeAuth } = useAuthActions();

  useEffect(() => {
    completeAuth(window.location.hash);
  }, [completeAuth]);

  return (
    <div className="p-6 text-gray-600 text-sm">
      Signing you in…
    </div>
  );
}

  



