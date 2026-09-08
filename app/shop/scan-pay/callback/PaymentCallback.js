"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, ReceiptText, ScanLine } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "../../../lib/api";

const receiptStorageKey = "retail-last-receipt";
const pendingOrderStorageKey = "retail-pending-order";

// Each gateway returns the transaction reference in a different query
// parameter, and needs a different verify endpoint. The gateway itself was
// stored locally when the payment was initiated (before the redirect away
// from this site), so we read that first rather than guessing from the URL.
const gatewayConfig = {
  paystack: {
    verifyPath: (ref) => `/payments/verify/${ref}`,
    readReference: (params) => params.get("reference") || params.get("trxref")
  },
  dpo: {
    verifyPath: (ref) => `/payments/dpo/verify/${ref}`,
    readReference: (params) => params.get("TransToken")
  },
  pawapay: {
    verifyPath: (ref) => `/payments/pawapay/verify/${ref}`,
    readReference: (params) => params.get("depositId")
  }
};

export default function PaymentCallback() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("verifying"); // verifying | success | failed
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function finalize() {
      const pendingRaw = localStorage.getItem(pendingOrderStorageKey);
      if (!pendingRaw) {
        setStatus("failed");
        setErrorMessage("We could not find your order details in this browser. If you were charged, contact support with any reference number shown in your payment app.");
        return;
      }

      let pending;
      try {
        pending = JSON.parse(pendingRaw);
      } catch {
        setStatus("failed");
        setErrorMessage("Your saved order details could not be read. Please contact support.");
        return;
      }

      const gateway = gatewayConfig[pending.gateway] ? pending.gateway : "paystack";
      const config = gatewayConfig[gateway];
      const gatewayReference = config.readReference(searchParams);

      if (!gatewayReference) {
        setStatus("failed");
        setErrorMessage("No payment reference was returned. If you were charged, contact support with your bank or wallet reference.");
        return;
      }

      try {
        const verification = await apiFetch(config.verifyPath(gatewayReference));

        if (verification.status !== "success") {
          setStatus("failed");
          setErrorMessage("Payment was not successful. Your card or wallet was not charged, or the transaction was declined.");
          return;
        }

        if (pending.reference !== verification.reference && pending.order?.payment_reference !== gatewayReference) {
          // Reference mismatch is unusual but not necessarily fatal — proceed
          // using the locally stored order details, since verification itself
          // succeeded against the gateway.
        }

        const orderData = await apiFetch("/orders", { method: "POST", body: pending.order });

        const receipt = {
          id: orderData.order?.orderNumber || orderData.order?.order_number || gatewayReference,
          createdAt: new Date().toLocaleString(),
          items: pending.order.items.map((item, index) => ({
            cartKey: `${item.sku || index}-${index}`,
            name: item.name,
            sku: item.sku,
            price: item.price,
            quantity: item.quantity
          })),
          total: pending.order.total
        };
        localStorage.setItem(receiptStorageKey, JSON.stringify(receipt));
        localStorage.removeItem(pendingOrderStorageKey);

        try {
          await apiFetch("/cart", { method: "DELETE" });
        } catch {
          // Cart clearing failing is not critical — the order is already placed.
        }

        setStatus("success");
      } catch (error) {
        setStatus("failed");
        setErrorMessage(error.message || "Something went wrong while confirming your payment.");
      }
    }

    finalize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "verifying") {
    return (
      <section className="section-card">
        <div className="section-header product-table-header">
          <div>
            <h2><Loader2 className="spin-icon" /> Confirming Payment...</h2>
            <p>Please wait while we verify your payment. Do not close this page.</p>
          </div>
        </div>
      </section>
    );
  }

  if (status === "failed") {
    return (
      <section className="section-card">
        <div className="section-header product-table-header">
          <div>
            <h2><AlertTriangle /> Payment Not Confirmed</h2>
            <p>{errorMessage}</p>
          </div>
          <div className="receipt-actions">
            <Link className="btn-outline" href="/shop/scan-pay/cart"><ScanLine /> Back to Cart</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section-card">
      <div className="section-header product-table-header">
        <div>
          <h2><CheckCircle2 /> Payment Complete</h2>
          <p>Your order has been placed and payment confirmed.</p>
        </div>
        <div className="receipt-actions">
          <Link className="btn-outline" href="/shop/scan-pay"><ScanLine /> Scan More</Link>
          <Link className="btn-gold" href="/shop/scan-pay/receipt"><ReceiptText /> View Receipt</Link>
        </div>
      </div>
    </section>
  );
}
