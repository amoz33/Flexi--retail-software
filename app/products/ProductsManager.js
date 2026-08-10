"use client";

import { Eye, EyeOff, ImageIcon, Pencil, Recycle, Search, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import DataTable from "../components/DataTable";
import { formatNaira } from "../data";
import { apiFetch } from "../lib/api";
import ProductCreationDropdown from "./ProductCreationDropdown";

function summarizeAttributes(attributes = []) {
  const validAttributes = attributes.filter((attribute) => attribute.name || attribute.value);
  if (!validAttributes.length) return "None";
  return validAttributes.map((attribute) => `${attribute.name}: ${attribute.value}`).join(", ");
}

function summarizeVariants(variants = []) {
  const validVariants = variants.filter((variant) => variant.name || variant.sku);
  if (!validVariants.length) return "None";
  return validVariants.map((variant) => variant.name || variant.sku).join(", ");
}

function productMatchesQuery(product, query) {
  if (!query) return true;

  const searchableText = [
    product.name,
    product.sku,
    product.barcode,
    product.description,
    product.expiryDate,
    product.price,
    product.stock,
    summarizeAttributes(product.attributes),
    summarizeVariants(product.variants),
    ...(product.images || [])
  ].filter(Boolean).join(" ").toLowerCase();

  return searchableText.includes(query.toLowerCase());
}

function getExpiryClass(expiryDate) {
  if (!expiryDate) return "";
  const date = new Date(`${expiryDate}T23:59:59`);
  if (Number.isNaN(date.getTime())) return "";
  const warningDate = new Date();
  warningDate.setMonth(warningDate.getMonth() + 3);
  return date <= warningDate ? "product-expiry-danger" : "";
}

function getProductImage(product) {
  const image = product.images?.[0];
  if (!image) return "";
  return /^(data:image\/|https?:\/\/|\/)/i.test(image) ? image : "";
}

export default function ProductsManager() {
  const [tableProducts, setTableProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const filteredProducts = tableProducts.filter((product) => productMatchesQuery(product, query.trim()));

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        const data = await apiFetch("/products");
        if (!cancelled) setTableProducts(data.products || []);
      } catch (error) {
        if (!cancelled) setMessage(error.message || "Could not load products.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProducts();
    return () => { cancelled = true; };
  }, []);

  async function addProduct(product) {
    try {
      const data = await apiFetch("/products", { method: "POST", body: product });
      setTableProducts((current) => {
        const others = current.filter((item) => item.sku !== data.product.sku);
        return [...others, data.product].sort((a, b) => a.name.localeCompare(b.name));
      });
      setMessage(`${data.product.name} saved.`);
    } catch (error) {
      setMessage(error.message || "Could not save product.");
    }
  }

  async function importProducts(products) {
    try {
      const data = await apiFetch("/products/import", { method: "POST", body: { products } });
      const imported = data.products || [];
      setTableProducts((current) => {
        const bySku = new Map(current.map((item) => [item.sku, item]));
        imported.forEach((item) => bySku.set(item.sku, item));
        return Array.from(bySku.values()).sort((a, b) => a.name.localeCompare(b.name));
      });
      setMessage(`${imported.length} product${imported.length === 1 ? "" : "s"} imported.`);
    } catch (error) {
      setMessage(error.message || "Could not import products.");
    }
  }

  async function toggleFrontDeskProduct(product) {
    try {
      const data = await apiFetch(`/products/${product.id}`, {
        method: "PUT",
        body: { frontDeskVisible: product.frontDeskVisible === false }
      });
      setTableProducts((current) => current.map((item) => (item.id === product.id ? data.product : item)));
    } catch (error) {
      setMessage(error.message || "Could not update product.");
    }
  }

  async function permanentlyDeleteProduct(product) {
    if (!window.confirm(`Permanently delete ${product.name}? This cannot be undone.`)) return;

    try {
      await apiFetch(`/products/${product.id}`, { method: "DELETE" });
      setTableProducts((current) => current.filter((item) => item.id !== product.id));
      setMessage(`${product.name} deleted.`);
    } catch (error) {
      setMessage(error.message || "Could not delete product.");
    }
  }

  function openEditModal(product) {
    setEditingProduct(product);
    setEditForm({
      name: product.name || "",
      sku: product.sku || "",
      barcode: product.barcode || "",
      expiryDate: product.expiryDate || "",
      description: product.description || "",
      price: product.price ?? 0,
      costPrice: product.costPrice ?? 0,
      stock: product.stock ?? 0
    });
  }

  function closeEditModal() {
    setEditingProduct(null);
    setEditForm(null);
  }

  function updateEditField(field, value) {
    setEditForm((current) => ({ ...current, [field]: value }));
  }

  async function saveEdit(event) {
    event.preventDefault();
    if (!editingProduct || !editForm) return;

    if (!editForm.name.trim() || !editForm.sku.trim()) {
      setMessage("Product name and SKU are required.");
      return;
    }

    setSavingEdit(true);
    try {
      const data = await apiFetch(`/products/${editingProduct.id}`, {
        method: "PUT",
        body: {
          name: editForm.name.trim(),
          sku: editForm.sku.trim(),
          barcode: editForm.barcode.trim() || null,
          expiryDate: editForm.expiryDate || null,
          description: editForm.description.trim() || null,
          price: Number(editForm.price) || 0,
          costPrice: Number(editForm.costPrice) || 0,
          stock: Math.max(0, Math.round(Number(editForm.stock) || 0))
        }
      });
      setTableProducts((current) => current.map((item) => (item.id === editingProduct.id ? data.product : item)));
      setMessage(`${data.product.name} updated.`);
      closeEditModal();
    } catch (error) {
      setMessage(error.message || "Could not update product.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function moveProductToWaste(product) {
    const stock = Number(product.stock || 0);
    if (stock <= 0) {
      setMessage(`${product.name} has no stock available to move to waste.`);
      return;
    }

    const answer = window.prompt(`Move how many ${product.name} to waste? Enter 1-${stock}, or type "all".`, "1");
    if (!answer) return;

    const quantity = answer.trim().toLowerCase() === "all"
      ? stock
      : Math.max(1, Math.min(stock, Number(answer || 1)));

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setMessage("Enter a valid waste quantity.");
      return;
    }

    try {
      const data = await apiFetch("/waste", {
        method: "POST",
        body: {
          itemName: product.name,
          itemType: "Product",
          reason: getExpiryClass(product.expiryDate) ? "Expired" : "Damaged",
          quantity,
          action: "Quarantine",
          note: `Moved from inventory. SKU: ${product.sku}.`,
          productId: product.id
        }
      });

      setTableProducts((current) => current.map((item) => {
        if (item.id !== product.id) return item;
        return { ...item, stock: typeof data.productStock === "number" ? data.productStock : Math.max(0, stock - quantity) };
      }));
      setMessage(`${quantity} ${product.name} item${quantity === 1 ? "" : "s"} moved to waste.`);
    } catch (error) {
      setMessage(error.message || "Could not move stock to waste.");
    }
  }

  return (
    <>
      <style jsx>{`
        .margin-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        .margin-high {
          background-color: #10b981;
          color: white;
        }
        .margin-medium {
          background-color: #f59e0b;
          color: white;
        }
        .margin-low {
          background-color: #ef4444;
          color: white;
        }
        .cost-text {
          color: #6b7280;
          font-weight: 500;
        }
        .gold-text {
          color: #d97706;
          font-weight: 600;
        }
      `}</style>
      <ProductCreationDropdown onCreateProduct={addProduct} onImportProducts={importProducts} />

      <section className="section-card">
        <div className="section-header product-table-header">
          <div>
            <h2>Product Table</h2>
            <p>Admin inventory: {filteredProducts.length} of {tableProducts.length} product{tableProducts.length === 1 ? "" : "s"}</p>
          </div>

          <label className="product-search">
            <Search />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, SKU, barcode, attributes..."
              aria-label="Search products"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear product search">
                <X />
              </button>
            )}
          </label>
        </div>

        {message && <div className="front-desk-message">{message}</div>}

        <DataTable
          columns={["Name", "SKU", "Category", "Barcode", "Expiry Date", "Cost Price", "Selling Price", "Margin", "Stock", "Attributes", "Front Desk", "Actions"]}
          rows={filteredProducts}
          rowKey={(product) => `${product.sku}-${product.id}`}
          emptyMessage={loading ? "Loading products..." : "No products match your search."}
          tableClassName="product-data-table"
          renderRow={(product) => {
            const costPrice = product.costPrice || 0;
            const sellingPrice = product.price || 0;
            const margin = sellingPrice > 0 ? ((sellingPrice - costPrice) / sellingPrice * 100).toFixed(1) : 0;
            const marginClass = margin >= 30 ? "margin-high" : margin >= 15 ? "margin-medium" : "margin-low";
            
            return (
              <>
                <td><strong>{product.name}</strong></td>
                <td><span className="order-id">{product.sku}</span></td>
                <td>{product.category || "General"}</td>
                <td>{product.barcode || "-"}</td>
                <td className={getExpiryClass(product.expiryDate)}>{product.expiryDate || "-"}</td>
                <td className="cost-text">{formatNaira(costPrice)}</td>
                <td className="gold-text">{formatNaira(sellingPrice)}</td>
                <td><span className={`margin-badge ${marginClass}`}>{margin}%</span></td>
                <td>{product.stock || 0}</td>
                <td className="description-cell">{summarizeAttributes(product.attributes)}</td>
                <td>
                  <span className={`status-badge ${product.frontDeskVisible === false ? "status-inactive" : "status-active"}`}>
                    {product.frontDeskVisible === false ? "Hidden" : "Visible"}
                  </span>
                </td>
                <td>
                  <div className="product-action-buttons">
                    <button
                      className="btn-outline product-row-button"
                      type="button"
                      onClick={() => openEditModal(product)}
                    >
                      <Pencil />
                      Edit
                    </button>
                    <button
                      className="btn-outline product-row-button"
                      type="button"
                      onClick={() => toggleFrontDeskProduct(product)}
                    >
                      {product.frontDeskVisible === false ? <Eye /> : <EyeOff />}
                      {product.frontDeskVisible === false ? "Add to Front Desk" : "Remove from Front Desk"}
                    </button>
                    <button
                      className="btn-outline product-row-button waste-action-button"
                      type="button"
                      onClick={() => moveProductToWaste(product)}
                    >
                      <Recycle />
                      Move to Waste
                    </button>
                    <button
                      className="icon-button"
                      type="button"
                      onClick={() => permanentlyDeleteProduct(product)}
                      aria-label={`Permanently delete ${product.name}`}
                    >
                      <Trash2 />
                    </button>
                  </div>
                </td>
              </>
            );
          }}
        />
      </section>
      {/* <!-- Edit Product Modal --> */}
      {editingProduct && editForm && (
        <div className="product-edit-overlay" role="dialog" aria-modal="true" aria-label={`Edit ${editingProduct.name}`}>
          <div className="product-edit-modal section-card">
            <div className="section-header">
              <h2>Edit Product</h2>
              <button className="icon-button" type="button" onClick={closeEditModal} aria-label="Close edit form">
                <X />
              </button>
            </div>

            <form className="product-edit-form" onSubmit={saveEdit}>
              <label className="field-group">
                <span>Name</span>
                <input type="text" value={editForm.name} onChange={(e) => updateEditField("name", e.target.value)} required />
              </label>
              <label className="field-group">
                <span>SKU</span>
                <input type="text" value={editForm.sku} onChange={(e) => updateEditField("sku", e.target.value)} required />
              </label>
              <label className="field-group">
                <span>Barcode</span>
                <input type="text" value={editForm.barcode} onChange={(e) => updateEditField("barcode", e.target.value)} />
              </label>
              <label className="field-group">
                <span>Expiry Date</span>
                <input type="date" value={editForm.expiryDate} onChange={(e) => updateEditField("expiryDate", e.target.value)} />
              </label>
              <label className="field-group">
                <span>Description</span>
                <textarea rows={3} value={editForm.description} onChange={(e) => updateEditField("description", e.target.value)} />
              </label>
              <label className="field-group">
                <span>Cost Price (₦)</span>
                <input type="number" min="0" step="0.01" value={editForm.costPrice} onChange={(e) => updateEditField("costPrice", e.target.value)} />
              </label>
              <label className="field-group">
                <span>Selling Price (₦)</span>
                <input type="number" min="0" step="0.01" value={editForm.price} onChange={(e) => updateEditField("price", e.target.value)} />
              </label>
              <label className="field-group">
                <span>Stock</span>
                <input type="number" min="0" step="1" value={editForm.stock} onChange={(e) => updateEditField("stock", e.target.value)} />
              </label>

              <div className="product-edit-actions">
                <button className="btn-outline" type="button" onClick={closeEditModal} disabled={savingEdit}>Cancel</button>
                <button className="btn-gold" type="submit" disabled={savingEdit}>{savingEdit ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}