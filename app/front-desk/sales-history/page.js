import { History } from "lucide-react";
import FrontDeskSalesHistory from "../FrontDeskSalesHistory";

export default function FrontDeskSalesHistoryPage() {
  return (
    <div className="cashier-page-frame">
      <div className="top-bar">
        <div className="page-title">
          <h1><History /> Sales History</h1>
          <p>Review everything sold through Front Desk and Scan & Pay.</p>
        </div>
      </div>

      <FrontDeskSalesHistory />
    </div>
  );
}
