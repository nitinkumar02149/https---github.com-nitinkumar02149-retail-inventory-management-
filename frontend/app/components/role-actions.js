"use client";

import Link from "next/link";
import { useAuth } from "./auth-provider";

export function ProductHeadingAction({ label = "Add product", href = "/products/new" }) {
  const { user } = useAuth();
  if (user.role !== "Admin") return null;
  return <Link className="button button-primary" href={href}>＋ {label}</Link>;
}