import { Printer } from "lucide-react";
import ReceiptViewer from "./ReceiptViewer";

export default function FrontDeskReceiptPage() {
  return (
    <div className="cashier-page-frame">
      <div className="top-bar receipt-no-print">
        <div className="page-title">
          <h1><Printer /> Print Receipt</h1>
          <p>Review, filter, and print the sales history recorded by each cashier.</p>
        </div>
      </div>

      <ReceiptViewer />
    </div>
  );
}
