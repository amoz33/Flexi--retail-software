<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SaleController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $isAdmin = $user && $user->role === 'Admin';

        $query = $this->scopeToOutlet(Sale::query(), $request)->orderByDesc('created_at');

        if (!$isAdmin) {
            $query->where('user_id', $user ? $user->id : 0);
        } elseif ($request->filled('cashier')) {
            $query->where('cashier_name', $request->input('cashier'));
        }

        return response()->json([
            'sales' => $query->limit(500)->get()->map(function (Sale $sale) {
                return $this->salePayload($sale);
            }),
        ]);
    }

    public function show(Request $request, Sale $sale)
    {
        $user = $request->user();
        $isAdmin = $user && $user->role === 'Admin';

        if (!$isAdmin && (!$user || $sale->user_id !== $user->id)) {
            return response()->json(['message' => 'You can only view your own sales.'], 403);
        }

        return response()->json(['sale' => $this->salePayload($sale)]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'customer_name' => ['nullable', 'string', 'max:255'],
            'customer_phone' => ['nullable', 'string', 'max:50'],
            'payment_method' => ['required', 'string', 'max:30'],
            'discount' => ['sometimes', 'numeric', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.productId' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        $result = DB::transaction(function () use ($data, $request) {
            $lineItems = [];
            $subtotal = 0;

            foreach ($data['items'] as $item) {
                $product = $this->scopeToOutlet(Product::query(), $request)
                    ->where('id', $item['productId'])
                    ->lockForUpdate()
                    ->first();

                if (!$product) {
                    abort(response()->json([
                        'message' => 'A product in the cart no longer exists. Refresh and retry.',
                    ], 422));
                }

                if ($product->stock < $item['quantity']) {
                    abort(response()->json([
                        'message' => "Insufficient stock for {$product->name}. Only {$product->stock} left.",
                    ], 422));
                }

                $product->stock -= $item['quantity'];
                $product->sold_count += $item['quantity'];
                $product->save();

                $lineTotal = (float) $product->price * $item['quantity'];
                $subtotal += $lineTotal;

                $lineItems[] = [
                    'id' => $product->id,
                    'name' => $product->name,
                    'sku' => $product->sku,
                    'barcode' => $product->barcode,
                    'price' => (float) $product->price,
                    'quantity' => $item['quantity'],
                    'lineTotal' => $lineTotal,
                ];
            }

            $discount = min($subtotal, (float) ($data['discount'] ?? 0));

            $sale = Sale::create([
                'sale_number' => 'RCT-'.now()->format('ymd').'-'.Str::upper(Str::random(5)),
                'user_id' => optional($request->user())->id,
                'cashier_name' => optional($request->user())->name ?: 'Front Desk',
                'customer_name' => trim($data['customer_name'] ?? '') ?: 'Walk-in Customer',
                'customer_phone' => $data['customer_phone'] ?? null,
                'payment_method' => $data['payment_method'],
                'items' => $lineItems,
                'subtotal' => $subtotal,
                'discount' => $discount,
                'total' => $subtotal - $discount,
                'outlet_id' => $this->requestedOutletId($request),
            ]);

            return $sale;
        });

        return response()->json(['sale' => $this->salePayload($result)], 201);
    }

    private function salePayload(Sale $sale)
    {
        return [
            'id' => $sale->sale_number,
            'databaseId' => $sale->id,
            'customerName' => $sale->customer_name,
            'customerPhone' => $sale->customer_phone,
            'paymentMethod' => $sale->payment_method,
            'items' => $sale->items ?: [],
            'subtotal' => (float) $sale->subtotal,
            'discount' => (float) $sale->discount,
            'total' => (float) $sale->total,
            'cashier' => $sale->cashier_name,
            'createdAt' => optional($sale->created_at)->format('M j, Y g:i A'),
        ];
    }
}
