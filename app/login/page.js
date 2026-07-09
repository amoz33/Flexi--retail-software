"use client";

import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const sessionStorageKey = "retail-auth-session";
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";

function getHomeForRole(role) {
  if (role === "Cashier") return "/cashier";
  if (role === "Customer") return "/shop";
  return "/dashboard";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@flexiretail.ng");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const savedSession = localStorage.getItem(sessionStorageKey) || sessionStorage.getItem(sessionStorageKey);
    if (!savedSession) return;

    try {
      const session = JSON.parse(savedSession);
      if (session.expiresAt && new Date(session.expiresAt) <= new Date()) {
        localStorage.removeItem(sessionStorageKey);
        sessionStorage.removeItem(sessionStorageKey);
        return;
      }

      router.replace(getHomeForRole(session.role));
    } catch {
      localStorage.removeItem(sessionStorageKey);
      sessionStorage.removeItem(sessionStorageKey);
    }
  }, [router]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setMessage("Enter your email and password to continue.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          remember
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.message || "Sign in failed. Check your details and try again.");
        return;
      }

      const session = {
        token: data.token,
        tokenType: data.token_type || "Bearer",
        expiresAt: data.expires_at,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
        allowedPages: data.user.allowed_pages || [],
        remember,
        signedInAt: new Date().toISOString()
      };

      localStorage.removeItem(sessionStorageKey);
      sessionStorage.removeItem(sessionStorageKey);
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem(sessionStorageKey, JSON.stringify(session));
      router.push(data.user.home || getHomeForRole(data.user.role));
    } catch {
      setMessage("Cannot reach the secure login server. Start the Laravel backend and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetPassword() {
    setMessage("Password reset is not connected yet. Please contact the store administrator.");
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-label="Flexi Retail Software login">
        <div className="login-brand">
          <div className="login-brand-mark"><Store /></div>
          <span>Flexi Retail Software</span>
        </div>

        <div className="login-motion" aria-hidden="true">
          <span />
          <span />
          <span />
          <div><Store /></div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {message && <div className="login-message">{message}</div>}

          <label className="login-field">
            <span>Email</span>
            <div>
              <Mail />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="manager@flexiretail.ng"
                autoComplete="email"
              />
            </div>
          </label>

          <label className="login-field">
            <span>Password</span>
            <div>
              <LockKeyhole />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </label>

          <label className="login-remember">
            <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
            <span>Keep me signed in on this device</span>
          </label>

          <button className="btn-gold login-submit" type="submit" disabled={submitting}>
            <ShieldCheck /> {submitting ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="login-reset-row">
          <button type="button" onClick={resetPassword}>Reset password</button>
        </div>
      </section>
    </main>
  );
}
