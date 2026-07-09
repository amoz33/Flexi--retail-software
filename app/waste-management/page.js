import { Recycle } from "lucide-react";
import WasteManagementManager from "./WasteManagementManager";

export default function WasteManagementPage() {
  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h1><Recycle /> Waste Management</h1>
          <p>Record expired products and broken, damaged, or unsafe business assets.</p>
        </div>
      </div>

      <WasteManagementManager />
    </>
  );
}
