import { ShoppingCart } from "lucide-react";
import ScanPayCart from "./ScanPayCart";

export default function ScanPayCartPage() {
  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h1><ShoppingCart /> Scan Pay Cart</h1>
          <p>Review scanned items, enter customer details, and pay.</p>
        </div>
      </div>

      <ScanPayCart />
    </>
  );
}
