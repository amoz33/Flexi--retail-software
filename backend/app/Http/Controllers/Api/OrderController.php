<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\RetailOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    private $adminStatuses = ['Pending', 'Packed', 'Shipped'];

    public function index(Request $request)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Only admins can view orders.'], 403);
        }

        return response()->json([
            'orders' => RetailOrder::orderByDesc('created_at')
                ->get()
                ->map(function (RetailOrder $order) {
                    return $this->orderPayload($order);
                }),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'source' => ['sometimes', 'string', 'max:50'],
            'customer.name' => ['required', 'string', 'max:255'],
            'customer.phone' => ['nullable', 'string', 'max:50'],
            'customer.email' => ['nullable', 'email', 'max:255'],
            'customer.address' => ['nullable', 'string', 'max:2000'],
            'delivery_option' => ['nullable', 'string', 'max:50'],
            'delivery_note' => ['nullable', 'string', 'max:2000'],
            'payment_method' => ['nullable', 'string', 'max:50'],
            'payment_status' => ['nullable', 'string', 'max:30'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.name' => ['required', 'string', 'max:255'],
            'items.*.sku' => ['nullable', 'string', 'max:100'],
            'items.*.price' => ['required', 'numeric', 'min:0'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'subtotal' => ['required', 'numeric', 'min:0'],
            'delivery_fee' => ['sometimes', 'numeric', 'min:0'],
            'total' => ['required', 'numeric', 'min:0'],
        ]);

        $customerData = $data['customer'];
        $customer = $this->upsertCustomer($customerData, $data['source'] ?? 'Shop Order');
        $firstItem = $data['items'][0]['name'] ?? 'Order';

        $order = RetailOrder::create([
            'order_number' => $this->makeOrderNumber($data['source'] ?? ''),
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'phone' => $customer->phone,
            'email' => $customer->email,
            'address' => $customerData['address'] ?? $customer->address,
            'delivery_option' => $data['delivery_option'] ?? 'Home Delivery',
            'delivery_note' => $data['delivery_note'] ?? null,
            'payment_method' => $data['payment_method'] ?? null,
            'payment_status' => $data['payment_status'] ?? 'Pending',
            'items' => $data['items'],
            'subtotal' => $data['subtotal'],
            'delivery_fee' => $data['delivery_fee'] ?? 0,
            'total' => $data['total'],
            'status' => 'Pending',
        ]);

        $customer->forceFill([
            'address' => $customerData['address'] ?? $customer->address,
            'last_purchase' => $firstItem,
            'total_spent' => $customer->total_spent + $order->total,
            'status' => 'Active',
        ])->save();

        return response()->json([
            'order' => $this->orderPayload($order->fresh()),
            'customer' => [
                'id' => $customer->id,
                'name' => $customer->name,
            ],
        ], 201);
    }

    public function customerOrders(Request $request)
    {
        $data = $request->validate([
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
        ]);

        if (empty($data['email']) && empty($data['phone'])) {
            return response()->json(['orders' => []]);
        }

        $orders = RetailOrder::query()
            ->when(!empty($data['email']), function ($query) use ($data) {
                $query->orWhere('email', Str::lower($data['email']));
            })
            ->when(!empty($data['phone']), function ($query) use ($data) {
                $query->orWhere('phone', $data['phone']);
            })
            ->orderByDesc('created_at')
            ->get()
            ->map(function (RetailOrder $order) {
                return $this->orderPayload($order);
            });

        return response()->json(['orders' => $orders]);
    }

    public function updateStatus(Request $request, RetailOrder $order)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Only admins can update orders.'], 403);
        }

        $data = $request->validate([
            'status' => ['required', Rule::in($this->adminStatuses)],
        ]);

        if (!$this->isAllowedAdminTransition($order->status, $data['status'])) {
            return response()->json(['message' => 'Order status must move Pending to Packed to Shipped.'], 422);
        }

        $order->forceFill(['status' => $data['status']])->save();

        return response()->json(['order' => $this->orderPayload($order->fresh())]);
    }

    public function confirmDelivered(Request $request, RetailOrder $order)
    {
        $data = $request->validate([
            'comment' => ['nullable', 'string', 'max:2000'],
        ]);

        if ($order->status !== 'Shipped') {
            return response()->json(['message' => 'Only shipped orders can be confirmed as delivered.'], 422);
        }

        $order->forceFill([
            'status' => 'Delivered',
            'delivery_comment' => $data['comment'] ?? null,
            'delivered_confirmed_at' => now(),
        ])->save();

        return response()->json(['order' => $this->orderPayload($order->fresh())]);
    }

    private function upsertCustomer(array $data, $source)
    {
        $email = !empty($data['email']) ? Str::lower($data['email']) : null;
        $phone = $data['phone'] ?? null;

        $customer = Customer::query()
            ->when($email, function ($query) use ($email) {
                $query->where('email', $email);
            })
            ->when(!$email && $phone, function ($query) use ($phone) {
                $query->where('phone', $phone);
            })
            ->first();

        if (!$customer) {
            $customer = new Customer();
        }

        $customer->forceFill([
            'name' => $data['name'],
            'phone' => $phone,
            'email' => $email,
            'address' => $data['address'] ?? $customer->address,
            'source' => $source,
            'segment' => $customer->segment ?: 'Regular',
            'status' => 'Active',
        ])->save();

        return $customer;
    }

    private function makeOrderNumber($source)
    {
        $prefix = Str::contains(Str::lower($source), 'scan') ? 'SCAN' : 'WEB';
        return $prefix.'-'.now()->format('ymd').'-'.Str::upper(Str::random(5));
    }

    private function isAllowedAdminTransition($current, $next)
    {
        if ($current === $next) return true;
        if ($current === 'Pending' && $next === 'Packed') return true;
        if ($current === 'Packed' && $next === 'Shipped') return true;
        return false;
    }

    private function isAdmin(Request $request)
    {
        return $request->user() && $request->user()->role === 'Admin';
    }

    private function orderPayload(RetailOrder $order)
    {
        return [
            'id' => $order->order_number,
            'databaseId' => $order->id,
            'customerId' => $order->customer_id,
            'customer' => $order->customer_name,
            'customerName' => $order->customer_name,
            'phone' => $order->phone,
            'email' => $order->email,
            'address' => $order->address,
            'deliveryOption' => $order->delivery_option,
            'deliveryNote' => $order->delivery_note,
            'paymentMethod' => $order->payment_method,
            'paymentStatus' => $order->payment_status,
            'items' => $order->items ?: [],
            'subtotal' => $order->subtotal,
            'deliveryFee' => $order->delivery_fee,
            'total' => $order->total,
            'status' => $order->status,
            'deliveryComment' => $order->delivery_comment,
            'deliveredConfirmedAt' => optional($order->delivered_confirmed_at)->toIso8601String(),
            'progress' => $this->progressForStatus($order->status),
            'date' => optional($order->created_at)->format('M j'),
            'month' => optional($order->created_at)->format('M'),
            'monthIdx' => $order->created_at ? (int) $order->created_at->format('n') - 1 : 0,
            'createdAt' => optional($order->created_at)->toDateTimeString(),
            'updatedAt' => optional($order->updated_at)->toDateTimeString(),
        ];
    }

    private function progressForStatus($status)
    {
        if ($status === 'Delivered') return 100;
        if ($status === 'Shipped') return 75;
        if ($status === 'Packed') return 45;
        return 20;
    }
}
