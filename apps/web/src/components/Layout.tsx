// apps/web/src/components/Layout.tsx
import { Outlet } from "react-router-dom";
import NavBar from "/Users/davidgoddard/Desktop/Facilitator-platform/apps/web/src/components/NavBar";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-gray-800">
      <NavBar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <Outlet />              {/* routed pages render here */}
      </main>
    </div>
  );
}
