import { ScanLine } from "lucide-react";
import CustomerScanPay from "./CustomerScanPay";

export default function ScanPayPage() {
  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h1><ScanLine /> Customer Scan Pay</h1>
          <p>Customers scan products, pay, and collect at the store.</p>
        </div>
      </div>

      <CustomerScanPay />
    </>
  );
}
