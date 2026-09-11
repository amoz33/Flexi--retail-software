<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Models\PaymentSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    protected $paystackSecretKey;

    public function __construct()
    {
        // Read lazily, not in the constructor — the constructor can run
        // before tenancy is fully initialized on some request paths, and
        // we don't want a DB lookup to fail before we even know if this
        // request needs one.
    }

    protected function paystackSecretKey()
    {
        if ($this->paystackSecretKey) {
            return $this->paystackSecretKey;
        }

        $settings = PaymentSetting::current();

        if (!$settings->paystack_secret_key) {
            abort(response()->json([
                'error' => 'Paystack is not configured for this account. Add your Paystack secret key in Payment Settings.',
            ], 500));
        }

        return $this->paystackSecretKey = $settings->paystack_secret_key;
    }

    /**
     * Initialize a payment
     */
    public function initialize(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'amount' => 'required|numeric|min:100',
            'reference' => 'required|string|max:255',
            'metadata' => 'nullable|array',
            'callback_url' => 'nullable|url',
        ]);

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->paystackSecretKey(),
                'Content-Type' => 'application/json',
            ])->post('https://api.paystack.co/transaction/initialize', [
                'email' => $validated['email'],
                'amount' => $validated['amount'] * 100, // Convert to kobo
                'reference' => $validated['reference'],
                'metadata' => $validated['metadata'] ?? [],
                'callback_url' => $validated['callback_url'] ?? url('/api/payments/callback'),
            ]);

            $data = $response->json();

            if (!$data['status']) {
                return response()->json([
                    'error' => $data['message'] ?? 'Failed to initialize payment',
                ], 400);
            }

            // Create payment record
            $payment = Payment::create([
                'reference' => $validated['reference'],
                'customer_email' => $validated['email'],
                'amount' => $validated['amount'],
                'currency' => 'NGN',
                'status' => 'initialized',
                'metadata' => json_encode($validated['metadata'] ?? []),
            ]);

            return response()->json([
                'authorization_url' => $data['data']['authorization_url'],
                'access_code' => $data['data']['access_code'],
                'reference' => $validated['reference'],
            ]);

        } catch (\Exception $e) {
            Log::error('Paystack initialization error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to initialize payment',
            ], 500);
        }
    }

    /**
     * Verify a payment
     */
    public function verify(Request $request, $reference)
    {
        try {
            // For development/testing with test references
            if (env('APP_ENV') === 'local' && Str::startsWith($reference, 'test-')) {
                return $this->handleTestVerification($reference);
            }

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->paystackSecretKey(),
            ])->get('https://api.paystack.co/transaction/verify/' . $reference);

            $data = $response->json();

            if (!$data['status']) {
                return response()->json([
                    'error' => $data['message'] ?? 'Failed to verify payment',
                ], 400);
            }

            $transaction = $data['data'];

            // Update payment record
            $payment = Payment::where('reference', $reference)->first();
            
            if ($payment) {
                $payment->update([
                    'status' => $transaction['status'],
                    'gateway_response' => $transaction['gateway_response'],
                    'paid_at' => $transaction['paid_at'] ? now()->parse($transaction['paid_at']) : null,
                    'transaction_data' => json_encode($transaction),
                ]);
            } else {
                // Create payment record if it doesn't exist
                $payment = Payment::create([
                    'reference' => $reference,
                    'customer_email' => $transaction['customer']['email'],
                    'amount' => $transaction['amount'] / 100, // Convert from kobo
                    'currency' => $transaction['currency'],
                    'status' => $transaction['status'],
                    'gateway_response' => $transaction['gateway_response'],
                    'paid_at' => $transaction['paid_at'] ? now()->parse($transaction['paid_at']) : null,
                    'transaction_data' => json_encode($transaction),
                ]);
            }

            return response()->json([
                'status' => $transaction['status'],
                'reference' => $reference,
                'amount' => $transaction['amount'] / 100,
                'currency' => $transaction['currency'],
                'paid_at' => $transaction['paid_at'],
                'gateway_response' => $transaction['gateway_response'],
                'transaction' => $transaction,
            ]);

        } catch (\Exception $e) {
            Log::error('Paystack verification error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to verify payment',
            ], 500);
        }
    }

    /**
     * Handle test verification for development
     */
    protected function handleTestVerification($reference)
    {
        // Simulate a successful payment for test references
        $payment = Payment::where('reference', $reference)->first();
        
        if (!$payment) {
            // Create a test payment record
            $payment = Payment::create([
                'reference' => $reference,
                'customer_email' => 'test@example.com',
                'amount' => 100.00,
                'currency' => 'NGN',
                'status' => 'success',
                'gateway_response' => 'Approved',
                'paid_at' => now(),
                'transaction_data' => json_encode([
                    'reference' => $reference,
                    'status' => 'success',
                    'amount' => 10000,
                    'currency' => 'NGN',
                    'paid_at' => now()->toISOString(),
                ]),
            ]);
        } else {
            $payment->update([
                'status' => 'success',
                'gateway_response' => 'Approved',
                'paid_at' => now(),
            ]);
        }

        return response()->json([
            'status' => 'success',
            'reference' => $reference,
            'amount' => 100.00,
            'currency' => 'NGN',
            'paid_at' => now()->toISOString(),
            'gateway_response' => 'Approved',
            'transaction' => [
                'reference' => $reference,
                'status' => 'success',
                'amount' => 10000,
                'currency' => 'NGN',
                'paid_at' => now()->toISOString(),
            ],
        ]);
    }

    /**
     * Paystack webhook handler
     */
    public function webhook(Request $request)
    {
        $input = $request->all();
        
        // Validate Paystack signature
        $signature = $request->header('x-paystack-signature');
        $expectedSignature = hash_hmac('sha512', $request->getContent(), $this->paystackSecretKey());

        if ($signature !== $expectedSignature) {
            Log::error('Invalid Paystack webhook signature');
            return response()->json(['error' => 'Invalid signature'], 401);
        }

        $event = $input['event'];
        $transaction = $input['data'];

        Log::info('Paystack webhook received: ' . $event, $transaction);

        switch ($event) {
            case 'charge.success':
                $this->handleSuccessfulPayment($transaction);
                break;
            
            case 'charge.failed':
                $this->handleFailedPayment($transaction);
                break;
            
            case 'transfer.success':
                // Handle successful transfer
                break;
            
            case 'transfer.failed':
                // Handle failed transfer
                break;
        }

        return response()->json(['status' => 'success']);
    }

    /**
     * Handle successful payment
     */
    protected function handleSuccessfulPayment($transaction)
    {
        $reference = $transaction['reference'];
        
        // Update payment record
        $payment = Payment::where('reference', $reference)->first();
        
        if ($payment) {
            $payment->update([
                'status' => 'success',
                'gateway_response' => $transaction['gateway_response'],
                'paid_at' => now()->parse($transaction['paid_at']),
                'transaction_data' => json_encode($transaction),
            ]);

            // Find and update associated order
            $metadata = $transaction['metadata'] ?? [];
            $orderId = $metadata['order_id'] ?? null;
            
            if ($orderId) {
                $order = Order::where('id', $orderId)->first();
                if ($order) {
                    $order->update([
                        'payment_status' => 'Paid',
                        'payment_reference' => $reference,
                        'payment_data' => json_encode($transaction),
                    ]);
                }
            }
        } else {
            // Create new payment record
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

        Log::info('Payment successful: ' . $reference);
    }

    /**
     * Handle failed payment
     */
    protected function handleFailedPayment($transaction)
    {
        $reference = $transaction['reference'];
        
        $payment = Payment::where('reference', $reference)->first();
        
        if ($payment) {
            $payment->update([
                'status' => 'failed',
                'gateway_response' => $transaction['gateway_response'],
                'transaction_data' => json_encode($transaction),
            ]);
        }

        Log::warning('Payment failed: ' . $reference);
    }
}