import { ShoppingBag } from "lucide-react";
import CustomerShop from "./CustomerShop";

export default function ShopPage() {
  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h1><ShoppingBag /> Customer Shop</h1>
          <p>A home-ordering storefront for customers.</p>
        </div>
      </div>

      <CustomerShop />
    </>
  );
}
