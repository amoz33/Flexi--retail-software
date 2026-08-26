"use client";

import { ArrowUpRight, Building2, CalendarClock, Clock, Edit, MapPin, Phone, Plus, Store, Trash2, User, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export default function OutletManager() {
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    phone: "",
    email: "",
    manager_name: "",
    opening_time: "09:00",
    closing_time: "18:00",
    is_active: true,
    settings: {}
  });

  useEffect(() => {
    loadOutlets();
  }, []);

  async function loadOutlets() {
    try {
      const data = await apiFetch("/outlets");
      setOutlets(data.outlets || []);
    } catch (error) {
      setMessage(error.message || "Could not load outlets.");
    } finally {
      setLoading(false);
    }
  }

  function updateFormField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }));
  }

  async function handleCreate(event) {
    event.preventDefault();
    
    try {
      const data = await apiFetch("/outlets", {
        method: "POST",
        body: formData
      });
      
      setOutlets((current) => [...current, data.outlet].sort((a, b) => a.name.localeCompare(b.name)));
      setMessage(`Outlet "${data.outlet.name}" created successfully.`);
      resetForm();
      setShowCreateForm(false);
    } catch (error) {
      setMessage(error.message || "Could not create outlet.");
    }
  }

  async function handleUpdate(event) {
    event.preventDefault();
    
    try {
      const data = await apiFetch(`/outlets/${editingOutlet.id}`, {
        method: "PUT",
        body: formData
      });
      
      setOutlets((current) => current.map((outlet) => 
        outlet.id === editingOutlet.id ? data.outlet : outlet
      ));
      setMessage(`Outlet "${data.outlet.name}" updated successfully.`);
      resetForm();
      setEditingOutlet(null);
    } catch (error) {
      setMessage(error.message || "Could not update outlet.");
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Are you sure you want to delete outlet "${name}"?`)) return;
    
    try {
      await apiFetch(`/outlets/${id}`, { method: "DELETE" });
      setOutlets((current) => current.filter((outlet) => outlet.id !== id));
      setMessage(`Outlet "${name}" deleted successfully.`);
    } catch (error) {
      setMessage(error.message || "Could not delete outlet.");
    }
  }

  async function toggleOutletStatus(id, currentStatus) {
    try {
      const data = await apiFetch(`/outlets/${id}/status`, {
        method: "PATCH"
      });
      
      setOutlets((current) => current.map((outlet) => 
        outlet.id === id ? data.outlet : outlet
      ));
      setMessage(`Outlet status updated successfully.`);
    } catch (error) {
      setMessage(error.message || "Could not update outlet status.");
    }
  }

  function startEdit(outlet) {
    setEditingOutlet(outlet);
    setFormData({
      name: outlet.name,
      code: outlet.code,
      address: outlet.address || "",
      city: outlet.city || "",
      state: outlet.state || "",
      phone: outlet.phone || "",
      email: outlet.email || "",
      manager_name: outlet.manager_name || "",
      opening_time: outlet.opening_time || "09:00",
      closing_time: outlet.closing_time || "18:00",
      is_active: outlet.is_active,
      settings: outlet.settings || {}
    });
  }

  function resetForm() {
    setFormData({
      name: "",
      code: "",
      address: "",
      city: "",
      state: "",
      phone: "",
      email: "",
      manager_name: "",
      opening_time: "09:00",
      closing_time: "18:00",
      is_active: true,
      settings: {}
    });
  }

  function formatTime(time) {
    if (!time) return "Not set";
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  if (loading) return <div>Loading outlets...</div>;

  return (
    <>
      <style jsx>{`
        .outlet-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
          margin-top: 24px;
        }
        .outlet-card {
          position: relative;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 22px;
          background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
          box-shadow: 0 8px 24px rgba(15, 23, 42, .05);
          transition: transform .2s, box-shadow .2s, border-color .2s;
        }
        .outlet-card:hover {
          transform: translateY(-3px);
          border-color: #d4a72c;
          box-shadow: 0 16px 30px rgba(15, 23, 42, .1);
        }
        .outlet-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 18px;
        }
        .outlet-title {
          display: block;
          font-size: 20px;
          font-weight: 750;
          color: #172033;
          margin-bottom: 8px;
        }
        .outlet-code {
          font-size: 12px;
          color: #6b7280;
          background: #eef2f7;
          padding: 2px 8px;
          border-radius: 5px;
          margin-left: 0;
        }
        .outlet-status {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          margin-left: 8px;
        }
        .status-active {
          background-color: #dcfce7;
          color: #166534;
        }
        .status-inactive {
          background-color: #fee2e2;
          color: #991b1b;
        }
        .outlet-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 14px;
          color: #64748b;
        }
        .outlet-info-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .outlet-actions {
          display: flex;
          gap: 8px;
          margin-top: 22px;
          flex-wrap: wrap;
        }
        .hours-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #ecfeff;
          color: #0e7490;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          margin-top: 4px;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: white;
          border-radius: 8px;
          padding: 28px;
          max-width: 620px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin: 20px 0;
        }
        .field-span-2 {
          grid-column: span 2;
        }
      `}</style>

      <section className="section-card">
        <div className="section-header">
          <div>
            <h2><Store /> Outlet Management</h2>
            <p>Manage multiple retail outlets across different locations</p>
          </div>
          <button className="btn-gold" type="button" onClick={() => setShowCreateForm(true)}>
            <Plus /> Add New Outlet
          </button>
        </div>

        {message && <div className="front-desk-message">{message}</div>}

        <div className="outlet-grid">
          {outlets.map((outlet) => (
            <div className="outlet-card" key={outlet.id}>
              <div className="outlet-header">
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '7px' }}>
                    <span className="outlet-title">{outlet.name}</span>
                    <span className="outlet-code">{outlet.code}</span>
                    <span className={`outlet-status ${outlet.is_active ? 'status-active' : 'status-inactive'}`}>
                      {outlet.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="hours-badge">
                    <Clock size={12} />
                    {formatTime(outlet.opening_time)} - {formatTime(outlet.closing_time)}
                  </div>
                </div>
              </div>

              <div className="outlet-info">
                {outlet.address && (
                  <div className="outlet-info-row">
                    <MapPin size={14} />
                    <span>{outlet.address}, {outlet.city}{outlet.state ? `, ${outlet.state}` : ''}</span>
                  </div>
                )}
                {outlet.phone && (
                  <div className="outlet-info-row">
                    <Phone size={14} />
                    <span>{outlet.phone}</span>
                  </div>
                )}
                {outlet.email && (
                  <div className="outlet-info-row">
                    <Building2 size={14} />
                    <span>{outlet.email}</span>
                  </div>
                )}
                {outlet.manager_name && (
                  <div className="outlet-info-row">
                    <User size={14} />
                    <span>Manager: {outlet.manager_name}</span>
                  </div>
                )}
              </div>

              <div className="outlet-actions">
                <Link className="btn-gold" href={`/outlets/${outlet.id}`}>
                  <ArrowUpRight size={14} /> Open Workspace
                </Link>
                <button className="btn-outline" type="button" onClick={() => startEdit(outlet)}>
                  <Edit size={14} /> Edit
                </button>
                <button className="btn-outline" type="button" onClick={() => toggleOutletStatus(outlet.id, outlet.is_active)}>
                  {outlet.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button className="btn-outline" type="button" onClick={() => handleDelete(outlet.id, outlet.name)} style={{ color: '#ef4444' }}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {(showCreateForm || editingOutlet) && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="section-header">
              <h2>{editingOutlet ? 'Edit Outlet' : 'Create New Outlet'}</h2>
              <button className="icon-button" type="button" onClick={() => {
                if (editingOutlet) setEditingOutlet(null);
                else setShowCreateForm(false);
                resetForm();
              }}>
                <X />
              </button>
            </div>

            <form onSubmit={editingOutlet ? handleUpdate : handleCreate}>
              <div className="form-grid">
                <label className="field-group">
                  <span>Outlet Name*</span>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateFormField('name', e.target.value)}
                    required
                    placeholder="Main Store"
                  />
                </label>

                <label className="field-group">
                  <span>Outlet Code*</span>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => updateFormField('code', e.target.value)}
                    required
                    placeholder="STORE-001"
                  />
                </label>

                <label className="field-group field-span-2">
                  <span>Address</span>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => updateFormField('address', e.target.value)}
                    placeholder="123 Main Street"
                  />
                </label>

                <label className="field-group">
                  <span>City</span>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => updateFormField('city', e.target.value)}
                    placeholder="Lagos"
                  />
                </label>

                <label className="field-group">
                  <span>State</span>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => updateFormField('state', e.target.value)}
                    placeholder="Lagos State"
                  />
                </label>

                <label className="field-group">
                  <span>Phone</span>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => updateFormField('phone', e.target.value)}
                    placeholder="+234800000000"
                  />
                </label>

                <label className="field-group">
                  <span>Email</span>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormField('email', e.target.value)}
                    placeholder="store@company.com"
                  />
                </label>

                <label className="field-group">
                  <span>Manager Name</span>
                  <input
                    type="text"
                    value={formData.manager_name}
                    onChange={(e) => updateFormField('manager_name', e.target.value)}
                    placeholder="John Doe"
                  />
                </label>

                <label className="field-group">
                  <span>Opening Time</span>
                  <input
                    type="time"
                    value={formData.opening_time}
                    onChange={(e) => updateFormField('opening_time', e.target.value)}
                  />
                </label>

                <label className="field-group">
                  <span>Closing Time</span>
                  <input
                    type="time"
                    value={formData.closing_time}
                    onChange={(e) => updateFormField('closing_time', e.target.value)}
                  />
                </label>

                <label className="field-group" style={{ gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => updateFormField('is_active', e.target.checked)}
                      id="is_active"
                    />
                    <label htmlFor="is_active" style={{ margin: 0 }}>Active Outlet</label>
                  </div>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button className="btn-outline" type="button" onClick={() => {
                  if (editingOutlet) setEditingOutlet(null);
                  else setShowCreateForm(false);
                  resetForm();
                }}>
                  Cancel
                </button>
                <button className="btn-gold" type="submit">
                  {editingOutlet ? 'Update Outlet' : 'Create Outlet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}