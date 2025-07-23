import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { login, logout } from "../lib/auth";

export default function NavBar() {
  const user = useAuth();
  return (
    <header className="bg-white border-b shadow-sm">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          Facilitator <span className="text-blue-600">Tools</span>
        </Link>
        <nav className="flex gap-4 text-sm items-center">
          <Link to="/" className="hover:text-blue-600">
            Dashboard
          </Link>
          {user ? (
            <>
              <span className="text-gray-500">{user.email}</span>
              <button onClick={logout} className="underline">
                Sign out
              </button>
            </>
          ) : (
            <button onClick={login} className="underline">
              Sign in
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
