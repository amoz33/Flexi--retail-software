import { Boxes } from "lucide-react";
import ProductsManager from "./ProductsManager";

export default function ProductsPage() {
  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h1><Boxes /> Inventory</h1>
          <p>Create and manage product stock, expiry dates, images, attributes, and variants.</p>
        </div>
      </div>

      <ProductsManager />
    </>
  );
}