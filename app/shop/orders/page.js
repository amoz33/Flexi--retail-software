import { ClipboardList } from "lucide-react";
import CustomerOrderHistory from "./CustomerOrderHistory";

export default function ShopOrdersPage() {
  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h1><ClipboardList /> Purchase History</h1>
          <p>Review what the customer bought or ordered from shop and scan pay.</p>
        </div>
      </div>

      <CustomerOrderHistory />
    </>
  );
}
