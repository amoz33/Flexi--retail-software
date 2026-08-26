<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EquipmentItem;
use App\Models\WasteRecord;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EquipmentController extends Controller
{
    public function index(Request $request)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Only admins can view assets.'], 403);
        }

        return response()->json([
            'equipment' => $this->scopeToOutlet(EquipmentItem::query(), $request)->orderByDesc('created_at')->get()->map(function (EquipmentItem $item) {
                return $this->equipmentPayload($item);
            }),
        ]);
    }

    public function store(Request $request)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Only admins can manage assets.'], 403);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'quantity' => ['nullable', 'integer', 'min:1'],
            'status' => ['nullable', 'string', 'max:30'],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);

        $item = EquipmentItem::create([
            'name' => $data['name'],
            'category' => $data['category'] ?? null,
            'location' => $data['location'] ?? null,
            'quantity' => $data['quantity'] ?? 1,
            'status' => $data['status'] ?? 'Working',
            'note' => $data['note'] ?? null,
            'outlet_id' => $this->requestedOutletId($request),
        ]);

        return response()->json(['item' => $this->equipmentPayload($item)], 201);
    }

    public function update(Request $request, EquipmentItem $equipment)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Only admins can manage assets.'], 403);
        }

        $data = $request->validate([
            'status' => ['sometimes', 'string', 'max:30'],
            'note' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        $equipment->update($data);

        return response()->json(['item' => $this->equipmentPayload($equipment->fresh())]);
    }

    public function destroy(Request $request, EquipmentItem $equipment)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Only admins can manage assets.'], 403);
        }

        $equipment->delete();

        return response()->json(['message' => 'Asset deleted.']);
    }

    public function moveToWaste(Request $request, EquipmentItem $equipment)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Only admins can manage assets.'], 403);
        }

        $result = DB::transaction(function () use ($equipment, $request) {
            $record = WasteRecord::create([
                'item_name' => $equipment->name,
                'item_type' => 'Asset',
                'reason' => $equipment->status === 'Broken' ? 'Broken' : 'Damaged',
                'quantity' => max(1, (int) $equipment->quantity),
                'action' => 'Quarantine',
                'note' => $equipment->note ?: 'Moved from Asset Management with status: '.$equipment->status.'.',
                'equipment_id' => $equipment->id,
                'user_id' => optional($request->user())->id,
            ]);

            $equipment->forceFill(['status' => 'Disposed'])->save();

            return ['item' => $equipment->fresh(), 'record' => $record];
        });

        return response()->json([
            'item' => $this->equipmentPayload($result['item']),
        ]);
    }

    private function isAdmin(Request $request)
    {
        return $request->user() && $request->user()->role === 'Admin';
    }

    private function equipmentPayload(EquipmentItem $item)
    {
        return [
            'id' => $item->id,
            'name' => $item->name,
            'category' => $item->category,
            'location' => $item->location,
            'quantity' => (int) $item->quantity,
            'status' => $item->status,
            'note' => $item->note ?: '',
        ];
    }
}
