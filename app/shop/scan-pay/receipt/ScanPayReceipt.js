"use client";

import Link from "next/link";
import { Printer, ScanLine } from "lucide-react";
import { useEffect, useState } from "react";
import DataTable from "../../../components/DataTable";
import { formatNaira } from "../../../data";

const receiptStorageKey = "retail-last-receipt";

export default function ScanPayReceipt() {
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    const savedReceipt = localStorage.getItem(receiptStorageKey);
    if (!savedReceipt) return;

    try {
      setReceipt(JSON.parse(savedReceipt));
    } catch {
      localStorage.removeItem(receiptStorageKey);
    }
  }, []);

  if (!receipt) {
    return (
      <section className="section-card receipt-empty">
        <div className="empty-table-cell">No paid scan-pay receipt yet.</div>
        <Link className="btn-gold" href="/shop/scan-pay"><ScanLine /> Scan Items</Link>
      </section>
    );
  }

  return (
    <section className="section-card">
      <div className="section-header product-table-header">
        <div>
          <h2>Customer Receipt</h2>
          <p>{receipt.id} also appears on cashier receipt print.</p>
        </div>
        <Link className="btn-outline" href="/front-desk/receipt"><Printer /> Print at Cashier</Link>
      </div>

      <div className="receipt-paper scan-pay-receipt-preview">
        <div className="receipt-header">
          <h2>Flexi Retail Software</h2>
          <p>Receipt {receipt.id}</p>
          <span>{receipt.createdAt}</span>
        </div>
        <DataTable
          baseClassName="receipt-table datatable"
          columns={["Item", "Qty", "Price", "Total"]}
          rows={receipt.items}
          rowKey={(item) => item.cartKey}
          emptyMessage="No receipt items."
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
          <div><span>Total Paid</span><strong>{formatNaira(receipt.total)}</strong></div>
        </div>
      </div>
    </section>
  );
}
