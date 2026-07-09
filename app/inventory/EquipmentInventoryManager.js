"use client";

import { Archive, Plus, Recycle, Save, Search, Trash2, Wrench, X } from "lucide-react";
import { useEffect, useState } from "react";
import DataTable from "../components/DataTable";

const equipmentStorageKey = "retail-equipment-inventory";
const wasteStorageKey = "retail-waste-register";

const emptyEquipment = {
  name: "",
  category: "",
  location: "",
  quantity: "1",
  status: "Working",
  note: ""
};

function normalizeEquipment(item) {
  const validStatuses = ["Working", "Faulty", "Broken", "Disposed"];
  return {
    ...item,
    quantity: Number(item.quantity || 1),
    status: validStatuses.includes(item.status) ? item.status : "Working",
    note: item.note || ""
  };
}

function normalizeWaste(item) {
  return {
    ...item,
    quantity: Math.max(1, Number(item.quantity || 1)),
    recordedAt: item.recordedAt || new Date().toLocaleString()
  };
}

function equipmentMatchesQuery(item, query) {
  if (!query) return true;

  const searchableText = [
    item.name,
    item.category,
    item.location,
    item.quantity,
    item.status,
    item.note
  ].filter(Boolean).join(" ").toLowerCase();

  return searchableText.includes(query.toLowerCase());
}

