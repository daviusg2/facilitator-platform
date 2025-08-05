import { useAuth, useAuthActions } from "./context/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function App() {
  const { idToken } = useAuth();
  const { signIn } = useAuthActions();
  const navigate = useNavigate();

  // If user is already authenticated, redirect to dashboard
  useEffect(() => {
    if (idToken) {
      navigate("/dashboard", { replace: true });
    }
  }, [idToken, navigate]);

  // Show loading if we're checking auth state
  if (idToken) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Facilitator
          </h1>
          <p className="text-gray-600 mb-8">
            Sign in to manage your sessions and engage with participants.
          </p>
          
          <button
            onClick={signIn}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Sign In with AWS Cognito
          </button>
        </div>
        
        <div className="text-center text-sm text-gray-500">
          <p>New to the platform? Your administrator will provide access.</p>
        </div>
      </div>
    </div>
  );
}


