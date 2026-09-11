"use client";

import { BadgeDollarSign, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import DataTable from "../components/DataTable";
import { formatNaira } from "../data";
import { apiFetch } from "../lib/api";

function getMargin(costPrice, sellingPrice) {
  if (!sellingPrice) return 0;
  return Math.round(((sellingPrice - costPrice) / sellingPrice) * 100);
}

export default function PricingPage() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        const data = await apiFetch("/products");
        if (!cancelled) setProducts(data.products || []);
      } catch (error) {
        if (!cancelled) setMessage(error.message || "Could not load pricing.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProducts();
    return () => { cancelled = true; };
  }, []);

  const categories = useMemo(() => {
    const unique = new Set(products.map((product) => product.category).filter(Boolean));
    return ["All", ...Array.from(unique)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesQuery = !normalizedQuery
        || product.name?.toLowerCase().includes(normalizedQuery)
        || product.sku?.toLowerCase().includes(normalizedQuery);
      const matchesCategory = categoryFilter === "All" || product.category === categoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [products, query, categoryFilter]);

  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h1><BadgeDollarSign /> Price Book</h1>
          <p>Track cost price, selling price, profit, and margin for each item.</p>
        </div>
      </div>

      <section className="section-card">
        <div className="section-header product-table-header">
          <div>
            <h2>Item Pricing</h2>
            <p>{filteredProducts.length} item{filteredProducts.length === 1 ? "" : "s"}</p>
          </div>

          <label className="product-search">
            <Search />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search product or SKU..."
              aria-label="Search price book"
            />
          </label>

          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {message && <div className="front-desk-message">{message}</div>}

        <DataTable
          columns={["Product", "SKU", "Category", "Cost Price", "Selling Price", "Profit", "Margin"]}
          rows={filteredProducts}
          rowKey={(product) => product.id}
          emptyMessage={loading ? "Loading pricing..." : "No pricing items to show."}
          renderRow={(product) => {
            const costPrice = Number(product.costPrice || 0);
            const price = Number(product.price || 0);
            const profit = price - costPrice;
            return (
              <>
                <td><strong>{product.name}</strong></td>
                <td><span className="order-id">{product.sku}</span></td>
                <td>{product.category || "-"}</td>
                <td>{formatNaira(costPrice)}</td>
                <td className="gold-text">{formatNaira(price)}</td>
                <td className={profit >= 0 ? "profit-positive" : "profit-negative"}>{formatNaira(profit)}</td>
                <td><span className="status-badge status-delivered">{getMargin(costPrice, price)}%</span></td>
              </>
            );
          }}
        />
      </section>
    </>
  );
}
