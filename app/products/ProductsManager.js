"use client";

import { Eye, EyeOff, ImageIcon, Recycle, Search, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import DataTable from "../components/DataTable";
import { formatNaira } from "../data";
import ProductCreationDropdown from "./ProductCreationDropdown";

const productStorageKey = "retail-products";
const productUpdateEvent = "retail-products-updated";
const wasteStorageKey = "retail-waste-register";

function normalizeProduct(product) {
  return {
    ...product,
    expiryDate: product.expiryDate || "",
    frontDeskVisible: product.frontDeskVisible !== false
  };
}

function normalizeProducts(products) {
  return products.map(normalizeProduct);
}

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

function mergeBySku(currentProducts, incomingProducts) {
  const productsBySku = new Map(currentProducts.map((product) => [product.sku, product]));

  incomingProducts.forEach((product) => {
    const normalizedProduct = normalizeProduct(product);

    if (productsBySku.has(product.sku)) {
      productsBySku.set(product.sku, normalizeProduct({ ...productsBySku.get(product.sku), ...normalizedProduct }));
      return;
    }

    productsBySku.set(product.sku, normalizedProduct);
  });

  return Array.from(productsBySku.values());
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

export default function ProductsManager({ initialProducts }) {
  const [tableProducts, setTableProducts] = useState(normalizeProducts(initialProducts));
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const filteredProducts = tableProducts.filter((product) => productMatchesQuery(product, query.trim()));

  useEffect(() => {
    function loadProducts() {
      const savedProducts = localStorage.getItem(productStorageKey);
      if (!savedProducts) {
        setTableProducts(normalizeProducts(initialProducts));
        return;
      }

      try {
        setTableProducts(normalizeProducts(JSON.parse(savedProducts)));
      } catch {
        localStorage.removeItem(productStorageKey);
        setTableProducts(normalizeProducts(initialProducts));
      }
    }

    loadProducts();
    window.addEventListener("storage", loadProducts);
    window.addEventListener(productUpdateEvent, loadProducts);
    return () => {
      window.removeEventListener("storage", loadProducts);
      window.removeEventListener(productUpdateEvent, loadProducts);
    };
  }, [initialProducts]);

  function saveProducts(nextProducts) {
    const normalizedProducts = normalizeProducts(nextProducts);
    localStorage.setItem(productStorageKey, JSON.stringify(normalizedProducts));
    window.dispatchEvent(new Event(productUpdateEvent));
    return normalizedProducts;
  }

  function addProduct(product) {
    setTableProducts((currentProducts) => saveProducts(mergeBySku(currentProducts, [product])));
  }

  function importProducts(products) {
    setTableProducts((currentProducts) => saveProducts(mergeBySku(currentProducts, products)));
  }

  function toggleFrontDeskProduct(productId, productSku) {
    setTableProducts((currentProducts) => saveProducts(currentProducts.map((product) => {
      if (product.id !== productId || product.sku !== productSku) return product;
      return { ...product, frontDeskVisible: product.frontDeskVisible === false };
    })));
  }

  function permanentlyDeleteProduct(productId, productSku) {
    setTableProducts((currentProducts) => saveProducts(currentProducts.filter((product) => (
      product.id !== productId || product.sku !== productSku
    ))));
  }

  function saveWasteRecord(product, quantity) {
    let currentWaste = [];
    try {
      currentWaste = JSON.parse(localStorage.getItem(wasteStorageKey) || "[]");
    } catch {
      currentWaste = [];
    }
    const wasteRecord = {
      id: Date.now(),
      itemName: product.name,
      itemType: "Product",
      reason: getExpiryClass(product.expiryDate) ? "Expired" : "Damaged",
      quantity,
      action: "Quarantine",
      note: `Moved from inventory. SKU: ${product.sku}. Remaining stock: ${Math.max(0, Number(product.stock || 0) - quantity)}.`,
      recordedAt: new Date().toLocaleString()
    };

    localStorage.setItem(wasteStorageKey, JSON.stringify([wasteRecord, ...currentWaste]));
    return wasteRecord;
  }

  function moveProductToWaste(product) {
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

    const wasteRecord = saveWasteRecord(product, quantity);
    setTableProducts((currentProducts) => saveProducts(currentProducts.map((item) => {
      if (item.id !== product.id || item.sku !== product.sku) return item;
      return { ...item, stock: Math.max(0, Number(item.stock || 0) - quantity) };
    })));
    setMessage(`${quantity} ${wasteRecord.itemName} item${quantity === 1 ? "" : "s"} moved to waste.`);
  }

  return (
    <>
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
          columns={["Name", "SKU", "Barcode", "Expiry Date", "Description", "Images", "Attributes", "Variants", "Price", "Stock", "Front Desk", "Actions"]}
          rows={filteredProducts}
          rowKey={(product) => `${product.sku}-${product.id}`}
          emptyMessage="No products match your search."
          tableClassName="product-data-table"
          renderRow={(product) => (
            <>
              <td><strong>{product.name}</strong></td>
              <td><span className="order-id">{product.sku}</span></td>
              <td>{product.barcode || "-"}</td>
              <td className={getExpiryClass(product.expiryDate)}>{product.expiryDate || "-"}</td>
              <td className="description-cell">{product.description || "-"}</td>
              <td>
                <div className="product-table-image">
                  {getProductImage(product)
                    ? <img src={getProductImage(product)} alt={product.name} />
                    : <ImageIcon aria-label="No product image" />}
                </div>
              </td>
              <td className="description-cell">{summarizeAttributes(product.attributes)}</td>
              <td className="description-cell">{summarizeVariants(product.variants)}</td>
              <td className="gold-text">{formatNaira(product.price || 0)}</td>
              <td>{product.stock || 0}</td>
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
                    onClick={() => toggleFrontDeskProduct(product.id, product.sku)}
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
                    onClick={() => permanentlyDeleteProduct(product.id, product.sku)}
                    aria-label={`Permanently delete ${product.name}`}
                  >
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
