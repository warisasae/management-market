// src/components/route-guards.jsx
import { Navigate, useLocation } from "react-router-dom";
import { isLoggedIn, isAdmin } from "../lib/auth";

export function ProtectedRoute({ children }) {
  const loc = useLocation();
  if (!isLoggedIn()) return <Navigate to="/" replace state={{ from: loc }} />;
  return children;
}

export function AdminOnly({ children }) {
  const loc = useLocation();
  if (!isLoggedIn()) return <Navigate to="/" replace state={{ from: loc }} />;
  if (!isAdmin())   return <Navigate to="/dashboard" replace state={{ from: loc }} />;
  return children;
}
