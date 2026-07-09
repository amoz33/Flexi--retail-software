"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useState } from "react";
import OrderCreateForm from "./OrderCreateForm";

export default function OrderCreationDropdown({ onCreateOrder }) {
  const [open, setOpen] = useState(false);

  return (
    <section className={`section-card product-create-section ${open ? "is-open" : ""}`}>
      <div className="section-header product-create-header">
        <h2>Order Creation</h2>
        <button
          className="btn-gold product-dropdown-toggle"
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <Plus /> Create Order <ChevronDown className="dropdown-chevron" />
        </button>
      </div>

      {open && <OrderCreateForm onCreateOrder={onCreateOrder} />}
    </section>
  );
}
