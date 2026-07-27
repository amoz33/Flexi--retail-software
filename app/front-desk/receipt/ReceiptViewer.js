"use client";

import Link from "next/link";
import { Eye, Printer, ScanLine } from "lucide-react";
import { useEffect, useState } from "react";
import DataTable from "../../components/DataTable";
import { formatNaira } from "../../data";
import { apiFetch } from "../../lib/api";

const receiptStorageKey = "retail-last-receipt";

export default function ReceiptViewer() {
  const [receipt, setReceipt] = useState(null);
  const [receiptHistory, setReceiptHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cashierFilter, setCashierFilter] = useState("All");

  useEffect(() => {
    let cancelled = false;

    try {
      const savedReceipt = localStorage.getItem(receiptStorageKey);
      if (savedReceipt) setReceipt(JSON.parse(savedReceipt));
    } catch {
      localStorage.removeItem(receiptStorageKey);
    }

    async function loadSales() {
      try {
        const data = await apiFetch("/sales");
        if (cancelled) return;
        const sales = data.sales || [];
        setReceiptHistory(sales);
        setReceipt((current) => current || sales[0] || null);
      } catch {
        /* history stays empty; latest receipt still shows */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSales();
    return () => { cancelled = true; };
  }, []);

  const cashiers = ["All", ...Array.from(new Set(receiptHistory.map((item) => item.cashier || "Unknown Cashier")))];
  const filteredHistory = cashierFilter === "All"
    ? receiptHistory
    : receiptHistory.filter((item) => (item.cashier || "Unknown Cashier") === cashierFilter);

  function viewReceipt(selectedReceipt) {
    setReceipt(selectedReceipt);
    localStorage.setItem(receiptStorageKey, JSON.stringify(selectedReceipt));
  }

  if (!loading && !receipt && !receiptHistory.length) {
    return (
      <section className="section-card receipt-empty receipt-no-print">
        <div className="empty-table-cell">No completed sale receipt yet.</div>
        <Link className="btn-gold" href="/front-desk/sell"><ScanLine /> Start Sale</Link>
      </section>
    );
  }

  return (
    <>
      <section className="section-card receipt-history-card receipt-no-print">
        <div className="section-header product-table-header">
          <div>
            <h2>Cashier Sales History</h2>
            <p>{loading ? "Loading sales..." : `${filteredHistory.length} sale${filteredHistory.length === 1 ? "" : "s"} shown`}</p>
          </div>
          <label className="field-group receipt-cashier-filter">
            <span>Cashier</span>
            <select value={cashierFilter} onChange={(event) => setCashierFilter(event.target.value)}>
              {cashiers.map((cashierName) => <option key={cashierName}>{cashierName}</option>)}
            </select>
          </label>
        </div>

        <DataTable
          columns={["Receipt", "Cashier", "Customer", "Items", "Payment", "Total", "Date", "View"]}
          rows={filteredHistory}
          rowKey={(item, index) => `${item.id}-${index}`}
          emptyMessage={loading ? "Loading sales..." : "No sales recorded for this cashier."}
          tableClassName="product-data-table receipt-history-table"
          renderRow={(item) => (
            <>
              <td><span className="order-id">{item.id}</span></td>
              <td><strong>{item.cashier || "Unknown Cashier"}</strong></td>
              <td>{item.customerName || "Walk-in Customer"}</td>
              <td>{item.items?.reduce((sum, product) => sum + Number(product.quantity || 0), 0) || 0}</td>
              <td>{item.paymentMethod || "-"}</td>
              <td className="gold-text">{formatNaira(Number(item.total || 0))}</td>
              <td>{item.createdAt || "-"}</td>
              <td>
                <button className="btn-outline receipt-history-view" type="button" onClick={() => viewReceipt(item)}>
                  <Eye /> View
                </button>
              </td>
            </>
          )}
        />
      </section>

      {receipt && (
        <>
      <div className="receipt-actions receipt-no-print">
        <Link className="btn-outline" href="/front-desk/sell"><ScanLine /> New Sale</Link>
        <button className="btn-gold" type="button" onClick={() => window.print()}><Printer /> Print</button>
      </div>

      <section className="receipt-paper">
        <div className="receipt-header">
          <h2>Flexi Retail Software</h2>
          <p>Receipt {receipt.id}</p>
          <span>{receipt.createdAt}</span>
        </div>

        <div className="receipt-meta">
          <div><span>Customer</span><strong>{receipt.customerName}</strong></div>
          <div><span>Phone</span><strong>{receipt.customerPhone || "-"}</strong></div>
          <div><span>Payment</span><strong>{receipt.paymentMethod}</strong></div>
          <div><span>Cashier</span><strong>{receipt.cashier}</strong></div>
        </div>

        <DataTable
          baseClassName="receipt-table datatable"
          columns={["Item", "Qty", "Price", "Total"]}
          rows={receipt.items || []}
          rowKey={(item, index) => item.cartKey || `${item.id}-${index}`}
          emptyMessage="No receipt items to show."
          renderRow={(item) => (
            <>
              <td>
                <strong>{item.name}</strong>
                <span>{item.sku}</span>
              </td>
              <td>{item.quantity}</td>
              <td>{formatNaira(item.price)}</td>
              <td>{formatNaira(item.price * item.quantity)}</td>
            </>
          )}
        />

        <div className="receipt-totals">
          <div><span>Subtotal</span><strong>{formatNaira(receipt.subtotal)}</strong></div>
          <div><span>Discount</span><strong>{formatNaira(receipt.discount)}</strong></div>
          <div className="receipt-total"><span>Total</span><strong>{formatNaira(receipt.total)}</strong></div>
        </div>

        <p className="receipt-footer">Thank you for shopping with us.</p>
      </section>
        </>
      )}
    </>
  );
}
