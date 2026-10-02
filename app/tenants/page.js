"use client";

import { Building2, Copy, KeyRound, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import DataTable from "../components/DataTable";
import { getApiBaseUrl } from "../lib/api";

const sessionStorageKey = "retail-auth-session";

const emptyForm = {
  subdomain: "",
  admin_name: "",
  admin_email: "",
  admin_password: ""
};

function getStoredSession() {
  try {
    return JSON.parse(localStorage.getItem(sessionStorageKey) || sessionStorage.getItem(sessionStorageKey) || "null");
  } catch {
    return null;
  }
}

export default function TenantsPage() {
  const [session, setSession] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [message, setMessage] = useState("");
  const [createdTenant, setCreatedTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const authHeaders = useMemo(() => {
    if (!session?.token) return {};
    return {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `${session.tokenType || "Bearer"} ${session.token}`
    };
  }, [session]);

  useEffect(() => {
    setSession(getStoredSession());
  }, []);

  useEffect(() => {
    if (!session) return;

    async function loadTenants() {
      setLoading(true);
      setMessage("");

      try {
        const response = await fetch(`${getApiBaseUrl()}/tenants`, {
          headers: {
            "Accept": "application/json",
            "Authorization": `${session.tokenType || "Bearer"} ${session.token}`
          },
          cache: "no-store"
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          setMessage(data.message || "Tenants could not be loaded.");
          return;
        }

        setTenants(data.tenants || []);
      } catch {
        setMessage("Cannot reach the tenants API. Start the Laravel backend and try again.");
      } finally {
        setLoading(false);
      }
    }

    loadTenants();
  }, [session]);

  async function createTenant(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setCreatedTenant(null);

    try {
      const response = await fetch(`${getApiBaseUrl()}/tenants`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          subdomain: form.subdomain.toLowerCase(),
          admin_name: form.admin_name,
          admin_email: form.admin_email,
          admin_password: autoGenerate ? null : form.admin_password
        })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.message || "Tenant could not be created.");
        return;
      }

      setTenants((current) => [{ id: data.tenant.tenant_id, domains: [data.tenant.domain.replace(".flexisoftware.ng", "")], created_at: new Date().toISOString() }, ...current]);
      setCreatedTenant(data.tenant);
      setForm(emptyForm);
      setMessage(`Tenant "${data.tenant.tenant_id}" created.`);
    } catch {
      setMessage("Cannot reach the tenants API. Start the Laravel backend and try again.");
    } finally {
      setSaving(false);
    }
  }

  function copyPassword() {
    if (!createdTenant?.admin_password) return;
    navigator.clipboard?.writeText(createdTenant.admin_password);
    setMessage("Admin password copied.");
  }

  if (session && session.role !== "Developer") {
    return (
      <section className="section-card">
        <div className="empty-table-cell">Only the developer account can manage tenants.</div>
      </section>
    );
  }

  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h1><Building2 /> Tenants</h1>
          <p>Create a new tenant subdomain and its first admin account.</p>
        </div>
        <div className="role-badge">Developer Only</div>
      </div>

      {message && <div className="front-desk-message staff-message">{message}</div>}

      <section className="section-card staff-admin-panel staff-create-card">
        <div className="section-header product-table-header">
          <div>
            <h2><Building2 /> Create Tenant</h2>
            <p>Subdomain, first admin login, and generated or custom password.</p>
          </div>
        </div>

        <form className="staff-form" onSubmit={createTenant}>
          <div className="form-grid staff-login-grid">
            <label className="field-group">
              <span>Subdomain</span>
              <input
                value={form.subdomain}
                onChange={(event) => setForm({ ...form, subdomain: event.target.value.toLowerCase() })}
                placeholder="hcollections"
                pattern="[a-z0-9]+"
                required
              />
            </label>
            <label className="field-group">
              <span>Admin Name</span>
              <input value={form.admin_name} onChange={(event) => setForm({ ...form, admin_name: event.target.value })} placeholder="Tenant admin full name" required />
            </label>
            <label className="field-group">
              <span>Admin Email</span>
              <input type="email" value={form.admin_email} onChange={(event) => setForm({ ...form, admin_email: event.target.value })} placeholder="admin@tenant.com" required />
            </label>
            <label className="field-group">
              <span>
                <input type="checkbox" checked={autoGenerate} onChange={(event) => setAutoGenerate(event.target.checked)} /> Auto-generate password
              </span>
              {!autoGenerate && (
                <input
                  type="text"
                  value={form.admin_password}
                  onChange={(event) => setForm({ ...form, admin_password: event.target.value })}
                  placeholder="Set admin password"
                  minLength={8}
                  required={!autoGenerate}
                />
              )}
            </label>
          </div>

          <div className="staff-actions-row">
            <button className="btn-gold" type="submit" disabled={saving}>
              <KeyRound /> {saving ? "Creating..." : "Create Tenant"}
            </button>
            {createdTenant?.admin_password && (
              <button className="btn-outline generated-password" type="button" onClick={copyPassword}>
                <Copy /> {createdTenant.admin_password}
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="section-card">
        <div className="section-header product-table-header">
          <div>
            <h2><ShieldCheck /> Tenants</h2>
            <p>{tenants.length} tenant{tenants.length === 1 ? "" : "s"}</p>
          </div>
        </div>
        <DataTable
          columns={["Tenant", "Domain(s)", "Created"]}
          rows={tenants}
          rowKey={(tenant) => tenant.id}
          emptyMessage={loading ? "Loading tenants..." : "No tenants yet."}
          renderRow={(tenant) => (
            <>
              <td><strong className="staff-name"><Building2 /> {tenant.id}</strong></td>
              <td>{(tenant.domains || []).map((d) => `${d}.flexisoftware.ng`).join(", ")}</td>
              <td>{tenant.created_at ? new Date(tenant.created_at).toLocaleDateString() : "—"}</td>
            </>
          )}
        />
      </section>
    </>
  );
}