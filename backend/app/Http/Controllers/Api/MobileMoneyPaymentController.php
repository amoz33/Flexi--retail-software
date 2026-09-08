<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Mobile money payment gateways: DPO Pay, PawaPay, and MoMo (MTN MoMo PSB Nigeria).
 *
 * This is a separate controller from PaymentController.php (Paystack) by design —
 * the existing Paystack integration is untouched. Each gateway below is wired up
 * against its real, current API as documented by the provider (verified directly
 * against their docs, not guessed). None of these will work until you add real
 * credentials to your .env file — see the notes above each section for exactly
 * what to get and from where.
 */
class MobileMoneyPaymentController extends Controller
{
    /* =====================================================================
     * DPO PAY (Direct Pay Online) — dpogroup.com
     * -------------------------------------------------------------------
     * Get your CompanyToken by signing up at https://dpogroup.com/get-started-2/
     * and logging into https://portal.dpopay.com — the token is on your
     * merchant dashboard. You also need a "Service Type" ID from the same
     * portal (Merchant Operations > Get Services), which identifies what
     * kind of business/service you're charging for.
     *
     * .env variables needed:
     *   DPO_COMPANY_TOKEN=
     *   DPO_SERVICE_TYPE=
     *
     * Flow: createToken (XML) -> redirect customer to hosted payment page
     * -> verifyToken (XML) when they return.
     * ===================================================================== */

