import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createBrowserRouter, Outlet } from "react-router-dom";

import "./index.css";
import App from "./App";
import Layout from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import SessionHostPage from "./pages/SessionHostPage";
import JoinPage from "./pages/JoinPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import { AuthProvider } from "./context/AuthContext";

// Root component that provides auth context to all routes
function RootLayout() {
  return (
    <AuthProvider>
      <Outlet />
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
      { path: "join/:code", element: <JoinPage /> },
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
