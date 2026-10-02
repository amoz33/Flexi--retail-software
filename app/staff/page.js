"use client";

import Link from "next/link";
import { Ban, BarChart3, CheckCircle2, Copy, Eye, KeyRound, Save, ShieldCheck, UserPlus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import DataTable from "../components/DataTable";
import { getApiBaseUrl } from "../lib/api";

const sessionStorageKey = "retail-auth-session";

const roles = ["Admin", "Manager", "Cashier", "Inventory", "Staff"];
const fullAccessRoles = ["Admin", "Developer"];
const pageOptions = [
  { href: "/cashier", label: "Cashier Dashboard" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/analytics", label: "Analytics Hub" },
  { href: "/products", label: "Inventory" },
  { href: "/inventory", label: "Asset Management" },
  { href: "/waste-management", label: "Waste Management" },
  { href: "/front-desk", label: "Front Desk" },
  { href: "/front-desk/sell", label: "Cashier Sale" },
  { href: "/front-desk/receipt", label: "Receipt Print" },
  { href: "/front-desk/sales-history", label: "Sales History" },
  { href: "/customers", label: "Customers" },
  { href: "/orders", label: "Orders" },
  { href: "/expenses", label: "Expenses" },
  { href: "/vendors", label: "Vendor Desk" },
  { href: "/vendor-transactions", label: "Vendor Transactions" },
  { href: "/pricing", label: "Price Book" },
  { href: "/reports", label: "Reports" },
  { href: "/payment-settings", label: "Payment Settings" },
  { href: "/staff", label: "Staff" },
  { href: "/staff-records", label: "Staff Records" }
];

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  address: "",
  role: "Cashier",
  allowed_pages: ["/cashier", "/front-desk", "/front-desk/sell", "/front-desk/receipt", "/front-desk/sales-history"]
};

function getStoredSession() {
  try {
    return JSON.parse(localStorage.getItem(sessionStorageKey) || sessionStorage.getItem(sessionStorageKey) || "null");
  } catch {
    return null;
  }
}

export default function StaffPage() {
  const [session, setSession] = useState(null);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedStaff = staff.find((person) => person.id === selectedId) || staff[0] || null;

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

    async function loadStaff() {
      setLoading(true);
      setMessage("");

      try {
        const response = await fetch(`${getApiBaseUrl()}/staff`, {
          headers: {
            "Accept": "application/json",
            "Authorization": `${session.tokenType || "Bearer"} ${session.token}`
          },
          cache: "no-store"
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          setMessage(data.message || "Staff records could not be loaded.");
          return;
        }

        setStaff(data.staff || []);
        setSelectedId((currentId) => currentId || data.staff?.[0]?.id || null);
      } catch {
        setMessage("Cannot reach the staff API. Start the Laravel backend and try again.");
      } finally {
        setLoading(false);
      }
    }

    loadStaff();
  }, [session]);

  function updateAllowedPage(href, checked, target = "form") {
    if (target === "form") {
      setForm((current) => ({
        ...current,
        allowed_pages: checked
          ? Array.from(new Set([...current.allowed_pages, href]))
          : current.allowed_pages.filter((page) => page !== href)
      }));
      return;
    }

    setStaff((currentStaff) => currentStaff.map((person) => {
      if (person.id !== selectedStaff.id) return person;
      return {
        ...person,
        allowed_pages: checked
          ? Array.from(new Set([...(person.allowed_pages || []), href]))
          : (person.allowed_pages || []).filter((page) => page !== href)
      };
    }));
  }

  async function createStaff(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setGeneratedPassword("");

    try {
      const response = await fetch(`${getApiBaseUrl()}/staff`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(form)
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.message || "Staff member could not be created.");
        return;
      }

      setStaff((currentStaff) => [data.staff, ...currentStaff]);
      setSelectedId(data.staff.id);
      setGeneratedPassword(data.generated_password || "");
      setForm(emptyForm);
      setMessage(`${data.staff.name} can now sign in with the generated password.`);
    } catch {
      setMessage("Cannot reach the staff API. Start the Laravel backend and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSelectedStaff() {
    if (!selectedStaff) return;
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`${getApiBaseUrl()}/staff/${selectedStaff.id}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          name: selectedStaff.name,
          email: selectedStaff.email,
          phone: selectedStaff.phone || "",
          address: selectedStaff.address || "",
          role: selectedStaff.role,
          allowed_pages: selectedStaff.allowed_pages || []
        })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.message || "Staff member could not be updated.");
        return;
      }

      setStaff((currentStaff) => currentStaff.map((person) => person.id === data.staff.id ? data.staff : person));
      setMessage(`${data.staff.name} was updated.`);
    } catch {
      setMessage("Cannot reach the staff API. Start the Laravel backend and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(person) {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`${getApiBaseUrl()}/staff/${person.id}/status`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ is_active: !person.is_active })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.message || "Staff status could not be changed.");
        return;
      }

      setStaff((currentStaff) => currentStaff.map((item) => item.id === data.staff.id ? data.staff : item));
      setMessage(`${data.staff.name} is now ${data.staff.is_active ? "active" : "deactivated"}.`);
    } catch {
      setMessage("Cannot reach the staff API. Start the Laravel backend and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function resetStaffPassword(person) {
    if (fullAccessRoles.includes(person.role)) return;

    setSaving(true);
    setMessage("");
    setGeneratedPassword("");

    try {
      const response = await fetch(`${getApiBaseUrl()}/staff/${person.id}/reset-password`, {
        method: "POST",
        headers: authHeaders
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.message || "Staff password could not be reset.");
        return;
      }

      setStaff((currentStaff) => currentStaff.map((item) => item.id === data.staff.id ? data.staff : item));
      setGeneratedPassword(data.generated_password || "");
      setMessage(`${data.staff.name}'s password was reset. Copy the generated password shown above.`);
    } catch {
      setMessage("Cannot reach the staff API. Start the Laravel backend and try again.");
    } finally {
      setSaving(false);
    }
  }

  function updateSelectedField(field, value) {
    setStaff((currentStaff) => currentStaff.map((person) => (
      person.id === selectedStaff.id ? { ...person, [field]: value } : person
    )));
  }

  function copyPassword() {
    if (!generatedPassword) return;
    navigator.clipboard?.writeText(generatedPassword);
    setMessage("Generated password copied.");
  }

  if (session && !fullAccessRoles.includes(session.role)) {
    return (
      <section className="section-card">
        <div className="empty-table-cell">Only admins or the developer account can manage staff accounts.</div>
      </section>
    );
  }

  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h1><Users /> Staff</h1>
          <p>Create staff accounts, assign dashboard pages, and control access.</p>
        </div>
        <div className="staff-top-actions">
          <Link className="btn-outline" href="/staff-records"><BarChart3 /> Staff Records</Link>
          <div className="role-badge">Admin & Developer</div>
        </div>
      </div>

      {message && <div className="front-desk-message staff-message">{message}</div>}

      <section className="section-card staff-admin-panel staff-create-card">
        <div className="section-header product-table-header">
          <div>
            <h2><UserPlus /> Create Staff Login</h2>
            <p>Name, contact details, role, generated password, and dashboard access.</p>
          </div>
        </div>

        <form className="staff-form" onSubmit={createStaff}>
          <div className="form-grid staff-login-grid">
            <label className="field-group">
              <span>Name</span>
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Staff full name" required />
            </label>
            <label className="field-group">
              <span>Email Address</span>
              <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="staff@store.com" required />
            </label>
            <label className="field-group">
              <span>Phone Number</span>
              <input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+234 803 555 0112" />
            </label>
            <label className="field-group field-span-2">
              <span>Address</span>
              <input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="18 Marina Road, Lagos" />
            </label>
            <label className="field-group">
              <span>Role</span>
              <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
                {roles.map((role) => <option key={role}>{role}</option>)}
              </select>
            </label>
          </div>

          <div className="staff-page-access">
            {pageOptions.map((page) => (
              <label key={page.href}>
                <input
                  type="checkbox"
                  checked={form.allowed_pages.includes(page.href)}
                  onChange={(event) => updateAllowedPage(page.href, event.target.checked)}
                />
                <span>{page.label}</span>
              </label>
            ))}
          </div>

          <div className="staff-actions-row">
            <button className="btn-gold" type="submit" disabled={saving}>
              <KeyRound /> {saving ? "Creating..." : "Create Staff & Generate Password"}
            </button>
            {generatedPassword && (
              <button className="btn-outline generated-password" type="button" onClick={copyPassword}>
                <Copy /> {generatedPassword}
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="section-card">
        <div className="section-header product-table-header">
          <div>
            <h2><ShieldCheck /> Staff Accounts</h2>
            <p>{staff.length} account{staff.length === 1 ? "" : "s"} with assigned dashboard access</p>
          </div>
        </div>
        <DataTable
          columns={["Staff", "Role", "Contact", "Status", "Access", "Actions"]}
          rows={staff}
          rowKey={(person) => person.id}
          emptyMessage={loading ? "Loading staff records..." : "No staff records to show."}
          renderRow={(person) => {
            return (
              <>
                <td><strong className="staff-name"><ShieldCheck /> {person.name}</strong></td>
                <td>{person.role}</td>
                <td>
                  <div className="staff-contact-cell">
                    <span>{person.email}</span>
                    <small>{person.phone || "No phone"}{person.address ? ` | ${person.address}` : ""}</small>
                  </div>
                </td>
                <td><span className={`status-pill ${person.is_active ? "status-active" : "status-inactive"}`}>{person.is_active ? "Active" : "Inactive"}</span></td>
                <td>{fullAccessRoles.includes(person.role) ? "All pages" : `${person.allowed_pages?.length || 0} page${person.allowed_pages?.length === 1 ? "" : "s"}`}</td>
                <td>
                  <div className="staff-row-actions">
                    <button className="btn-outline staff-table-action" type="button" onClick={() => setSelectedId(person.id)}>
                      <Eye /> View
                    </button>
                    {!fullAccessRoles.includes(person.role) && (
                      <>
                        <button className="btn-outline staff-table-action" type="button" onClick={() => resetStaffPassword(person)} disabled={saving}>
                          <KeyRound /> Reset Password
                        </button>
                        <button className="btn-outline staff-table-action" type="button" onClick={() => toggleStatus(person)} disabled={saving}>
                          {person.is_active ? <Ban /> : <CheckCircle2 />} {person.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </>
            );
          }}
        />
      </section>

      {selectedStaff && (
        <section className="section-card staff-detail-panel">
          <div className="section-header product-table-header">
            <div>
              <h2><Users /> {selectedStaff.name}</h2>
              <p>Edit login details, status, role, and page access for this staff member.</p>
            </div>
            <div className="staff-actions-row">
              {!fullAccessRoles.includes(selectedStaff.role) && (
                <>
                  <button className="btn-outline" type="button" onClick={() => resetStaffPassword(selectedStaff)} disabled={saving}>
                    <KeyRound /> Reset Password
                  </button>
                  <button className="btn-outline" type="button" onClick={() => toggleStatus(selectedStaff)} disabled={saving}>
                    {selectedStaff.is_active ? <Ban /> : <CheckCircle2 />} {selectedStaff.is_active ? "Deactivate" : "Activate"}
                  </button>
                </>
              )}
              <button className="btn-gold" type="button" onClick={saveSelectedStaff} disabled={saving}>
                <Save /> Save
              </button>
            </div>
          </div>

          <div className="form-grid staff-login-grid">
            <label className="field-group">
              <span>Name</span>
              <input value={selectedStaff.name} onChange={(event) => updateSelectedField("name", event.target.value)} />
            </label>
            <label className="field-group">
              <span>Email Address</span>
              <input type="email" value={selectedStaff.email || ""} onChange={(event) => updateSelectedField("email", event.target.value)} />
            </label>
            <label className="field-group">
              <span>Phone Number</span>
              <input type="tel" value={selectedStaff.phone || ""} onChange={(event) => updateSelectedField("phone", event.target.value)} />
            </label>
            <label className="field-group field-span-2">
              <span>Address</span>
              <input value={selectedStaff.address || ""} onChange={(event) => updateSelectedField("address", event.target.value)} />
            </label>
            <label className="field-group">
              <span>Role</span>
              <select value={selectedStaff.role} onChange={(event) => updateSelectedField("role", event.target.value)}>
                {roles.map((role) => <option key={role}>{role}</option>)}
              </select>
            </label>
          </div>

          <div className="staff-page-access">
            {pageOptions.map((page) => (
              <label key={page.href}>
                <input
                  type="checkbox"
                  checked={fullAccessRoles.includes(selectedStaff.role) || (selectedStaff.allowed_pages || []).includes(page.href)}
                  disabled={fullAccessRoles.includes(selectedStaff.role)}
                  onChange={(event) => updateAllowedPage(page.href, event.target.checked, "selected")}
                />
                <span>{page.label}</span>
              </label>
            ))}
          </div>
        </section>
      )}
    </>
  );
}