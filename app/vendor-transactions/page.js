import { HandCoins } from "lucide-react";
import { vendorTransactions, vendors } from "../data";
import VendorTransactionsManager from "./VendorTransactionsManager";

export default function VendorTransactionsPage() {
  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h1><HandCoins /> Vendor Transactions</h1>
          <p>Review products received from vendors and the payments made against each purchase.</p>
        </div>
      </div>

      <VendorTransactionsManager initialTransactions={vendorTransactions} vendors={vendors} />
    </>
  );
}