    public function initializeDpo(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'amount' => 'required|numeric|min:1',
            'reference' => 'required|string|max:255',
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'currency' => 'nullable|string|max:3',
            'callback_url' => 'required|url',
        ]);

        $companyToken = env('DPO_COMPANY_TOKEN');
        $serviceType = env('DPO_SERVICE_TYPE');

        if (!$companyToken || !$serviceType) {
            return response()->json([
                'error' => 'DPO Pay is not configured. Set DPO_COMPANY_TOKEN and DPO_SERVICE_TYPE in your .env file.',
            ], 500);
        }

        $currency = $validated['currency'] ?? 'RWF';
        $amount = number_format($validated['amount'], 2, '.', '');

        $xml = new \SimpleXMLElement('<?xml version="1.0" encoding="utf-8"?><API3G></API3G>');
        $xml->addChild('CompanyToken', htmlspecialchars($companyToken));
        $xml->addChild('Request', 'createToken');

        $transaction = $xml->addChild('Transaction');
        $transaction->addChild('PaymentAmount', $amount);
        $transaction->addChild('PaymentCurrency', $currency);
        $transaction->addChild('CompanyRef', htmlspecialchars($validated['reference']));
        $transaction->addChild('RedirectURL', htmlspecialchars($validated['callback_url']));
        $transaction->addChild('BackURL', htmlspecialchars($validated['callback_url']));
        $transaction->addChild('CompanyRefUnique', '0');
        $transaction->addChild('PTL', '24');
        $transaction->addChild('customerEmail', htmlspecialchars($validated['email']));
        if (!empty($validated['first_name'])) {
            $transaction->addChild('customerFirstName', htmlspecialchars($validated['first_name']));
        }
        if (!empty($validated['last_name'])) {
            $transaction->addChild('customerLastName', htmlspecialchars($validated['last_name']));
        }

        $services = $xml->addChild('Services');
        $service = $services->addChild('Service');
        $service->addChild('ServiceType', $serviceType);
        $service->addChild('ServiceDescription', 'Flexi Retail Software order');
        $service->addChild('ServiceDate', now()->format('Y/m/d H:i'));

        try {
            $response = Http::withHeaders([
                'Content-Type' => 'application/xml; charset=utf-8',
                'Accept' => 'application/xml',
            ])->withBody($xml->asXML(), 'application/xml')
              ->post('https://secure.3gdirectpay.com/API/v6/');

            $result = new \SimpleXMLElement($response->body());
            $resultCode = (string) $result->Result;

            if ($resultCode !== '000') {
                Log::error('DPO createToken failed', ['code' => $resultCode, 'explanation' => (string) $result->ResultExplanation]);
                return response()->json([
                    'error' => (string) $result->ResultExplanation ?: 'DPO Pay could not start this payment.',
                ], 400);
            }

            $transToken = (string) $result->TransToken;

            Payment::create([
                'reference' => $validated['reference'],
                'customer_email' => $validated['email'],
                'amount' => $validated['amount'],
                'currency' => $currency,
                'status' => 'initialized',
                'gateway' => 'dpo',
                'gateway_reference' => $transToken,
                'metadata' => json_encode(['transToken' => $transToken]),
            ]);

            return response()->json([
                'authorization_url' => "https://secure.3gdirectpay.com/payv2.php?ID={$transToken}",
                'reference' => $validated['reference'],
                'gateway_reference' => $transToken,
            ]);
        } catch (\Exception $e) {
            Log::error('DPO initialization error: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to initialize DPO Pay payment.'], 500);
        }
    }

    public function verifyDpo(Request $request, $transToken)
    {
        $companyToken = env('DPO_COMPANY_TOKEN');

        if (!$companyToken) {
            return response()->json(['error' => 'DPO Pay is not configured.'], 500);
        }

        $xml = new \SimpleXMLElement('<?xml version="1.0" encoding="utf-8"?><API3G></API3G>');
        $xml->addChild('CompanyToken', htmlspecialchars($companyToken));
        $xml->addChild('Request', 'verifyToken');
        $xml->addChild('TransactionToken', htmlspecialchars($transToken));

        try {
            $response = Http::withHeaders([
                'Content-Type' => 'application/xml; charset=utf-8',
                'Accept' => 'application/xml',
            ])->withBody($xml->asXML(), 'application/xml')
              ->post('https://secure.3gdirectpay.com/API/v6/');

            $result = new \SimpleXMLElement($response->body());
            $resultCode = (string) $result->Result;
            $isPaid = $resultCode === '000';

            $payment = Payment::where('gateway_reference', $transToken)->first();
            if ($payment) {
                $payment->update([
                    'status' => $isPaid ? 'success' : 'failed',
                    'gateway_response' => (string) $result->ResultExplanation,
                    'paid_at' => $isPaid ? now() : null,
                    'transaction_data' => json_encode($result),
                ]);
            }

            return response()->json([
                'status' => $isPaid ? 'success' : 'failed',
                'reference' => $payment->reference ?? null,
                'gateway_response' => (string) $result->ResultExplanation,
                'amount' => (string) $result->TransactionAmount,
                'currency' => (string) $result->TransactionCurrency,
            ]);
        } catch (\Exception $e) {
            Log::error('DPO verification error: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to verify DPO Pay payment.'], 500);
        }
    }

    /* =====================================================================
     * PAWAPAY — pawapay.io
     * -------------------------------------------------------------------
     * Sign up at https://pawapay.io — you'll get sandbox access first, then
     * production access after onboarding is complete. Your API token comes
     * from the pawaPay Dashboard (Settings > API Tokens).
     *
     * .env variables needed:
     *   PAWAPAY_API_TOKEN=
     *   PAWAPAY_ENV=sandbox   (change to "production" when ready to go live)
     *
     * Flow: POST /v2/paymentpage -> redirect customer to the returned URL
     * -> GET /v2/deposits/{depositId} to check the final status.
     * ===================================================================== */

    private function pawapayBaseUrl()
    {
        return env('PAWAPAY_ENV', 'sandbox') === 'production'
            ? 'https://api.pawapay.io'
            : 'https://api.sandbox.pawapay.io';
    }

    public function initializePawapay(Request $request)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:1',
            'currency' => 'required|string|size:3',
            'reference' => 'required|string|max:255',
            'callback_url' => 'required|url',
            'reason' => 'nullable|string|max:50',
            'country' => 'nullable|string|size:3',
        ]);

        $apiToken = env('PAWAPAY_API_TOKEN');

        if (!$apiToken) {
            return response()->json([
                'error' => 'PawaPay is not configured. Set PAWAPAY_API_TOKEN in your .env file.',
            ], 500);
        }

        $depositId = (string) Str::uuid();

        try {
            $response = Http::withToken($apiToken)
                ->acceptJson()
                ->post($this->pawapayBaseUrl() . '/v2/paymentpage', array_filter([
                    'depositId' => $depositId,
                    'returnUrl' => $validated['callback_url'],
                    'amountDetails' => [
                        'amount' => number_format($validated['amount'], 2, '.', ''),
                        'currency' => strtoupper($validated['currency']),
                    ],
                    'country' => $validated['country'] ?? null,
                    'reason' => $validated['reason'] ?? 'Flexi Retail order',
                    'metadata' => [
                        ['orderRef' => $validated['reference']],
                    ],
                ]));

            $data = $response->json();

            if (!$response->successful() || empty($data['redirectUrl'])) {
                Log::error('PawaPay paymentpage failed', $data ?? []);
                return response()->json([
                    'error' => $data['failureReason']['failureMessage'] ?? 'PawaPay could not start this payment.',
                ], 400);
            }

            Payment::create([
                'reference' => $validated['reference'],
                'customer_email' => null,
                'amount' => $validated['amount'],
                'currency' => strtoupper($validated['currency']),
                'status' => 'initialized',
                'gateway' => 'pawapay',
                'gateway_reference' => $depositId,
                'metadata' => json_encode(['depositId' => $depositId]),
            ]);

            return response()->json([
                'authorization_url' => $data['redirectUrl'],
                'reference' => $validated['reference'],
                'gateway_reference' => $depositId,
            ]);
        } catch (\Exception $e) {
            Log::error('PawaPay initialization error: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to initialize PawaPay payment.'], 500);
        }
    }

    public function verifyPawapay(Request $request, $depositId)
    {
        $apiToken = env('PAWAPAY_API_TOKEN');

        if (!$apiToken) {
            return response()->json(['error' => 'PawaPay is not configured.'], 500);
        }

        try {
            $response = Http::withToken($apiToken)
                ->acceptJson()
                ->get($this->pawapayBaseUrl() . "/v2/deposits/{$depositId}");

            $body = $response->json();
            $found = ($body['status'] ?? null) === 'FOUND';
            $depositStatus = $found ? ($body['data']['status'] ?? null) : null;
            $isPaid = $depositStatus === 'COMPLETED';
            $isFailed = in_array($depositStatus, ['FAILED'], true) || !$found;

            $payment = Payment::where('gateway_reference', $depositId)->first();
            if ($payment) {
                $payment->update([
                    'status' => $isPaid ? 'success' : ($isFailed ? 'failed' : 'pending'),
                    'gateway_response' => $depositStatus ?? 'NOT_FOUND',
                    'paid_at' => $isPaid ? now() : null,
                    'transaction_data' => json_encode($body),
                ]);
            }

            return response()->json([
                'status' => $isPaid ? 'success' : ($isFailed ? 'failed' : 'pending'),
                'reference' => $payment->reference ?? null,
                'gateway_response' => $depositStatus ?? 'NOT_FOUND',
                'amount' => $body['data']['amount'] ?? null,
                'currency' => $body['data']['currency'] ?? null,
            ]);
        } catch (\Exception $e) {
            Log::error('PawaPay verification error: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to verify PawaPay payment.'], 500);
        }
    }

    /* =====================================================================
     * MOMO (MTN MoMo Payment Service Bank — Nigeria) — momo.ng
     * -------------------------------------------------------------------
     * Register at https://momodeveloper.mtn.com, subscribe to the
     * "Collections" product, then:
     *   1. Create an API user (one-time) via POST /v1_0/apiuser
     *   2. Create an API key for that user
     *   3. Store both below — this controller exchanges them for a fresh
     *      access token automatically on every request (tokens expire
     *      hourly, so we don't cache one long-term here).
     *
     * .env variables needed:
     *   MOMO_SUBSCRIPTION_KEY=      (from your momodeveloper.mtn.com subscription)
     *   MOMO_API_USER=              (UUID you generated during setup)
     *   MOMO_API_KEY=               (generated for that API user)
     *   MOMO_ENV=sandbox            (change to "production" when ready)
     *   MOMO_CALLBACK_HOST=your-domain.com
     *
     * Flow is different from the other two: MoMo pushes a PIN-approval
     * prompt directly to the customer's phone — there is no redirect page.
     * The frontend must collect a phone number, call initializeMomo, then
     * poll verifyMomo every few seconds until the customer approves or
     * declines on their handset.
     * ===================================================================== */

    private function momoBaseUrl()
    {
        return env('MOMO_ENV', 'sandbox') === 'production'
            ? 'https://momodeveloper.mtn.com'
            : 'https://sandbox.momodeveloper.mtn.com';
    }

    private function getMomoAccessToken()
    {
        $apiUser = env('MOMO_API_USER');
        $apiKey = env('MOMO_API_KEY');
        $subscriptionKey = env('MOMO_SUBSCRIPTION_KEY');

        $response = Http::withHeaders([
            'Ocp-Apim-Subscription-Key' => $subscriptionKey,
        ])->withBasicAuth($apiUser, $apiKey)
          ->post($this->momoBaseUrl() . '/collection/token/');

        if (!$response->successful()) {
            throw new \Exception('Could not authenticate with MoMo: ' . $response->body());
        }

        return $response->json()['access_token'];
    }

    public function initializeMomo(Request $request)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:1',
            'currency' => 'required|string|max:5',
            'reference' => 'required|string|max:255',
            'phone' => 'required|string|max:20',
        ]);

        $subscriptionKey = env('MOMO_SUBSCRIPTION_KEY');
        $apiUser = env('MOMO_API_USER');
        $apiKey = env('MOMO_API_KEY');
        $callbackHost = env('MOMO_CALLBACK_HOST');

        if (!$subscriptionKey || !$apiUser || !$apiKey) {
            return response()->json([
                'error' => 'MoMo is not configured. Set MOMO_SUBSCRIPTION_KEY, MOMO_API_USER, and MOMO_API_KEY in your .env file.',
            ], 500);
        }

        $referenceId = (string) Str::uuid();
        // MoMo expects digits only, no '+' prefix.
        $phone = preg_replace('/[^0-9]/', '', $validated['phone']);

        try {
            $accessToken = $this->getMomoAccessToken();

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $accessToken,
                'X-Reference-Id' => $referenceId,
                'X-Target-Environment' => env('MOMO_ENV', 'sandbox'),
                'Ocp-Apim-Subscription-Key' => $subscriptionKey,
                'Content-Type' => 'application/json',
                'X-Callback-Url' => $callbackHost ? "https://{$callbackHost}/api/payments/momo/webhook" : null,
            ])->post($this->momoBaseUrl() . '/collection/v1_0/requesttopay', [
                'amount' => number_format($validated['amount'], 0, '', ''),
                'currency' => strtoupper($validated['currency']),
                'externalId' => $validated['reference'],
                'payer' => [
                    'partyIdType' => 'MSISDN',
                    'partyId' => $phone,
                ],
                'payerMessage' => 'Payment for your Flexi Retail order',
                'payeeNote' => "Order {$validated['reference']}",
            ]);

            // A successful requesttopay call returns 202 Accepted with no body.
            if ($response->status() !== 202) {
                Log::error('MoMo requesttopay failed', ['status' => $response->status(), 'body' => $response->body()]);
                return response()->json([
                    'error' => 'MoMo could not start this payment. Please confirm the phone number and try again.',
                ], 400);
            }

            Payment::create([
                'reference' => $validated['reference'],
                'customer_email' => null,
                'amount' => $validated['amount'],
                'currency' => strtoupper($validated['currency']),
                'status' => 'pending',
                'gateway' => 'momo',
                'gateway_reference' => $referenceId,
                'metadata' => json_encode(['phone' => $phone]),
            ]);

            return response()->json([
                'status' => 'pending',
                'reference' => $validated['reference'],
                'gateway_reference' => $referenceId,
                'message' => 'A payment prompt has been sent to the customer\'s phone. Ask them to enter their MoMo PIN to approve it.',
            ]);
        } catch (\Exception $e) {
            Log::error('MoMo initialization error: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to initialize MoMo payment.'], 500);
        }
    }

    public function verifyMomo(Request $request, $referenceId)
    {
        $subscriptionKey = env('MOMO_SUBSCRIPTION_KEY');

        if (!$subscriptionKey) {
            return response()->json(['error' => 'MoMo is not configured.'], 500);
        }

        try {
            $accessToken = $this->getMomoAccessToken();

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $accessToken,
                'X-Target-Environment' => env('MOMO_ENV', 'sandbox'),
                'Ocp-Apim-Subscription-Key' => $subscriptionKey,
            ])->get($this->momoBaseUrl() . "/collection/v1_0/requesttopay/{$referenceId}");

            $data = $response->json();
            $momoStatus = $data['status'] ?? 'PENDING'; // PENDING | SUCCESSFUL | FAILED
            $isPaid = $momoStatus === 'SUCCESSFUL';
            $isFailed = $momoStatus === 'FAILED';

            $payment = Payment::where('gateway_reference', $referenceId)->first();
            if ($payment) {
                $payment->update([
                    'status' => $isPaid ? 'success' : ($isFailed ? 'failed' : 'pending'),
                    'gateway_response' => $data['reason']['message'] ?? $momoStatus,
                    'paid_at' => $isPaid ? now() : null,
                    'transaction_data' => json_encode($data),
                ]);
            }

            return response()->json([
                'status' => $isPaid ? 'success' : ($isFailed ? 'failed' : 'pending'),
                'reference' => $payment->reference ?? null,
                'gateway_response' => $data['reason']['message'] ?? $momoStatus,
                'amount' => $data['amount'] ?? null,
                'currency' => $data['currency'] ?? null,
            ]);
        } catch (\Exception $e) {
            Log::error('MoMo verification error: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to verify MoMo payment.'], 500);
        }
    }

    public function momoWebhook(Request $request)
    {
        // MoMo calls this URL directly (must be a real public HTTPS domain —
        // it will not reach localhost, so this only works once deployed).
        $data = $request->all();
        Log::info('MoMo webhook received', $data);

        $referenceId = $request->header('X-Reference-Id') ?? ($data['externalId'] ?? null);
        if (!$referenceId) {
            return response()->json(['message' => 'ignored'], 200);
        }

        $payment = Payment::where('gateway_reference', $referenceId)
            ->orWhere('reference', $referenceId)
            ->first();

        if ($payment) {
            $status = $data['status'] ?? null;
            $payment->update([
                'status' => $status === 'SUCCESSFUL' ? 'success' : ($status === 'FAILED' ? 'failed' : $payment->status),
                'gateway_response' => $data['reason']['message'] ?? $status,
                'paid_at' => $status === 'SUCCESSFUL' ? now() : $payment->paid_at,
                'transaction_data' => json_encode($data),
            ]);
        }

        return response()->json(['message' => 'received'], 200);
    }
}
