"use client";

import { Minus, PackageCheck, Search, ShoppingCart, X } from "lucide-react";
import { useEffect, useState } from "react";
import DataTable from "../components/DataTable";
import { formatNaira } from "../data";

const productStorageKey = "retail-products";
const productUpdateEvent = "retail-products-updated";
const receiptStorageKey = "retail-last-receipt";
const receiptHistoryStorageKey = "retail-receipt-history";
const receiptHistoryUpdateEvent = "retail-receipt-history-updated";

function normalizeProduct(product) {
  return {
    ...product,
    frontDeskVisible: product.frontDeskVisible !== false
  };
}

function normalizeProducts(products) {
  return products.map(normalizeProduct);
}

function productMatchesQuery(product, query) {
  if (!query) return true;

  const searchableText = [
    product.name,
    product.sku,
    product.barcode,
    product.category,
    product.description,
    product.expiryDate,
    product.price,
    product.stock
  ].filter(Boolean).join(" ").toLowerCase();

  return searchableText.includes(query.toLowerCase());
}

export default function FrontDeskProducts({ initialProducts }) {
  const [products, setProducts] = useState(normalizeProducts(initialProducts));
  const [query, setQuery] = useState("");
  const [saleQuantities, setSaleQuantities] = useState({});
  const [message, setMessage] = useState("");
  const frontDeskProducts = products.filter((product) => product.frontDeskVisible !== false);
  const filteredProducts = frontDeskProducts.filter((product) => productMatchesQuery(product, query.trim()));

  useEffect(() => {
    function loadProducts() {
      const savedProducts = localStorage.getItem(productStorageKey);
      if (!savedProducts) {
        setProducts(normalizeProducts(initialProducts));
        return;
      }

      try {
        setProducts(normalizeProducts(JSON.parse(savedProducts)));
      } catch {
        localStorage.removeItem(productStorageKey);
        setProducts(normalizeProducts(initialProducts));
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

  function updateSaleQuantity(productKey, value) {
    setSaleQuantities((currentQuantities) => ({
      ...currentQuantities,
      [productKey]: value
    }));
  }

  function sellProduct(product) {
    const productKey = `${product.sku}-${product.id}`;
    const quantity = Math.max(1, Number(saleQuantities[productKey] || 1));
    const currentStock = Number(product.stock || 0);

    if (currentStock <= 0) {
      setMessage(`${product.name} is out of stock.`);
      return;
    }

    if (quantity > currentStock) {
      setMessage(`Only ${currentStock} ${product.name} available.`);
      return;
    }

    setProducts((currentProducts) => saveProducts(currentProducts.map((currentProduct) => {
      if (currentProduct.id !== product.id || currentProduct.sku !== product.sku) return currentProduct;
      return { ...currentProduct, stock: currentStock - quantity, soldCount: Number(currentProduct.soldCount || 0) + quantity };
    })));

    const receipt = {
      id: `QSL-${String(Date.now()).slice(-6)}`,
      customerName: "Walk-in Customer",
      customerPhone: "",
      paymentMethod: "Quick Sale",
      items: [{
        cartKey: productKey,
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: Number(product.price || 0),
        quantity
      }],
      subtotal: Number(product.price || 0) * quantity,
      discount: 0,
      total: Number(product.price || 0) * quantity,
      cashier: "Front Desk Quick Sale",
      createdAt: new Date().toLocaleString()
    };

    let receiptHistory = [];
    try {
      receiptHistory = JSON.parse(localStorage.getItem(receiptHistoryStorageKey) || "[]");
    } catch {
      receiptHistory = [];
    }
    localStorage.setItem(receiptStorageKey, JSON.stringify(receipt));
    localStorage.setItem(receiptHistoryStorageKey, JSON.stringify([receipt, ...receiptHistory]));
    window.dispatchEvent(new Event(receiptHistoryUpdateEvent));

    setMessage(`${quantity} ${product.name} sold. Inventory stock was reduced and the sale was recorded.`);
    updateSaleQuantity(productKey, "1");
  }

  return (
    <section className="section-card">
      <div className="section-header product-table-header">
        <div>
          <h2><PackageCheck /> Products and Prices</h2>
          <p>{filteredProducts.length} of {frontDeskProducts.length} front desk product{frontDeskProducts.length === 1 ? "" : "s"}</p>
        </div>

        <label className="product-search">
          <Search />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search product, SKU, price..."
            aria-label="Search front desk products"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear front desk product search">
              <X />
            </button>
          )}
        </label>
      </div>

      {message && <div className="front-desk-message">{message}</div>}

      <DataTable
        columns={["Product", "SKU", "Category", "Expiry Date", "Price", "Stock", "Availability", "Sell"]}
        rows={filteredProducts}
        rowKey={(product) => `${product.sku}-${product.id}`}
        emptyMessage="No products match your search."
        tableClassName="product-data-table"
        renderRow={(product) => {
          const productKey = `${product.sku}-${product.id}`;
          const stock = Number(product.stock || 0);

          return (
            <>
              <td><strong>{product.name}</strong></td>
              <td><span className="order-id">{product.sku}</span></td>
              <td>{product.category || "-"}</td>
              <td>{product.expiryDate || "-"}</td>
              <td className="gold-text">{formatNaira(product.price || 0)}</td>
              <td>{stock}</td>
              <td>
                <span className={`status-badge ${stock > 0 ? "status-active" : "status-pending"}`}>
                  {stock > 0 ? "In Stock" : "Out of Stock"}
                </span>
              </td>
              <td>
                <div className="front-desk-sale-controls">
                  <button
                    className="icon-button sale-stepper"
                    type="button"
                    onClick={() => updateSaleQuantity(productKey, String(Math.max(1, Number(saleQuantities[productKey] || 1) - 1)))}
                    aria-label={`Reduce ${product.name} sale quantity`}
                  >
                    <Minus />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={stock || 1}
                    value={saleQuantities[productKey] || "1"}
                    onChange={(event) => updateSaleQuantity(productKey, event.target.value)}
                    aria-label={`${product.name} sale quantity`}
                  />
                  <button
                    className="btn-gold front-desk-sell-button"
                    type="button"
                    onClick={() => sellProduct(product)}
                    disabled={stock <= 0}
                  >
                    <ShoppingCart /> Sell
                  </button>
                </div>
              </td>
            </>
          );
        }}
      />
    </section>
  );
}
