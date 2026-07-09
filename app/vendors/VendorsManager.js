"use client";

import { Mail, MapPin, Phone, Plus, Save, Search, Trash2, UserRound, X } from "lucide-react";
import { useState } from "react";
import DataTable from "../components/DataTable";

const emptyVendor = {
  name: "",
  contactName: "",
  phone: "",
  email: "",
  accountNumber: "",
  address: "",
  status: "Active",
  notes: ""
};

function vendorMatchesQuery(vendor, query) {
  if (!query) return true;

  const searchableText = [
    vendor.name,
    vendor.contactName,
    vendor.phone,
    vendor.email,
    vendor.accountNumber,
    vendor.address,
    vendor.status,
    vendor.notes
  ].filter(Boolean).join(" ").toLowerCase();

  return searchableText.includes(query.toLowerCase());
}

export default function VendorsManager({ initialVendors }) {
  const [tableVendors, setTableVendors] = useState(initialVendors);
  const [formVendor, setFormVendor] = useState(emptyVendor);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const filteredVendors = tableVendors.filter((vendor) => vendorMatchesQuery(vendor, query.trim()));

  function updateVendorField(field, value) {
    setFormVendor((vendor) => ({ ...vendor, [field]: value }));
  }

  function addVendor(event) {
    event.preventDefault();
    const vendor = {
      ...formVendor,
      id: Date.now(),
      name: formVendor.name.trim(),
      contactName: formVendor.contactName.trim(),
      phone: formVendor.phone.trim(),
      email: formVendor.email.trim(),
      accountNumber: formVendor.accountNumber.trim(),
      address: formVendor.address.trim(),
      status: formVendor.status,
      notes: formVendor.notes.trim()
    };

    setTableVendors((currentVendors) => [vendor, ...currentVendors]);
    setFormVendor(emptyVendor);
    setMessage(`${vendor.name} has been added.`);
  }

  function deleteVendor(vendorId) {
    const vendor = tableVendors.find((item) => item.id === vendorId);
    setTableVendors((currentVendors) => currentVendors.filter((item) => item.id !== vendorId));
    setMessage(vendor ? `${vendor.name} has been deleted.` : "");
  }

  return (
    <>
      <section className="section-card product-create-section">
        <div className="section-header product-create-header">
          <h2><Plus /> Add Vendor</h2>
        </div>

        <form className="product-form" onSubmit={addVendor}>
          {message && <div className="form-message">{message}</div>}

          <div className="form-grid vendor-form-grid">
            <label className="field-group">
              <span>Vendor Name</span>
              <input
                type="text"
                value={formVendor.name}
                onChange={(event) => updateVendorField("name", event.target.value)}
                placeholder="Prime Mobile Distributors"
                required
              />
            </label>

            <label className="field-group">
              <span>Contact Person</span>
              <input
                type="text"
                value={formVendor.contactName}
                onChange={(event) => updateVendorField("contactName", event.target.value)}
                placeholder="Ifeoma Obi"
                required
              />
            </label>

            <label className="field-group">
              <span>Phone</span>
              <input
                type="tel"
                value={formVendor.phone}
                onChange={(event) => updateVendorField("phone", event.target.value)}
                placeholder="+234 803 555 0112"
                required
              />
            </label>

            <label className="field-group">
              <span>Email</span>
              <input
                type="email"
                value={formVendor.email}
                onChange={(event) => updateVendorField("email", event.target.value)}
                placeholder="orders@vendor.com"
              />
            </label>

            <label className="field-group">
              <span>Account Number</span>
              <input
                type="text"
                value={formVendor.accountNumber}
                onChange={(event) => updateVendorField("accountNumber", event.target.value)}
                placeholder="0123456789"
              />
            </label>

            <label className="field-group">
              <span>Address</span>
              <input
                type="text"
                value={formVendor.address}
                onChange={(event) => updateVendorField("address", event.target.value)}
                placeholder="18 Marina Road, Lagos"
              />
            </label>

            <label className="field-group">
              <span>Status</span>
              <select
                value={formVendor.status}
                onChange={(event) => updateVendorField("status", event.target.value)}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>

            <label className="field-group">
              <span>Notes</span>
              <input
                type="text"
                value={formVendor.notes}
                onChange={(event) => updateVendorField("notes", event.target.value)}
                placeholder="Supplies phones and accessories"
              />
            </label>
          </div>

          <div className="form-actions">
            <button className="btn-outline" type="button" onClick={() => setFormVendor(emptyVendor)}>Clear</button>
            <button className="btn-gold" type="submit"><Save /> Save Vendor</button>
          </div>
        </form>
      </section>

      <section className="section-card">
        <div className="section-header product-table-header">
          <div>
            <h2>Vendor Table</h2>
            <p>{filteredVendors.length} of {tableVendors.length} vendor{tableVendors.length === 1 ? "" : "s"}</p>
          </div>

          <label className="product-search">
            <Search />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search vendor, contact, phone, account..."
              aria-label="Search vendors"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear vendor search">
                <X />
              </button>
            )}
          </label>
        </div>

        <DataTable
          columns={["Vendor", "Contact", "Phone", "Email", "Account No.", "Status", "Address", "Notes", "Actions"]}
          rows={filteredVendors}
          rowKey={(vendor) => vendor.id}
          emptyMessage="No vendors match your search."
          tableClassName="product-data-table"
          renderRow={(vendor) => (
            <>
              <td><strong>{vendor.name}</strong></td>
              <td><span className="customer-name"><UserRound /> {vendor.contactName}</span></td>
              <td><span className="customer-name"><Phone /> {vendor.phone}</span></td>
              <td>{vendor.email ? <span className="customer-name"><Mail /> {vendor.email}</span> : "-"}</td>
              <td><span className="order-id">{vendor.accountNumber || "-"}</span></td>
              <td><span className={`status-badge ${vendor.status === "Active" ? "status-active" : "status-inactive"}`}>{vendor.status}</span></td>
              <td className="description-cell">{vendor.address ? <span className="customer-name"><MapPin /> {vendor.address}</span> : "-"}</td>
              <td className="description-cell">{vendor.notes || "-"}</td>
              <td>
                <button className="icon-button" type="button" onClick={() => deleteVendor(vendor.id)} aria-label={`Delete ${vendor.name}`}>
                  <Trash2 />
                </button>
              </td>
            </>
          )}
        />
      </section>
    </>
  );
}
