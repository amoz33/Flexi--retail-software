<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $isAdmin = $this->isAdmin($request);
        
        $query = $this->scopeToOutlet(Product::query(), $request)->orderBy('name');

        if (!$isAdmin) {
            $query->where('front_desk_visible', true);
        }

        return response()->json([
            'products' => $query->get()->map(function ($product) use ($isAdmin) {
                return $this->productPayload($product, $isAdmin);
            }),
        ]);
    }

    public function store(Request $request)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Only admins can manage products.'], 403);
        }

        $data = $this->validateProduct($request);
        $user = $request->user();
        
        $productData = $this->toColumns($data);
        $productData['outlet_id'] = $this->requestedOutletId($request);

        $product = Product::updateOrCreate(
            ['sku' => $data['sku']],
            $productData
        );

        return response()->json(['product' => $this->productPayload($product, true)], 201);
    }

    public function import(Request $request)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Only admins can manage products.'], 403);
        }

        $request->validate([
            'products' => ['required', 'array'],
            'products.*.sku' => ['required', 'string', 'max:255'],
            'products.*.name' => ['required', 'string', 'max:255'],
        ]);

        $saved = [];
        foreach ($request->input('products') as $item) {
            $product = Product::updateOrCreate(
                ['sku' => $item['sku']],
                $this->toColumns($item)
            );
            $saved[] = $this->productPayload($product, true);
        }

        return response()->json(['products' => $saved], 201);
    }

    public function update(Request $request, Product $product)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Only admins can manage products.'], 403);
        }

        $data = $this->validateProduct($request, $product->id, true);
        $product->update($this->toColumns($data));

        return response()->json(['product' => $this->productPayload($product->fresh(), true)]);
    }

    public function destroy(Request $request, Product $product)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Only admins can manage products.'], 403);
        }

        $product->delete();

        return response()->json(['message' => 'Product deleted.']);
    }

    private function isAdmin(Request $request)
    {
        return $request->user() && $request->user()->role === 'Admin';
    }

    private function validateProduct(Request $request, $ignoreId = null, $partial = false)
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'name' => [$required, 'string', 'max:255'],
            'sku' => [$required, 'string', 'max:255'],
            'barcode' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
            'expiryDate' => [$required, 'date'],
            'description' => ['nullable', 'string'],
            'images' => ['nullable', 'array'],
            'attributes' => ['nullable', 'array'],
            'variants' => ['nullable', 'array'],
            'price' => [$required, 'numeric', 'min:0'],
            'costPrice' => [$required, 'numeric', 'min:0'],
            'stock' => ['nullable', 'integer', 'min:0'],
            'soldCount' => ['nullable', 'integer', 'min:0'],
            'frontDeskVisible' => ['nullable', 'boolean'],
        ]);
    }

    private function toColumns(array $data)
    {
        $map = [
            'name' => 'name', 'sku' => 'sku', 'barcode' => 'barcode',
            'category' => 'category',
            'expiryDate' => 'expiry_date', 'description' => 'description',
            'images' => 'images', 'attributes' => 'attribute_data',
            'variants' => 'variants', 'price' => 'price',
            'costPrice' => 'cost_price',
            'stock' => 'stock', 'soldCount' => 'sold_count',
            'frontDeskVisible' => 'front_desk_visible',
        ];

        $columns = [];
        foreach ($map as $input => $column) {
            if (array_key_exists($input, $data)) {
                $columns[$column] = $data[$input] === '' && $input === 'expiryDate' ? null : $data[$input];
            }
        }

        return $columns;
    }

    private function productPayload(Product $product, $isAdmin = false)
    {
        $payload = [
            'id' => $product->id,
            'name' => $product->name,
            'sku' => $product->sku,
            'barcode' => $product->barcode,
            'category' => $product->category,
            'expiryDate' => $product->expiry_date ? $product->expiry_date->format('Y-m-d') : '',
            'description' => $product->description,
            'images' => $product->images ?: [],
            'attributes' => $product->attribute_data ?: [],
            'variants' => $product->variants ?: [],
            'price' => (float) $product->price,
            'stock' => (int) $product->stock,
            'soldCount' => (int) $product->sold_count,
            'revenue' => (float) $product->price * (int) $product->sold_count,
            'frontDeskVisible' => (bool) $product->front_desk_visible,
        ];

        if ($isAdmin) {
            $payload['costPrice'] = (float) $product->cost_price;
        }

        return $payload;
    }

    public function customerIndex(Request $request)
    {
        $query = Product::where('front_desk_visible', true)
            ->where('stock', '>', 0)
            ->orderBy('name');

        // Optional outlet filter from query parameter
        if ($request->has('outlet_id')) {
            $query->where('outlet_id', $request->input('outlet_id'));
        }

        $products = $query->get();

        return response()->json([
            'products' => $products->map(function ($product) {
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'sku' => $product->sku,
                    'barcode' => $product->barcode,
                    'category' => $product->category,
                    'description' => $product->description,
                    'images' => $product->images ?: [],
                    'price' => (float) $product->price,
                    'stock' => (int) $product->stock,
                    'frontDeskVisible' => (bool) $product->front_desk_visible,
                    'outlet_id' => $product->outlet_id,
                ];
            }),
        ]);
    }
}