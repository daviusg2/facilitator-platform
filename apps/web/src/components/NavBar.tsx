import { Link, useNavigate } from "react-router-dom";
import { useAuthActions } from "../context/AuthContext"; // Changed this import

export default function NavBar() {
  const { signOut } = useAuthActions(); // Changed from useAuth() to useAuthActions()
  const navigate = useNavigate();

  const onSignOut = () => {
    signOut();
    // If you prefer client-side redirect instead of hard reload in signOut:
    // navigate("/", { replace: true });
  };

  return (
    <nav className="w-full bg-white border-b">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <Link to="/dashboard" className="font-semibold">
          Facilitator
        </Link>

        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-sm text-gray-700 hover:text-gray-900">
            Dashboard
          </Link>
          <button
            onClick={onSignOut}
            className="text-sm px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
