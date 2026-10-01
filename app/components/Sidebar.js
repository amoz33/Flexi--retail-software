"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BadgeDollarSign, BarChart3, Boxes, ChevronLeft, ChevronRight, ClipboardList, CreditCard, Crown, FileBarChart, Gem, HandCoins, Handshake, Home, Menu, MessageSquareText, Printer, Receipt, Recycle, ScanLine, ShoppingBag, Sparkles, Store, Truck, Users, X } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home, group: "Overview" },
  { href: "/analytics", label: "Analytics Hub", icon: BarChart3, group: "Overview" },
  { href: "/products", label: "Inventory", icon: Boxes, group: "Operations" },
  { href: "/inventory", label: "Asset Management", icon: ClipboardList, group: "Operations" },
  { href: "/waste-management", label: "Waste Management", icon: Recycle, group: "Operations" },
  { href: "/expenses", label: "Expenses", icon: Receipt, group: "Operations" },
  { href: "/front-desk", label: "Front Desk", icon: Store, group: "Sales" },
  { href: "/front-desk/sell", label: "Cashier Sale", icon: ScanLine, group: "Sales" },
  { href: "/front-desk/receipt", label: "Receipt Print", icon: Printer, group: "Sales" },
  { href: "/shop", label: "Customer Shop", icon: ShoppingBag, group: "Shop" },
  { href: "/shop/scan-pay", label: "Scan Pay", icon: ScanLine, group: "Shop" },
  { href: "/shop/orders", label: "Shop Orders", icon: ClipboardList, group: "Shop" },
  { href: "/customers", label: "Customers", icon: MessageSquareText, group: "People" },
  { href: "/vendors", label: "Vendor Desk", icon: Handshake, group: "People" },
  { href: "/vendor-transactions", label: "Vendor Transactions", icon: HandCoins, group: "People" },
  { href: "/pricing", label: "Price Book", icon: BadgeDollarSign, group: "Control" },
  { href: "/reports", label: "Reports", icon: FileBarChart, group: "Control" },
  { href: "/staff", label: "Staff", icon: Users, group: "Control" },
  { href: "/staff-records", label: "Staff Records", icon: ClipboardList, group: "Control" },
  { href: "/payment-settings", label: "Payment Settings", icon: CreditCard, group: "Control" },
  { href: "/orders", label: "Order Flow", icon: Truck, group: "Control" }
];

const cashierNavItems = [
  { href: "/cashier", label: "Cashier Dashboard", icon: Home, group: "Counter" },
  { href: "/front-desk", label: "Front Desk", icon: Store, group: "Counter" },
  { href: "/front-desk/sell", label: "Cashier Sale", icon: ScanLine, group: "Counter" },
  { href: "/front-desk/receipt", label: "Receipt", icon: Printer, group: "Records" },
  { href: "/front-desk/sales-history", label: "Sales History", icon: ClipboardList, group: "Records" }
];

const customerNavItems = [
  { href: "/shop", label: "Customer Shop", icon: ShoppingBag, group: "Shopping" },
  { href: "/shop/scan-pay", label: "Scan Pay", icon: ScanLine, group: "Shopping" },
  { href: "/shop/orders", label: "My Orders", icon: ClipboardList, group: "Account" }
];

function pageIsAllowed(href, allowedPages = []) {
  return allowedPages.includes(href);
}

const fullAccessRoles = ["Admin", "Developer"];

function getNavItemsForRole(role, allowedPages = []) {
  if (role === "Cashier") {
    return allowedPages.length ? cashierNavItems.filter((item) => pageIsAllowed(item.href, allowedPages)) : cashierNavItems;
  }
  if (role === "Customer") return customerNavItems;
  if (!fullAccessRoles.includes(role) && allowedPages.length) {
    return navItems.filter((item) => pageIsAllowed(item.href, allowedPages));
  }
  if (role === "Admin") {
    return navItems.filter((item) => item.href !== "/payment-settings");
  }
  return navItems;
}

function getHomeForRole(role, allowedPages = []) {
  if (!fullAccessRoles.includes(role) && allowedPages.length) return allowedPages[0];
  if (role === "Cashier") return "/cashier";
  if (role === "Customer") return "/shop";
  return "/dashboard";
}

export default function Sidebar({ role, allowedPages = [], activeOutlet }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleNavItems = getNavItemsForRole(role, allowedPages);
  const homeHref = getHomeForRole(role, allowedPages);

  useEffect(() => {
    setCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
  }, []);

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebarCollapsed", String(next));
  }

  return (
    <>
      <button className="hamburger-btn" type="button" onClick={() => setMobileOpen(true)} aria-label="Open menu">
        <Menu />
      </button>
      <button
        className={`mobile-overlay ${mobileOpen ? "active" : ""}`}
        type="button"
        aria-label="Close menu"
        onClick={() => setMobileOpen(false)}
      />
      <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="logo-area">
          <Link className="logo" href={homeHref} onClick={() => setMobileOpen(false)}>
            <Crown className="logo-crown" />
            <span className="logo-text">FLEXI<span className="logo-badge">RS</span></span>
          </Link>
          <button className="sidebar-toggle-btn desktop-toggle" type="button" onClick={toggleSidebar} aria-label="Toggle sidebar">
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </button>
          <button className="sidebar-toggle-btn mobile-close" type="button" onClick={() => setMobileOpen(false)} aria-label="Close sidebar">
            <X />
          </button>
        </div>

        <nav className="nav" aria-label="Primary">
          {visibleNavItems.map((item, index) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            const showGroup = item.group && item.group !== visibleNavItems[index - 1]?.group;
            return (
              <div className="nav-entry" key={item.href}>
                {showGroup && <div className="nav-group-label">{item.group}</div>}
                <Link className={`nav-item ${active ? "active" : ""}`} href={item.href} onClick={() => setMobileOpen(false)}>
                  <Icon />
                  <span>{item.label}</span>
                </Link>
              </div>
            );
          })}
        </nav>

        <div className="nav-footer">
          {activeOutlet && (
            <div className="active-outlet-sidebar">
              <Store />
              <span>
                <strong>{activeOutlet.name}</strong>
                <small>{activeOutlet.code}{activeOutlet.city ? ` · ${activeOutlet.city}` : ""}</small>
              </span>
            </div>
          )}
          <div><Store /> <span>{role || "Staff"} Access</span></div>
          <div><Gem /> <span>Flexi Retail Software</span></div>
          <div><Sparkles /> <span>Real-time Edge</span></div>
          <div className="copyright-text">Flexi Retail Software 2026</div>
        </div>
      </aside>
    </>
  );
}
