"use client";

import { ChevronDown, History } from "lucide-react";
import { useEffect, useState } from "react";
import DataTable from "../components/DataTable";
import { formatNaira } from "../data";

const receiptHistoryStorageKey = "retail-receipt-history";
const receiptHistoryUpdateEvent = "retail-receipt-history-updated";

export default function FrontDeskSalesHistory() {
  const [sales, setSales] = useState([]);
  const [cashierFilter, setCashierFilter] = useState("All");
  const [openSaleId, setOpenSaleId] = useState(null);

  useEffect(() => {
    function loadSales() {
      try {
        setSales(JSON.parse(localStorage.getItem(receiptHistoryStorageKey) || "[]"));
      } catch {
        localStorage.removeItem(receiptHistoryStorageKey);
        setSales([]);
      }
    }

    loadSales();
    window.addEventListener("storage", loadSales);
    window.addEventListener(receiptHistoryUpdateEvent, loadSales);
    return () => {
      window.removeEventListener("storage", loadSales);
      window.removeEventListener(receiptHistoryUpdateEvent, loadSales);
    };
  }, []);

  const cashiers = ["All", ...Array.from(new Set(sales.map((sale) => sale.cashier || "Unknown Cashier")))];
  const filteredSales = cashierFilter === "All"
    ? sales
    : sales.filter((sale) => (sale.cashier || "Unknown Cashier") === cashierFilter);
  const totalValue = filteredSales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const openSale = filteredSales.find((sale) => sale.id === openSaleId);

  return (
    <section className="section-card front-desk-sales-history">
      <div className="section-header product-table-header">
        <div>
          <h2><History /> What Was Sold</h2>
          <p>{filteredSales.length} sale{filteredSales.length === 1 ? "" : "s"} · {formatNaira(totalValue)} total</p>
        </div>
        <label className="field-group receipt-cashier-filter">
          <span>Cashier</span>
          <select value={cashierFilter} onChange={(event) => {
            setCashierFilter(event.target.value);
            setOpenSaleId(null);
          }}>
            {cashiers.map((cashier) => <option key={cashier}>{cashier}</option>)}
          </select>
        </label>
      </div>

      <DataTable
        columns={["Receipt", "Cashier", "Customer", "Products", "Units", "Payment", "Total", "Date", "Details"]}
        rows={filteredSales}
        rowKey={(sale, index) => `${sale.id}-${index}`}
        emptyMessage="No front desk sales have been recorded yet."
        tableClassName="product-data-table front-desk-history-table"
        renderRow={(sale) => (
          <>
            <td><span className="order-id">{sale.id}</span></td>
            <td><strong>{sale.cashier || "Unknown Cashier"}</strong></td>
            <td>{sale.customerName || "Walk-in Customer"}</td>
            <td>{sale.items?.map((item) => item.name).join(", ") || "-"}</td>
            <td>{sale.items?.reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 0}</td>
            <td>{sale.paymentMethod || "-"}</td>
            <td className="gold-text">{formatNaira(Number(sale.total || 0))}</td>
            <td>{sale.createdAt || "-"}</td>
            <td>
              <button
                className={`btn-outline front-desk-history-details ${openSaleId === sale.id ? "active" : ""}`}
                type="button"
                onClick={() => setOpenSaleId((currentId) => currentId === sale.id ? null : sale.id)}
                aria-expanded={openSaleId === sale.id}
              >
                View <ChevronDown />
              </button>
            </td>
          </>
        )}
      />

      {openSale && (
        <div className="front-desk-history-dropdown">
          <h3>Items in {openSale.id}</h3>
          {openSale.items?.map((item) => (
            <div className="front-desk-history-item" key={item.cartKey || `${item.sku}-${item.name}`}>
              <div>
                <strong>{item.name}</strong>
                <span>{item.sku || "No SKU"}</span>
              </div>
              <div>
                <span>{item.quantity} × {formatNaira(Number(item.price || 0))}</span>
                <strong>{formatNaira(Number(item.price || 0) * Number(item.quantity || 0))}</strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
