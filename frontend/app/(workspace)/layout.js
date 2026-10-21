"use client";

import { AuthProvider } from "../components/auth-provider";
import DashboardShell from "../components/dashboard-shell";

export default function WorkspaceLayout({ children }) {
  return <AuthProvider><DashboardShell>{children}</DashboardShell></AuthProvider>;
}