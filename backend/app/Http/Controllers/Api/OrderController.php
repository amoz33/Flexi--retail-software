<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Payment;
use App\Models\Product;
use App\Models\RetailOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
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
            'orders' => $this->scopeToOutlet(RetailOrder::query(), $request)->orderByDesc('created_at')
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
            'payment_reference' => ['nullable', 'string', 'max:255'],
            'payment_data' => ['nullable', 'array'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.name' => ['required', 'string', 'max:255'],
            'items.*.sku' => ['nullable', 'string', 'max:100'],
            'items.*.price' => ['required', 'numeric', 'min:0'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'subtotal' => ['required', 'numeric', 'min:0'],
            'delivery_fee' => ['sometimes', 'numeric', 'min:0'],
            'total' => ['required', 'numeric', 'min:0'],
        ]);

        // If payment reference is provided, verify payment is successful
        if (!empty($data['payment_reference'])) {
            $this->verifyPayment($data['payment_reference']);
        }

        $order = DB::transaction(function () use ($data, $request) {
            foreach ($data['items'] as $item) {
                if (empty($item['sku'])) {
                    continue;
                }

                $product = $this->scopeToOutlet(Product::query(), $request)
                    ->where('sku', $item['sku'])
                    ->lockForUpdate()
                    ->first();
                if (!$product) {
                    continue;
                }

                if ($product->stock < $item['quantity']) {
                    abort(response()->json([
                        'message' => "Insufficient stock for {$product->name}. Only {$product->stock} left.",
                    ], 422));
                }

                $product->stock -= $item['quantity'];
                $product->sold_count += $item['quantity'];
                $product->save();
            }

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
                'payment_reference' => $data['payment_reference'] ?? null,
                'payment_data' => $data['payment_data'] ?? null,
                'items' => $data['items'],
                'subtotal' => $data['subtotal'],
                'delivery_fee' => $data['delivery_fee'] ?? 0,
                'total' => $data['total'],
                'status' => 'Pending',
                'outlet_id' => $this->requestedOutletId($request),
            ]);

            $customer->forceFill([
                'address' => $customerData['address'] ?? $customer->address,
                'last_purchase' => $firstItem,
                'total_spent' => $customer->total_spent + $order->total,
                'status' => 'Active',
            ])->save();

            return $order;
        });

        return response()->json([
            'order' => $this->orderPayload($order->fresh()),
            'customer' => [
                'id' => $order->customer_id,
                'name' => $order->customer_name,
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
            'paymentReference' => $order->payment_reference,
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

    /**
     * Verify payment with Paystack
     */
    private function verifyPayment($reference)
    {
        $paystackSecretKey = env('PAYSTACK_SECRET_KEY');
        
        if (!$paystackSecretKey) {
            throw new \Exception('Paystack secret key not configured');
        }

        // For development/testing with test references
        if (env('APP_ENV') === 'local' && Str::startsWith($reference, 'test-')) {
            return $this->handleTestPayment($reference);
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $paystackSecretKey,
            ])->get('https://api.paystack.co/transaction/verify/' . $reference);

            $data = $response->json();

            if (!$data['status'] || $data['data']['status'] !== 'success') {
                throw new \Exception('Payment verification failed or payment not successful');
            }

            // Check if payment already exists
            $payment = Payment::where('reference', $reference)->first();
            
            if (!$payment) {
                $transaction = $data['data'];
                Payment::create([
                    'reference' => $reference,
                    'customer_email' => $transaction['customer']['email'],
                    'amount' => $transaction['amount'] / 100,
                    'currency' => $transaction['currency'],
                    'status' => 'success',
                    'gateway_response' => $transaction['gateway_response'],
                    'paid_at' => now()->parse($transaction['paid_at']),
                    'transaction_data' => json_encode($transaction),
                ]);
            }

            return true;
        } catch (\Exception $e) {
            throw new \Exception('Payment verification failed: ' . $e->getMessage());
        }
    }

    /**
     * Handle test payment for development
     */
    private function handleTestPayment($reference)
    {
        // Simulate successful payment for test references
        $payment = Payment::where('reference', $reference)->first();
        
        if (!$payment) {
            Payment::create([
                'reference' => $reference,
                'customer_email' => 'test@example.com',
                'amount' => 100.00,
                'currency' => 'NGN',
                'status' => 'success',
                'gateway_response' => 'Test payment approved',
                'paid_at' => now(),
                'transaction_data' => json_encode([
                    'reference' => $reference,
                    'status' => 'success',
                    'amount' => 10000,
                    'currency' => 'NGN',
                    'paid_at' => now()->toISOString(),
                ]),
            ]);
        }

        return true;
    }
}
