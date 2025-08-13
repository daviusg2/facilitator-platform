// apps/web/src/main.tsx (Updated)
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createBrowserRouter, Outlet } from "react-router-dom";

import "./index.css";
import App from "./App";
import Layout from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import SessionHostPage from "./pages/SessionHostPage";
import ParticipantResponsePage from "./pages/ParticipantResponsePage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import { AuthProvider } from "./context/AuthContext";
import ToastContainer from "./components/Toast";

// Root component that provides auth context to all routes
function RootLayout() {
  return (
    <AuthProvider>
      <Outlet />
      <ToastContainer />
    </AuthProvider>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />, // Auth provider goes here
    children: [
      { index: true, element: <App /> }, // Landing page with sign-in
      { path: "dashboard", element: <DashboardPage /> }, // Dashboard page
      {
        element: <Layout />,
        children: [
          { path: "session/:id", element: <SessionHostPage /> },
        ],
      },
      // Participant pages (no auth required, no layout)
      { path: "join/:code", element: <ParticipantResponsePage /> },
      { path: "participant/:code", element: <ParticipantResponsePage /> }, // Alternative route
      
      // Auth callback
      { path: "auth/callback", element: <AuthCallbackPage /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />
);

// Development debugging - moved to conditional
if (import.meta.env.DEV) {
  console.log("VITE env →", import.meta.env);
  (window as any).__VITE_ENV__ = import.meta.env;
}