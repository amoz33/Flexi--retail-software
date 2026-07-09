import { ReceiptText } from "lucide-react";
import ScanPayReceipt from "./ScanPayReceipt";

export default function ScanPayReceiptPage() {
  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h1><ReceiptText /> Scan Pay Receipt</h1>
          <p>View the latest paid scan-pay receipt.</p>
        </div>
      </div>

      <ScanPayReceipt />
    </>
  );
}
