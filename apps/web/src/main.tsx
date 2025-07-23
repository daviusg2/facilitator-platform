import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

import "./index.css";
import Layout from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import SessionHostPage from "./pages/SessionHostPage";
import JoinPage from "./pages/JoinPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import { AuthProvider } from "./context/AuthContext";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "session/:id", element: <SessionHostPage /> },
    ],
  },
  { path: "/join/:code", element: <JoinPage /> },
  { path: "/auth/callback", element: <AuthCallbackPage /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>
);


