"use client";

import { Minus, PackageCheck, Search, ShoppingCart, X } from "lucide-react";
import { useEffect, useState } from "react";
import DataTable from "../components/DataTable";
import { formatNaira } from "../data";
import { apiFetch } from "../lib/api";

const receiptStorageKey = "retail-last-receipt";

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

export default function FrontDeskProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [saleQuantities, setSaleQuantities] = useState({});
  const [message, setMessage] = useState("");
  const [sellingKey, setSellingKey] = useState(null);

  const frontDeskProducts = products.filter((product) => product.frontDeskVisible !== false);
  const filteredProducts = frontDeskProducts.filter((product) => productMatchesQuery(product, query.trim()));

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        const data = await apiFetch("/products");
        if (!cancelled) setProducts(data.products || []);
      } catch (error) {
        if (!cancelled) setMessage(error.message || "Could not load products.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProducts();
    return () => { cancelled = true; };
  }, []);

  function updateSaleQuantity(productKey, value) {
    setSaleQuantities((currentQuantities) => ({
      ...currentQuantities,
      [productKey]: value
    }));
  }

  async function sellProduct(product) {
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

    setSellingKey(productKey);
    try {
      const data = await apiFetch("/sales", {
        method: "POST",
        body: {
          customer_name: "",
          customer_phone: null,
          payment_method: "Cash",
          discount: 0,
          items: [{ productId: product.id, quantity }]
        }
      });

      localStorage.setItem(receiptStorageKey, JSON.stringify(data.sale));

      setProducts((currentProducts) => currentProducts.map((item) => {
        if (item.id !== product.id) return item;
        return {
          ...item,
          stock: Math.max(0, Number(item.stock || 0) - quantity),
          soldCount: Number(item.soldCount || 0) + quantity
        };
      }));

      setMessage(`${quantity} ${product.name} sold. ${data.sale.id} saved and stock reduced.`);
      updateSaleQuantity(productKey, "1");
    } catch (error) {
      setMessage(error.message || "Sale could not be completed.");
    } finally {
      setSellingKey(null);
    }
  }

  return (
    <section className="section-card">
      <div className="section-header product-table-header">
        <div>
          <h2><PackageCheck /> Products and Prices</h2>
          <p>{loading ? "Loading products..." : `${filteredProducts.length} of ${frontDeskProducts.length} front desk product${frontDeskProducts.length === 1 ? "" : "s"}`}</p>
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
        emptyMessage={loading ? "Loading products..." : "No products match your search."}
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
                    disabled={stock <= 0 || sellingKey === productKey}
                  >
                    <ShoppingCart /> {sellingKey === productKey ? "..." : "Sell"}
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
