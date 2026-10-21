"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./auth-provider";

const navigation = [
  ["Dashboard", "/dashboard", "▦"], ["Products", "/products", "□"],
  ["Inventory", "/inventory", "⇄"], ["Low stock", "/low-stock", "!"],
  ["Sales", "/sales", "$"], ["Invoices", "/invoices", "▤"], ["Reports", "/reports", "▥"],
];

const pageNames = { "/dashboard": "Dashboard", "/products": "Products", "/products/new": "Add product", "/inventory": "Inventory", "/low-stock": "Low stock", "/sales": "Sales", "/invoices": "Invoices", "/reports": "Reports", "/users": "Users" };

export default function DashboardShell({ children }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const pageName = pathname.includes("/edit") ? "Edit product" : pageNames[pathname] || "Products";

  return <div className="app-shell">
    {menuOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    <aside className={`sidebar${menuOpen ? " sidebar-open" : ""}`}>
      <Link className="brand" href="/dashboard" onClick={() => setMenuOpen(false)}><span className="brand-mark">R</span><span>retail<span className="brand-light">desk</span></span></Link>
      <div className="store-switcher"><span className="store-avatar">N</span><span className="store-copy"><strong>Northline Goods</strong><small>Retail workspace</small></span><span className="store-chevron">⌄</span></div>
      <p className="nav-caption">WORKSPACE</p>
      <nav className="side-nav" aria-label="Main navigation">{navigation.map(([label, href, icon]) => {
        const active = pathname === href || (href === "/products" && pathname.startsWith("/products"));
        return <Link className={`nav-link${active ? " active" : ""}`} href={href} key={href} onClick={() => setMenuOpen(false)}><span className="nav-icon" aria-hidden="true">{icon}</span><span>{label}</span>{label === "Low stock" && <span className="nav-count">2</span>}</Link>;
      })}</nav>
      <div className="sidebar-spacer" />
      <div className="admin-label"><span className="admin-dot" /> {user.role.toUpperCase()} ACCESS</div>
      {user.role === "Admin" && <Link className="nav-link" href="/users"><span className="nav-icon" aria-hidden="true">♙</span><span>Users</span><span className="admin-tag">ADMIN</span></Link>}
      <button className="nav-link logout-link sidebar-logout" type="button" onClick={logout}><span className="nav-icon" aria-hidden="true">↗</span><span>Logout</span></button>
      <div className="sidebar-footer"><span>Northline Goods</span><small>Retail operations</small></div>
    </aside>
    <div className="main-shell">
      <header className="topbar">
        <button className="mobile-menu-button icon-button" aria-label="Open navigation" onClick={() => setMenuOpen(true)}>☰</button>
        <div className="breadcrumbs"><span>Workspace</span><b>/</b><strong>{pageName}</strong></div>
        <div className="topbar-actions"><label className="global-search"><span aria-hidden="true">⌕</span><input aria-label="Search workspace" placeholder="Search anything..." /><kbd>⌘ K</kbd></label><button className="icon-button notification-button" aria-label="Notifications">♧<i /></button><span className="topbar-divider" /><button className="profile-button" aria-label="Account menu"><span className="profile-avatar">{user.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><span className="profile-copy"><strong>{user.name}</strong><small>{user.role}</small></span><span className="store-chevron">⌄</span></button></div>
      </header>
      <main className="main-content">{children}</main>
      <footer className="page-footer"><span>Retail Desk</span><span>Product catalog connected to API · Other dashboard panels use preview data</span></footer>
    </div>
  </div>;
}