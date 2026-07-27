<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VendorTransaction extends Model
{
    protected $fillable = [
        'transaction_number', 'vendor_id', 'vendor_name', 'product_name', 'sku',
        'quantity', 'unit_cost', 'payment_amount', 'payment_status',
        'payment_method', 'receipt_snapshot', 'vendor_signature', 'transacted_on',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_cost' => 'float',
        'payment_amount' => 'float',
        'transacted_on' => 'date',
    ];
}
