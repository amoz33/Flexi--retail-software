import { ScanLine } from "lucide-react";
import { customers, products, staff } from "../../data";
import FrontDeskSale from "./FrontDeskSale";

export default function FrontDeskSellPage() {
  return (
    <div className="cashier-page-frame">
      <div className="top-bar">
        <div className="page-title">
          <h1><ScanLine /> Sell Products</h1>
          <p>Scan or import items, calculate the customer basket, checkout, and generate a receipt.</p>
        </div>
      </div>

      <FrontDeskSale initialProducts={products} customers={customers} staff={staff} />
    </div>
  );
}
