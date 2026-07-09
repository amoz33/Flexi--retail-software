"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useState } from "react";
import ProductCreateForm from "./ProductCreateForm";

export default function ProductCreationDropdown({ onCreateProduct, onImportProducts }) {
  const [open, setOpen] = useState(false);

  return (
    <section className={`section-card product-create-section ${open ? "is-open" : ""}`}>
      <div className="section-header product-create-header">
        <div>
          <h2>Admin Product Creation</h2>
          <p>Add products here so front desk can see current names, prices, and stock.</p>
        </div>
        <button
          className="btn-gold product-dropdown-toggle"
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <Plus /> Create Product <ChevronDown className="dropdown-chevron" />
        </button>
      </div>

      {open && <ProductCreateForm onCreateProduct={onCreateProduct} onImportProducts={onImportProducts} />}
    </section>
  );
}
