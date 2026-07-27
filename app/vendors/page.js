import { Handshake } from "lucide-react";
import VendorsManager from "./VendorsManager";

export default function VendorsPage() {
  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h1><Handshake /> Vendor Desk</h1>
          <p>Manage suppliers and keep vendor contact information close to daily stock work.</p>
        </div>
      </div>

      <VendorsManager />
    </>
  );
}
