"use client";

import { ClipboardList, Recycle, Save, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import DataTable from "../components/DataTable";
import { apiFetch } from "../lib/api";

const emptyWaste = {
  itemName: "",
  itemType: "Product",
  reason: "Expired",
  quantity: "1",
  action: "Quarantine",
  note: ""
};

export default function WasteManagementManager() {
  const [wasteRecords, setWasteRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formWaste, setFormWaste] = useState(emptyWaste);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadWaste() {
      try {
        const data = await apiFetch("/waste");
        if (!cancelled) setWasteRecords(data.records || []);
      } catch (error) {
        if (!cancelled) setMessage(error.message || "Could not load the waste register.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadWaste();
    return () => { cancelled = true; };
  }, []);

  function updateField(field, value) {
    setFormWaste((item) => ({ ...item, [field]: value }));
  }

  async function addWasteRecord(event) {
    event.preventDefault();
    setSaving(true);

    try {
      const data = await apiFetch("/waste", {
        method: "POST",
        body: {
          itemName: formWaste.itemName.trim(),
          itemType: formWaste.itemType,
          reason: formWaste.reason,
          quantity: Math.max(1, Number(formWaste.quantity || 1)),
          action: formWaste.action,
          note: formWaste.note.trim() || null
        }
      });

      setWasteRecords((currentRecords) => [data.record, ...currentRecords]);
      setFormWaste(emptyWaste);
      setMessage(`${data.record.itemName} has been recorded in the waste register.`);
    } catch (error) {
      setMessage(error.message || "Waste record could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="waste-policy-panel">
        <ShieldAlert />
        <div>
          <h2>Waste Management Policy</h2>
          <p>Expired, broken, damaged, or unsafe items must be removed from sale or use, placed in quarantine, recorded below, approved for disposal, and never returned to active stock without inspection.</p>
        </div>
      </section>

      <section className="section-card product-create-section">
        <div className="section-header product-create-header">
          <div>
            <h2><Recycle /> Record Waste</h2>
            <p>Register products and assets for controlled disposal, repair, recycling, or vendor return.</p>
          </div>
        </div>

        <form className="product-form" onSubmit={addWasteRecord}>
          {message && <div className="form-message">{message}</div>}
          <div className="form-grid inventory-form-grid">
            <label className="field-group">
              <span>Item Name</span>
              <input value={formWaste.itemName} onChange={(event) => updateField("itemName", event.target.value)} placeholder="Product or asset name" required />
            </label>
            <label className="field-group">
              <span>Item Type</span>
              <select value={formWaste.itemType} onChange={(event) => updateField("itemType", event.target.value)}>
                <option>Product</option>
                <option>Asset</option>
              </select>
            </label>
            <label className="field-group">
              <span>Reason</span>
              <select value={formWaste.reason} onChange={(event) => updateField("reason", event.target.value)}>
                <option>Expired</option>
                <option>Broken</option>
                <option>Damaged</option>
                <option>Unsafe</option>
                <option>Other</option>
              </select>
            </label>
            <label className="field-group">
              <span>Quantity</span>
              <input type="number" min="1" value={formWaste.quantity} onChange={(event) => updateField("quantity", event.target.value)} required />
            </label>
            <label className="field-group">
              <span>Action</span>
              <select value={formWaste.action} onChange={(event) => updateField("action", event.target.value)}>
                <option>Quarantine</option>
                <option>Return to Vendor</option>
                <option>Repair</option>
                <option>Recycle</option>
                <option>Dispose</option>
              </select>
            </label>
            <label className="field-group field-span-2">
              <span>Note</span>
              <textarea rows="4" value={formWaste.note} onChange={(event) => updateField("note", event.target.value)} placeholder="Condition, approval, disposal method, or supporting details." />
            </label>
          </div>
          <div className="form-actions">
            <button className="btn-outline" type="button" onClick={() => setFormWaste(emptyWaste)}>Clear</button>
            <button className="btn-gold" type="submit" disabled={saving}><Save /> {saving ? "Saving..." : "Save Waste Record"}</button>
          </div>
        </form>
      </section>

      <section className="section-card">
        <div className="section-header product-table-header">
          <div>
            <h2><ClipboardList /> Waste Register</h2>
            <p>{loading ? "Loading waste register..." : `${wasteRecords.length} permanent waste record${wasteRecords.length === 1 ? "" : "s"}`}</p>
          </div>
        </div>
        <DataTable
          columns={["Item", "Type", "Reason", "Qty", "Action", "Recorded By", "Recorded", "Note"]}
          rows={wasteRecords}
          rowKey={(record) => record.id}
          emptyMessage={loading ? "Loading waste register..." : "No waste has been recorded."}
          tableClassName="product-data-table waste-register-table"
          renderRow={(record) => (
            <>
              <td><strong>{record.itemName}</strong></td>
              <td>{record.itemType}</td>
              <td><span className="status-badge status-pending">{record.reason}</span></td>
              <td>{record.quantity}</td>
              <td>{record.action}</td>
              <td>{record.recordedBy || "System"}</td>
              <td>{record.recordedAt}</td>
              <td className="description-cell">{record.note || "-"}</td>
            </>
          )}
        />
      </section>
    </>
  );
}
