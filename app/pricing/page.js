"use client";

import { BadgeDollarSign } from "lucide-react";
import DataTable from "../components/DataTable";
import { formatNaira, products } from "../data";

function getMargin(costPrice, sellingPrice) {
  if (!sellingPrice) return 0;
  return Math.round(((sellingPrice - costPrice) / sellingPrice) * 100);
}

export default function PricingPage() {
  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h1><BadgeDollarSign /> Price Book</h1>
          <p>Track cost price, selling price, profit, and margin for each item.</p>
        </div>
      </div>

      <section className="section-card">
        <div className="section-header">
          <h2>Item Pricing</h2>
        </div>

        <DataTable
          columns={["Product", "SKU", "Category", "Cost Price", "Selling Price", "Profit", "Margin"]}
          rows={products}
          rowKey={(product) => product.id}
          emptyMessage="No pricing items to show."
          renderRow={(product) => {
            const profit = product.price - product.costPrice;
            return (
              <>
                <td><strong>{product.name}</strong></td>
                <td><span className="order-id">{product.sku}</span></td>
                <td>{product.category}</td>
                <td>{formatNaira(product.costPrice)}</td>
                <td className="gold-text">{formatNaira(product.price)}</td>
                <td className={profit >= 0 ? "profit-positive" : "profit-negative"}>{formatNaira(profit)}</td>
                <td><span className="status-badge status-delivered">{getMargin(product.costPrice, product.price)}%</span></td>
              </>
            );
          }}
        />
      </section>
    </>
  );
}
