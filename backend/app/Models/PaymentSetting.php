<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentSetting extends Model
{
    protected $fillable = [
        'paystack_secret_key',
        'dpo_company_token',
        'dpo_service_type',
        'pawapay_api_token',
        'pawapay_env',
        'momo_subscription_key',
        'momo_api_user',
        'momo_api_key',
        'momo_env',
        'momo_callback_host',
    ];

    // There's only ever one row per tenant database — tenancy itself
    // provides the isolation, so no tenant_id column is needed here.
    public static function current(): self
    {
        return static::firstOrCreate([]);
    }
}
