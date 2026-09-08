"use client";

import Link from "next/link";
import { ArrowLeft, ClipboardList, Home, LogOut, ReceiptText, ScanLine, ShoppingBag, ShoppingCart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";

const sessionStorageKey = "retail-auth-session";
const activeOutletStorageKey = "retail-active-outlet";
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8001/api";
const cashierAllowedRoutes = [
  "/cashier",
  "/front-desk",
  "/front-desk/sell",
  "/front-desk/receipt",
  "/front-desk/sales-history"
];

const customerAllowedRoutes = [
  "/shop",
  "/shop/orders",
  "/shop/scan-pay",
  "/shop/scan-pay/cart",
  "/shop/scan-pay/callback",
  "/shop/scan-pay/receipt"
];

function getDefaultAllowedRoutes(role) {
  if (role === "Cashier") return cashierAllowedRoutes;
  if (role === "Customer") return customerAllowedRoutes;
  return [];
}

function pageIsAllowed(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const fullAccessRoles = ["Admin", "Developer"];

function getHomeForRole(role, allowedPages = []) {
  if (!fullAccessRoles.includes(role) && allowedPages.length) return allowedPages[0];
  if (role === "Cashier") return "/cashier";
  if (role === "Customer") return "/shop";
  return "/dashboard";
}

function CustomerWebHeader({ pathname, onLogout }) {
  const isScanPay = pathname.startsWith("/shop/scan-pay");

  return (
    <header className="customer-web-header">
      <Link className="customer-web-brand" href={isScanPay ? "/shop/scan-pay" : "/shop"}>
        {isScanPay ? <ScanLine /> : <ShoppingBag />}
        <span>{isScanPay ? "Scan Pay" : "Flexi Shop"}</span>
      </Link>
      <nav className="customer-web-nav" aria-label="Customer navigation">
        {isScanPay ? (
          <>
            <Link href="/shop/scan-pay"><ScanLine /> Scan</Link>
            <Link href="/shop/scan-pay/cart"><ShoppingCart /> Cart</Link>
            <Link href="/shop/scan-pay/receipt"><ReceiptText /> Receipt</Link>
          </>
        ) : (
          <>
            <Link href="/shop"><ShoppingBag /> Shop</Link>
            <Link href="/shop/orders"><ClipboardList /> History</Link>
          </>
        )}
      </nav>
      <button className="customer-web-logout" type="button" onClick={onLogout}>
        <LogOut /> Logout
      </button>
    </header>
  );
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [activeOutlet, setActiveOutlet] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);
  const isAuthPage = pathname === "/login";
  const homeHref = getHomeForRole(session?.role, session?.allowedPages || []);
  const isCustomer = session?.role === "Customer";
  const showPageNavigation = pathname !== homeHref;

  useEffect(() => {
    let cancelled = false;

    function loadActiveOutlet() {
      const storedOutlet = localStorage.getItem(activeOutletStorageKey);
      if (!storedOutlet) {
        setActiveOutlet(null);
        return;
      }

      try {
        const parsedOutlet = JSON.parse(storedOutlet);
        setActiveOutlet(parsedOutlet && typeof parsedOutlet === "object" ? parsedOutlet : null);
      } catch {
        setActiveOutlet(null);
      }
    }

    loadActiveOutlet();
    window.addEventListener("active-outlet-changed", loadActiveOutlet);

    function clearSession() {
      localStorage.removeItem(sessionStorageKey);
      sessionStorage.removeItem(sessionStorageKey);
    }

    async function loadSession() {
      if (isAuthPage) {
        setSessionReady(true);
        return;
      }

      const savedSession = localStorage.getItem(sessionStorageKey) || sessionStorage.getItem(sessionStorageKey);
      if (!savedSession) {
        router.replace("/login");
        return;
      }

      try {
        const parsedSession = JSON.parse(savedSession);

        if (!parsedSession.token || (parsedSession.expiresAt && new Date(parsedSession.expiresAt) <= new Date())) {
          clearSession();
          router.replace("/login");
          return;
        }

        const response = await fetch(`${apiBaseUrl}/auth/me`, {
          headers: {
            "Accept": "application/json",
            "Authorization": `${parsedSession.tokenType || "Bearer"} ${parsedSession.token}`
          },
          cache: "no-store"
        });

        if (response.status === 401 || response.status === 403) {
          clearSession();
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          // Transient failure (rate limit, server hiccup, network issue) —
          // keep the existing session instead of logging the user out.
          // The next successful navigation will re-verify normally.
          if (cancelled) return;
          setSession(parsedSession);
          setSessionReady(true);
          return;
        }

        const data = await response.json();
        const verifiedSession = {
          ...parsedSession,
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          allowedPages: data.user.allowed_pages || []
        };

        if (cancelled) return;

        setSession(verifiedSession);

        if (!fullAccessRoles.includes(verifiedSession.role)) {
          const allowedRoutes = verifiedSession.allowedPages.length
            ? verifiedSession.allowedPages
            : getDefaultAllowedRoutes(verifiedSession.role);

          if (allowedRoutes.length && !allowedRoutes.some((route) => pageIsAllowed(pathname, route))) {
            router.replace(getHomeForRole(verifiedSession.role, allowedRoutes));
            return;
          }
        }

        if (!fullAccessRoles.includes(verifiedSession.role) && pathname === "/staff") {
          router.replace(getHomeForRole(verifiedSession.role, verifiedSession.allowedPages));
          return;
        }

        setSessionReady(true);
      } catch {
        // Network-level failure reaching /auth/me — don't destroy a
        // potentially-valid session over a connectivity blip. Keep the
        // user logged in locally; the next successful check will confirm.
        if (cancelled) return;
        const savedSession = localStorage.getItem(sessionStorageKey) || sessionStorage.getItem(sessionStorageKey);
        if (savedSession) {
          try {
            setSession(JSON.parse(savedSession));
            setSessionReady(true);
            return;
          } catch {
            // Saved session is corrupt JSON — this is a real reason to log out.
          }
        }
        clearSession();
        router.replace("/login");
      }
    }

    loadSession();

    return () => {
      cancelled = true;
      window.removeEventListener("active-outlet-changed", loadActiveOutlet);
    };
  }, [isAuthPage, pathname, router]);

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(homeHref);
  }

  function logout() {
    localStorage.removeItem(sessionStorageKey);
    sessionStorage.removeItem(sessionStorageKey);
    setSession(null);
    setSessionReady(false);
    router.replace("/login");
  }

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (!sessionReady) return null;

  return (
    <div className={`app-wrapper ${isCustomer ? "customer-web-wrapper" : ""}`}>
      {isCustomer ? <CustomerWebHeader pathname={pathname} onLogout={logout} /> : <Sidebar role={session?.role} allowedPages={session?.allowedPages || []} activeOutlet={activeOutlet} />}
      <main className={`main-content ${isCustomer ? "customer-main-content" : ""}`}>
        {!isCustomer && (
          <nav className="page-navigation" aria-label="Page navigation">
            {showPageNavigation && (
              <>
                <button type="button" onClick={goBack} aria-label="Go back to previous page">
                  <ArrowLeft />
                  <span>Back</span>
                </button>
                <Link href={homeHref} aria-label="Go to dashboard home">
                  <Home />
                  <span>Home</span>
                </Link>
              </>
            )}
            <button className="logout-button" type="button" onClick={logout}>
              <LogOut />
              <span>Logout</span>
            </button>
          </nav>
        )}
        <div className="page-shell">{children}</div>
        <div className="main-footer-copyright">Flexi Retail Software 2026 | All Rights Reserved</div>
      </main>
    </div>
  );
}
