import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getDecryptedToken } from "../features/auth/authSlice";

export default function ProtectedRoute() {
  const token = getDecryptedToken();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
