import { Archive } from "lucide-react";
import { equipmentInventory } from "../data";
import EquipmentInventoryManager from "./EquipmentInventoryManager";

export default function InventoryPage() {
  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h1><Archive /> Asset Management</h1>
          <p>Track business assets, locations, maintenance, faults, and breakages.</p>
        </div>
      </div>

      <EquipmentInventoryManager initialEquipment={equipmentInventory} />
    </>
  );
}
