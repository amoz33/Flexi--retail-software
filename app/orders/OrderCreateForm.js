"use client";

import { Save } from "lucide-react";
import { useState } from "react";
import { apiFetch } from "../lib/api";

export default function OrderCreateForm({ onCreateOrder }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const itemName = formData.get("itemName")?.trim();
    const total = Number(formData.get("total") || 0);

    if (!itemName || total <= 0) {
      setError("Enter what was sold and a valid amount.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const data = await apiFetch("/orders", {
        method: "POST",
        body: {
          source: "Manual Entry",
          customer: {
            name: formData.get("customer")?.trim(),
            phone: formData.get("phone")?.trim() || null,
            email: formData.get("email")?.trim() || null,
            address: formData.get("address")?.trim() || null
          },
          delivery_option: formData.get("deliveryOption") || "Pickup",
          payment_method: formData.get("paymentMethod") || null,
          payment_status: "Paid",
          items: [{ name: itemName, sku: null, price: total, quantity: 1 }],
          subtotal: total,
          delivery_fee: 0,
          total
        }
      });

      onCreateOrder(data.order);
      form.reset();
    } catch (err) {
      setError(err.message || "Could not save the order.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="product-form order-form" onSubmit={handleSubmit}>
      {error && <div className="front-desk-message">{error}</div>}

      <div className="form-grid order-form-grid">
        <label className="field-group">
          <span>Customer Name</span>
          <input type="text" name="customer" placeholder="Customer name" required />
        </label>

        <label className="field-group">
          <span>Phone</span>
          <input type="text" name="phone" placeholder="0803..." />
        </label>

        <label className="field-group">
          <span>Email</span>
          <input type="email" name="email" placeholder="customer@email.com" />
        </label>

        <label className="field-group field-span-2">
          <span>Item / Description</span>
          <input type="text" name="itemName" placeholder="e.g. JAAF Rice 25kg" required />
        </label>

        <label className="field-group">
          <span>Amount (₦)</span>
          <input type="number" name="total" min="1" step="0.01" placeholder="45000" required />
        </label>

        <label className="field-group">
          <span>Delivery Option</span>
          <select name="deliveryOption" defaultValue="Pickup">
            <option>Pickup</option>
            <option>Home Delivery</option>
          </select>
        </label>

        <label className="field-group">
          <span>Payment Method</span>
          <select name="paymentMethod" defaultValue="Cash">
            <option>Cash</option>
            <option>Transfer</option>
            <option>POS</option>
          </select>
        </label>

        <label className="field-group field-span-2">
          <span>Address (optional)</span>
          <input type="text" name="address" placeholder="Delivery address" />
        </label>
      </div>

      <div className="form-actions">
        <button className="btn-outline" type="reset" disabled={saving}>Clear</button>
        <button className="btn-gold" type="submit" disabled={saving}><Save /> {saving ? "Saving..." : "Save Order"}</button>
      </div>
    </form>
  );
}