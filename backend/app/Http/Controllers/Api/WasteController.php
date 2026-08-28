<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\WasteRecord;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WasteController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = WasteRecord::query()->orderByDesc('created_at');

        if (!$this->isAdmin($request)) {
            if (!$user) {
                return response()->json(['message' => 'Authentication required.'], 401);
            }

            $query->where('user_id', $user->id);
        }

        return response()->json([
            'records' => $query->get()->map(function (WasteRecord $record) {
                return $this->wastePayload($record);
            }),
        ]);
    }

    public function store(Request $request)
    {
        if (!$request->user()) {
            return response()->json(['message' => 'Authentication required to record waste.'], 401);
        }

        $data = $request->validate([
            'itemName' => ['required', 'string', 'max:255'],
            'itemType' => ['nullable', 'string', 'max:30'],
            'reason' => ['nullable', 'string', 'max:30'],
            'quantity' => ['required', 'integer', 'min:1'],
            'action' => ['nullable', 'string', 'max:50'],
            'note' => ['nullable', 'string', 'max:2000'],
            'productId' => ['nullable', 'integer'],
        ]);

        $result = DB::transaction(function () use ($data, $request) {
            $product = null;

            if (!empty($data['productId'])) {
                $product = Product::where('id', $data['productId'])->lockForUpdate()->first();

                if (!$product) {
                    abort(response()->json(['message' => 'The linked product no longer exists.'], 422));
                }

                if ($product->stock < $data['quantity']) {
                    abort(response()->json([
                        'message' => "Only {$product->stock} {$product->name} in stock to move to waste.",
                    ], 422));
                }

                $product->stock -= $data['quantity'];
                $product->save();
            }

            $record = WasteRecord::create([
                'item_name' => $data['itemName'],
                'item_type' => $data['itemType'] ?? 'Product',
                'reason' => $data['reason'] ?? 'Expired',
                'quantity' => $data['quantity'],
                'action' => $data['action'] ?? 'Quarantine',
                'note' => $data['note'] ?? null,
                'product_id' => $product ? $product->id : null,
                'user_id' => optional($request->user())->id,
            ]);

            return ['record' => $record, 'product' => $product];
        });

        $response = ['record' => $this->wastePayload($result['record'])];

        if ($result['product']) {
            $response['productStock'] = (int) $result['product']->stock;
        }

        return response()->json($response, 201);
    }

    private function isAdmin(Request $request)
    {
        return $request->user() && $request->user()->role === 'Admin';
    }

    private function wastePayload(WasteRecord $record)
    {
        $user = $record->user()->first();

        return [
            'id' => $record->id,
            'itemName' => $record->item_name,
            'itemType' => $record->item_type,
            'reason' => $record->reason,
            'quantity' => (int) $record->quantity,
            'action' => $record->action,
            'note' => $record->note ?: '',
            'recordedBy' => $user ? $user->name : 'System',
            'userId' => $record->user_id,
            'recordedAt' => optional($record->created_at)->format('M j, Y g:i A'),
        ];
    }
}
