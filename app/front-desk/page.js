import Link from "next/link";
import { ClipboardList, History, Printer, ScanLine, Store } from "lucide-react";
import FrontDeskProducts from "./FrontDeskProducts";

export default function FrontDeskPage() {
  return (
    <div className="cashier-page-frame">
      <div className="top-bar">
        <div className="page-title">
          <h1><Store /> Front Desk</h1>
          <p>View the live product list with prices and stock availability.</p>
        </div>
      </div>

      <div className="front-desk-portal-grid">
        <Link className="front-desk-portal-tile" href="/front-desk/sell">
          <ScanLine />
          <div>
            <strong>Sell Products</strong>
            <span>Scan, import, calculate cart totals, and complete customer sales.</span>
          </div>
        </Link>

        <Link className="front-desk-portal-tile" href="/front-desk/receipt">
          <Printer />
          <div>
            <strong>Print Receipt</strong>
            <span>Open the latest checkout receipt and print it for the customer.</span>
          </div>
        </Link>

        <div className="front-desk-portal-tile">
          <ClipboardList />
          <div>
            <strong>Live Product List</strong>
            <span>Cashier-visible products and prices are shown below.</span>
          </div>
        </div>

        <Link className="front-desk-portal-tile" href="/front-desk/sales-history">
          <History />
          <div>
            <strong>Sales History</strong>
            <span>Review products sold, quantities, cashiers, totals, and sale dates.</span>
          </div>
        </Link>
      </div>

      <FrontDeskProducts />
    </div>
  );
}
