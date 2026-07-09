"use client";

import { Save } from "lucide-react";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseOrderDate(value) {
  if (!value) return { date: "Today", month: "Jan", monthIdx: 0 };

  const orderDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(orderDate.getTime())) return { date: value, month: "Jan", monthIdx: 0 };

  const monthIdx = orderDate.getMonth();
  return {
    date: `${months[monthIdx]} ${orderDate.getDate()}`,
    month: months[monthIdx],
    monthIdx
  };
}

function defaultProgress(status) {
  if (status === "Delivered") return 100;
  if (status === "Shipped") return 65;
  return 20;
}

export default function OrderCreateForm({ onCreateOrder }) {
  function handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const status = formData.get("status");
    const progressValue = Number(formData.get("progress"));
    const parsedDate = parseOrderDate(formData.get("date"));
    const id = formData.get("id")?.trim() || `ORD-${String(Date.now()).slice(-6)}`;

    onCreateOrder({
      id,
      customer: formData.get("customer")?.trim(),
      total: Number(formData.get("total") || 0),
      status,
      progress: Number.isFinite(progressValue) && progressValue >= 0 ? progressValue : defaultProgress(status),
      ...parsedDate
    });

    event.currentTarget.reset();
  }

  return (
    <form className="product-form order-form" onSubmit={handleSubmit}>
      <div className="form-grid order-form-grid">
        <label className="field-group">
          <span>Order ID</span>
          <input type="text" name="id" placeholder="ORD-013" />
        </label>

        <label className="field-group">
          <span>Customer</span>
          <input type="text" name="customer" placeholder="Customer name" required />
        </label>

        <label className="field-group">
          <span>Price</span>
          <input type="number" name="total" min="0" placeholder="250000" required />
        </label>

        <label className="field-group">
          <span>Status</span>
          <select name="status" defaultValue="Pending">
            <option>Pending</option>
            <option>Shipped</option>
            <option>Delivered</option>
          </select>
        </label>

        <label className="field-group">
          <span>Progress</span>
          <input type="number" name="progress" min="0" max="100" placeholder="20" />
        </label>

        <label className="field-group">
          <span>Date</span>
          <input type="date" name="date" />
        </label>
      </div>

      <div className="form-actions">
        <button className="btn-outline" type="reset">Clear</button>
        <button className="btn-gold" type="submit"><Save /> Save Order</button>
      </div>
    </form>
  );
}
