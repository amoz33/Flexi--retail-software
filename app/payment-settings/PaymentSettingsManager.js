"use client";

import { CheckCircle2, Save, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

const emptyForm = {
  paystackSecretKey: "",
  dpoCompanyToken: "",
  dpoServiceType: "",
  pawapayApiToken: "",
  pawapayEnv: "sandbox",
  momoSubscriptionKey: "",
  momoApiUser: "",
  momoApiKey: "",
  momoEnv: "sandbox",
  momoCallbackHost: ""
};

function StatusBadge({ configured }) {
  return configured
    ? <span className="status-badge status-active"><CheckCircle2 /> Configured</span>
    : <span className="status-badge status-pending"><ShieldAlert /> Not set up</span>;
}

export default function PaymentSettingsManager() {
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const data = await apiFetch("/payment-settings");
        if (cancelled) return;
        setStatus(data.settings);
        setForm((current) => ({
          ...current,
          pawapayEnv: data.settings.pawapayEnv || "sandbox",
          momoEnv: data.settings.momoEnv || "sandbox",
          momoCallbackHost: data.settings.momoCallbackHost || ""
        }));
      } catch (error) {
        if (!cancelled) setMessage(error.message || "Could not load payment settings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSettings();
    return () => { cancelled = true; };
  }, []);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveSection(fields, label) {
    setSaving(true);
    setMessage("");
    try {
      const body = {};
      fields.forEach((field) => { body[field] = form[field]; });
      await apiFetch("/payment-settings", { method: "PUT", body });

      const data = await apiFetch("/payment-settings");
      setStatus(data.settings);
      setMessage(`${label} settings saved.`);
    } catch (error) {
      setMessage(error.message || `Could not save ${label} settings.`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="section-card">
        <div className="cashier-panel">Loading payment settings...</div>
      </section>
    );
  }

  return (
    <section className="section-card">
      <div className="cashier-panel">
        {message && <div className="front-desk-message">{message}</div>}
        <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>
          Secret keys are never shown back once saved — only whether each gateway is configured. Leave a field blank to keep its current saved value unchanged.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

        {/* Paystack */}
        <div className="field-group" style={{ border: "1px solid rgba(201,160,32,0.22)", borderRadius: "18px", padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>Paystack</strong>
            <StatusBadge configured={status?.paystackConfigured} />
          </div>
          <label className="field-group">
            <span>Secret Key</span>
            <input type="password" value={form.paystackSecretKey} onChange={(e) => updateField("paystackSecretKey", e.target.value)} placeholder="sk_live_..." />
          </label>
          <button className="btn-outline" type="button" disabled={saving} onClick={() => saveSection(["paystackSecretKey"], "Paystack")}>
            <Save /> Save Paystack
          </button>
        </div>

        {/* DPO Pay */}
        <div className="field-group" style={{ border: "1px solid rgba(201,160,32,0.22)", borderRadius: "18px", padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>DPO Pay</strong>
            <StatusBadge configured={status?.dpoConfigured} />
          </div>
          <label className="field-group">
            <span>Company Token</span>
            <input type="password" value={form.dpoCompanyToken} onChange={(e) => updateField("dpoCompanyToken", e.target.value)} />
          </label>
          <label className="field-group">
            <span>Service Type</span>
            <input type="text" value={form.dpoServiceType} onChange={(e) => updateField("dpoServiceType", e.target.value)} />
          </label>
          <button className="btn-outline" type="button" disabled={saving} onClick={() => saveSection(["dpoCompanyToken", "dpoServiceType"], "DPO Pay")}>
            <Save /> Save DPO Pay
          </button>
        </div>

        {/* PawaPay */}
        <div className="field-group" style={{ border: "1px solid rgba(201,160,32,0.22)", borderRadius: "18px", padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>PawaPay</strong>
            <StatusBadge configured={status?.pawapayConfigured} />
          </div>
          <label className="field-group">
            <span>API Token</span>
            <input type="password" value={form.pawapayApiToken} onChange={(e) => updateField("pawapayApiToken", e.target.value)} />
          </label>
          <label className="field-group">
            <span>Environment</span>
            <select value={form.pawapayEnv} onChange={(e) => updateField("pawapayEnv", e.target.value)}>
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
          </label>
          <button className="btn-outline" type="button" disabled={saving} onClick={() => saveSection(["pawapayApiToken", "pawapayEnv"], "PawaPay")}>
            <Save /> Save PawaPay
          </button>
        </div>

        {/* MoMo */}
        <div className="field-group" style={{ border: "1px solid rgba(201,160,32,0.22)", borderRadius: "18px", padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>MoMo (MTN MoMo PSB Nigeria)</strong>
            <StatusBadge configured={status?.momoConfigured} />
          </div>
          <label className="field-group">
            <span>Subscription Key</span>
            <input type="password" value={form.momoSubscriptionKey} onChange={(e) => updateField("momoSubscriptionKey", e.target.value)} />
          </label>
          <label className="field-group">
            <span>API User</span>
            <input type="text" value={form.momoApiUser} onChange={(e) => updateField("momoApiUser", e.target.value)} />
          </label>
          <label className="field-group">
            <span>API Key</span>
            <input type="password" value={form.momoApiKey} onChange={(e) => updateField("momoApiKey", e.target.value)} />
          </label>
          <label className="field-group">
            <span>Callback Host (your domain, no https://)</span>
            <input type="text" value={form.momoCallbackHost} onChange={(e) => updateField("momoCallbackHost", e.target.value)} placeholder="clienta.flexisoftware.ng" />
          </label>
          <label className="field-group">
            <span>Environment</span>
            <select value={form.momoEnv} onChange={(e) => updateField("momoEnv", e.target.value)}>
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
          </label>
          <button className="btn-outline" type="button" disabled={saving} onClick={() => saveSection(["momoSubscriptionKey", "momoApiUser", "momoApiKey", "momoCallbackHost", "momoEnv"], "MoMo")}>
            <Save /> Save MoMo
          </button>
        </div>

        </div>
      </div>
    </section>
  );
}
