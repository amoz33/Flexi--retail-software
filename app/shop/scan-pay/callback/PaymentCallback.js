"use client";

import Link from "next/link";
import { ReceiptText, ScanLine } from "lucide-react";

export default function PaymentCallback() {
  return (
    <section className="section-card">
      <div className="section-header product-table-header">
        <div>
          <h2><ReceiptText /> Payment Complete</h2>
          <p>Frontend payment mode is active. Receipts are generated from the cart page after payment.</p>
        </div>
        <div className="receipt-actions">
          <Link className="btn-outline" href="/shop/scan-pay"><ScanLine /> Scan More</Link>
          <Link className="btn-gold" href="/shop/scan-pay/receipt"><ReceiptText /> View Receipt</Link>
        </div>
      </div>
    </section>
  );
}
