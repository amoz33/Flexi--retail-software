import { Download, Truck } from "lucide-react";
import ActionButton from "../components/ActionButton";
import { orders } from "../data";
import OrdersManager from "./OrdersManager";

export default function OrdersPage() {
  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h1><Truck /> All Orders</h1>
        </div>
        <ActionButton className="btn-outline" message="Export orders report"><Download /> Export</ActionButton>
      </div>

      <OrdersManager initialOrders={orders} />
    </>
  );
}
