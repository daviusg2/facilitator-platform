import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { login, logout } from "../lib/auth";

export default function NavBar() {
  const { user, signIn, signOut } = useAuth();
 return (
    <nav className="w-full border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-semibold">Facilitator</Link>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-gray-600">{user.email}</span>
              <button
                onClick={signOut}
                className="text-sm px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={signIn}
              className="text-sm px-3 py-1 rounded bg-blue-600 text-white"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}