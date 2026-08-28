"use client";

import { Archive } from "lucide-react";
import { useEffect, useState } from "react";
import { equipmentInventory } from "../data";
import EquipmentInventoryManager from "./EquipmentInventoryManager";

export default function InventoryPage() {
  const [outletId, setOutletId] = useState(null);

  useEffect(() => {
    setOutletId(new URLSearchParams(window.location.search).get("outlet_id"));
  }, []);

  return (
    <>
      <div className="top-bar">
        <div className="page-title">
          <h1><Archive /> Asset Management</h1>
          <p>{outletId ? "Assets assigned to this outlet, with maintenance and fault tracking." : "Track business assets, locations, maintenance, faults, and breakages."}</p>
        </div>
      </div>

      <EquipmentInventoryManager initialEquipment={equipmentInventory} outletId={outletId} />
    </>
  );
}
