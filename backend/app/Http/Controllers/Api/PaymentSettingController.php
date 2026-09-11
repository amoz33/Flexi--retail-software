<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentSetting;
use Illuminate\Http\Request;

class PaymentSettingController extends Controller
{
    public function show(Request $request)
    {
        if (!$this->isPrivileged($request)) {
            return response()->json(['message' => 'Only admins can view payment settings.'], 403);
        }

        $settings = PaymentSetting::current();

        // Secret keys are write-only from the API's perspective — we tell the
        // frontend whether each one is SET, never send the actual value back.
        return response()->json([
            'settings' => [
                'paystackConfigured' => (bool) $settings->paystack_secret_key,
                'dpoConfigured' => (bool) ($settings->dpo_company_token && $settings->dpo_service_type),
                'pawapayConfigured' => (bool) $settings->pawapay_api_token,
                'pawapayEnv' => $settings->pawapay_env,
                'momoConfigured' => (bool) ($settings->momo_subscription_key && $settings->momo_api_user && $settings->momo_api_key),
                'momoEnv' => $settings->momo_env,
                'momoCallbackHost' => $settings->momo_callback_host,
            ],
        ]);
    }

    public function update(Request $request)
    {
        if (!$this->isPrivileged($request)) {
            return response()->json(['message' => 'Only admins can update payment settings.'], 403);
        }

        $data = $request->validate([
            'paystackSecretKey' => 'nullable|string|max:255',
            'dpoCompanyToken' => 'nullable|string|max:255',
            'dpoServiceType' => 'nullable|string|max:255',
            'pawapayApiToken' => 'nullable|string|max:255',
            'pawapayEnv' => 'nullable|in:sandbox,production',
            'momoSubscriptionKey' => 'nullable|string|max:255',
            'momoApiUser' => 'nullable|string|max:255',
            'momoApiKey' => 'nullable|string|max:255',
            'momoEnv' => 'nullable|in:sandbox,production',
            'momoCallbackHost' => 'nullable|string|max:255',
        ]);

        $settings = PaymentSetting::current();

        // Only overwrite a field if the request actually sent a non-empty
        // value for it — this lets the frontend send a partial update (e.g.
        // just updating the Paystack key) without wiping the others blank.
        $updates = [];
        $map = [
            'paystackSecretKey' => 'paystack_secret_key',
            'dpoCompanyToken' => 'dpo_company_token',
            'dpoServiceType' => 'dpo_service_type',
            'pawapayApiToken' => 'pawapay_api_token',
            'pawapayEnv' => 'pawapay_env',
            'momoSubscriptionKey' => 'momo_subscription_key',
            'momoApiUser' => 'momo_api_user',
            'momoApiKey' => 'momo_api_key',
            'momoEnv' => 'momo_env',
            'momoCallbackHost' => 'momo_callback_host',
        ];

        foreach ($map as $requestKey => $column) {
            if (array_key_exists($requestKey, $data) && $data[$requestKey] !== null && $data[$requestKey] !== '') {
                $updates[$column] = $data[$requestKey];
            }
        }

        $settings->update($updates);

        return response()->json(['message' => 'Payment settings updated.']);
    }
}
