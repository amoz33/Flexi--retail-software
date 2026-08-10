<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CartController extends Controller
{
    public function get(Request $request)
    {
        $sessionId = $this->getSessionId($request);
        $cart = Cart::where('session_id', $sessionId)->first();

        return response()->json([
            'cart' => $cart ? $this->cartPayload($cart) : $this->emptyCartPayload(),
        ]);
    }

    public function update(Request $request)
    {
        $sessionId = $this->getSessionId($request);
        $validated = $request->validate([
            'items' => ['required', 'array'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        $enrichedItems = $this->enrichCartItems($validated['items']);

        $cart = Cart::updateOrCreate(
            ['session_id' => $sessionId],
            [
                'user_id' => optional($request->user())->id,
                'items' => $enrichedItems,
                'expires_at' => now()->addDays(7),
            ]
        );

        return response()->json([
            'cart' => $this->cartPayload($cart),
        ]);
    }

    public function clear(Request $request)
    {
        try {
            $sessionId = $this->getSessionId($request);
            Cart::where('session_id', $sessionId)->delete();

            return response()->json([
                'cart' => $this->emptyCartPayload(),
            ]);
        } catch (\Exception $e) {
            // Return empty cart even if deletion fails
            return response()->json([
                'cart' => $this->emptyCartPayload(),
            ]);
        }
    }

    public function sync(Request $request)
    {
        $sessionId = $this->getSessionId($request);
        $userId = optional($request->user())->id;

        if ($userId) {
            // Merge guest cart with user cart
            $guestCart = Cart::where('session_id', $sessionId)->first();
            $userCart = Cart::where('user_id', $userId)->first();

            if ($guestCart && $userCart) {
                $mergedItems = $this->mergeCartItems($guestCart->items, $userCart->items);
                $userCart->update(['items' => $mergedItems]);
                $guestCart->delete();
                $cart = $userCart;
            } elseif ($guestCart) {
                $guestCart->update(['user_id' => $userId, 'session_id' => null]);
                $cart = $guestCart;
            } elseif ($userCart) {
                $cart = $userCart;
            } else {
                $cart = Cart::create([
                    'user_id' => $userId,
                    'items' => [],
                    'expires_at' => now()->addDays(7),
                ]);
            }
        } else {
            $cart = Cart::updateOrCreate(
                ['session_id' => $sessionId],
                ['items' => [], 'expires_at' => now()->addDays(7)]
            );
        }

        return response()->json([
            'cart' => $this->cartPayload($cart),
        ]);
    }

    private function getSessionId(Request $request)
    {
        return $request->cookie('cart_session') ?? (string) Str::uuid();
    }

    private function enrichCartItems(array $items)
    {
        $productIds = array_column($items, 'product_id');
        $products = Product::whereIn('id', $productIds)
            ->where('front_desk_visible', true)
            ->where('stock', '>', 0)
            ->get()
            ->keyBy('id');

        $enrichedItems = [];
        foreach ($items as $item) {
            $product = $products->get($item['product_id']);
            if (!$product) {
                continue;
            }

            $quantity = min($item['quantity'], $product->stock);

            $enrichedItems[] = [
                'product_id' => $product->id,
                'sku' => $product->sku,
                'name' => $product->name,
                'category' => $product->category,
                'price' => (float) $product->price,
                'stock' => (int) $product->stock,
                'quantity' => $quantity,
            ];
        }

        return $enrichedItems;
    }

    private function mergeCartItems(array $items1, array $items2)
    {
        $merged = [];
        $productMap = [];

        foreach (array_merge($items1, $items2) as $item) {
            $productId = $item['product_id'];
            if (!isset($productMap[$productId])) {
                $productMap[$productId] = $item;
            } else {
                $productMap[$productId]['quantity'] = min(
                    $productMap[$productId]['quantity'] + $item['quantity'],
                    $item['stock']
                );
            }
        }

        return array_values($productMap);
    }

    private function cartPayload(Cart $cart)
    {
        return [
            'id' => $cart->id,
            'session_id' => $cart->session_id,
            'items' => $cart->items,
            'total' => $this->calculateCartTotal($cart->items),
            'count' => $this->calculateCartCount($cart->items),
            'expires_at' => $cart->expires_at ? $cart->expires_at->toISOString() : null,
        ];
    }

    private function emptyCartPayload()
    {
        return [
            'items' => [],
            'total' => 0,
            'count' => 0,
        ];
    }

    private function calculateCartTotal(array $items)
    {
        return array_reduce($items, function ($sum, $item) {
            return $sum + ($item['price'] * $item['quantity']);
        }, 0);
    }

    private function calculateCartCount(array $items)
    {
        return array_reduce($items, function ($sum, $item) {
            return $sum + $item['quantity'];
        }, 0);
    }
}