export default function EquipmentInventoryManager({ initialEquipment }) {
  const [equipment, setEquipment] = useState(initialEquipment.map(normalizeEquipment));
  const [formEquipment, setFormEquipment] = useState(emptyEquipment);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");

  const filteredEquipment = equipment.filter((item) => equipmentMatchesQuery(item, query.trim()));
  const faultyCount = equipment.filter((item) => item.status === "Faulty").length;

  useEffect(() => {
    const savedEquipment = localStorage.getItem(equipmentStorageKey);
    if (savedEquipment) {
      try {
        setEquipment(JSON.parse(savedEquipment).map(normalizeEquipment));
      } catch {
        localStorage.removeItem(equipmentStorageKey);
      }
    }
  }, []);

  function saveEquipment(nextEquipment) {
    const normalizedEquipment = nextEquipment.map(normalizeEquipment);
    localStorage.setItem(equipmentStorageKey, JSON.stringify(normalizedEquipment));
    return normalizedEquipment;
  }

  function updateField(field, value) {
    setFormEquipment((item) => ({ ...item, [field]: value }));
  }

  function addEquipment(event) {
    event.preventDefault();
    const item = normalizeEquipment({
      ...formEquipment,
      id: Date.now(),
      name: formEquipment.name.trim(),
      location: formEquipment.location.trim(),
      note: formEquipment.note.trim()
    });

    setEquipment((currentEquipment) => saveEquipment([item, ...currentEquipment]));
    setFormEquipment(emptyEquipment);
    setMessage(`${item.name} has been added to asset management.`);
  }

  function updateEquipmentStatus(itemId, status) {
    setEquipment((currentEquipment) => saveEquipment(currentEquipment.map((item) => (
      item.id === itemId ? { ...item, status } : item
    ))));
  }

  function updateEquipmentNote(itemId, note) {
    setEquipment((currentEquipment) => saveEquipment(currentEquipment.map((item) => (
      item.id === itemId ? { ...item, note } : item
    ))));
  }

  function deleteEquipment(itemId) {
    const item = equipment.find((currentItem) => currentItem.id === itemId);
    setEquipment((currentEquipment) => saveEquipment(currentEquipment.filter((currentItem) => currentItem.id !== itemId)));
    setMessage(item ? `${item.name} has been removed.` : "");
  }

  function moveAssetToWaste(item) {
    const record = normalizeWaste({
      id: Date.now(),
      itemName: item.name,
      itemType: "Asset",
      reason: item.status === "Broken" ? "Broken" : "Damaged",
      quantity: item.quantity,
      action: "Quarantine",
      note: item.note || `Moved from Asset Management with status: ${item.status}.`,
      recordedAt: new Date().toLocaleString()
    });

    let wasteRecords = [];
    try {
      wasteRecords = JSON.parse(localStorage.getItem(wasteStorageKey) || "[]");
    } catch {
      wasteRecords = [];
    }
    localStorage.setItem(wasteStorageKey, JSON.stringify([record, ...wasteRecords.map(normalizeWaste)]));
    setEquipment((currentEquipment) => saveEquipment(currentEquipment.map((asset) => (
      asset.id === item.id ? { ...asset, status: "Disposed" } : asset
    ))));
    setMessage(`${item.name} has been moved to the waste register.`);
  }

  return (
    <>
      <section className="section-card product-create-section">
        <div className="section-header product-create-header">
          <div>
            <h2><Plus /> Add Asset</h2>
            <p>Track store assets like AC units, fans, scanners, printers, shelves, and repairs.</p>
          </div>
        </div>

        <form className="product-form" onSubmit={addEquipment}>
          {message && <div className="form-message">{message}</div>}

          <div className="form-grid inventory-form-grid">
            <label className="field-group">
              <span>Name</span>
              <input
                type="text"
                value={formEquipment.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Main Floor AC"
                required
              />
            </label>

            <label className="field-group">
              <span>Category</span>
              <input
                type="text"
                value={formEquipment.category}
                onChange={(event) => updateField("category", event.target.value)}
                placeholder="Air Conditioner, Fan, Printer..."
                required
              />
            </label>

            <label className="field-group">
              <span>Location</span>
              <input
                type="text"
                value={formEquipment.location}
                onChange={(event) => updateField("location", event.target.value)}
                placeholder="Sales Floor"
              />
            </label>

            <label className="field-group">
              <span>Quantity</span>
              <input
                type="number"
                min="1"
                value={formEquipment.quantity}
                onChange={(event) => updateField("quantity", event.target.value)}
              />
            </label>

            <label className="field-group">
              <span>Status</span>
              <select value={formEquipment.status} onChange={(event) => updateField("status", event.target.value)}>
                <option>Working</option>
                <option>Faulty</option>
                <option>Broken</option>
                <option>Disposed</option>
              </select>
            </label>

            <label className="field-group field-span-2">
              <span>Note</span>
              <textarea
                rows="4"
                value={formEquipment.note}
                onChange={(event) => updateField("note", event.target.value)}
                placeholder="Fault details, maintenance notes, warranty, or repair follow-up."
              />
            </label>
          </div>

          <div className="form-actions">
            <button className="btn-outline" type="button" onClick={() => setFormEquipment(emptyEquipment)}>Clear</button>
            <button className="btn-gold" type="submit"><Save /> Save Asset</button>
          </div>
        </form>
      </section>

      <section className="section-card">
        <div className="section-header product-table-header">
          <div>
            <h2><Archive /> Asset Register</h2>
            <p>{filteredEquipment.length} of {equipment.length} asset{equipment.length === 1 ? "" : "s"} | {faultyCount} faulty</p>
          </div>

          <label className="product-search">
            <Search />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search assets, location, status..."
              aria-label="Search asset management"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear equipment search">
                <X />
              </button>
            )}
          </label>
        </div>

        <DataTable
          columns={["Asset", "Category", "Location", "Qty", "Status", "Note", "Actions"]}
          rows={filteredEquipment}
          rowKey={(item) => item.id}
          emptyMessage="No assets match your search."
          tableClassName="product-data-table"
          renderRow={(item) => (
            <>
              <td><strong>{item.name}</strong></td>
              <td>{item.category}</td>
              <td>{item.location || "-"}</td>
              <td>{item.quantity}</td>
              <td>
                <span className={`status-badge ${item.status === "Working" ? "status-active" : "status-pending"}`}>
                  {item.status}
                </span>
              </td>
              <td className="inventory-note-cell">
                <textarea
                  value={item.note}
                  onChange={(event) => updateEquipmentNote(item.id, event.target.value)}
                  aria-label={`${item.name} note`}
                  placeholder="Add note"
                />
              </td>
              <td>
                <div className="inventory-action-buttons">
                  <button
                    className="btn-outline product-row-button"
                    type="button"
                    onClick={() => updateEquipmentStatus(item.id, item.status === "Faulty" ? "Working" : "Faulty")}
                    disabled={item.status === "Disposed"}
                  >
                    <Wrench /> {item.status === "Faulty" ? "Mark Working" : "Flag Faulty"}
                  </button>
                  <button
                    className="btn-outline product-row-button waste-action-button"
                    type="button"
                    onClick={() => moveAssetToWaste(item)}
                    disabled={item.status === "Disposed"}
                  >
                    <Recycle /> Move to Waste
                  </button>
                  <button className="icon-button" type="button" onClick={() => deleteEquipment(item.id)} aria-label={`Delete ${item.name}`}>
                    <Trash2 />
                  </button>
                </div>
              </td>
            </>
          )}
        />
      </section>

    </>
  );
}
