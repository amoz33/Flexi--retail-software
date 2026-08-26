<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Sale extends Model
{
    protected $fillable = [
        'sale_number', 'user_id', 'cashier_name', 'customer_name',
        'customer_phone', 'payment_method', 'items',
        'subtotal', 'discount', 'total', 'outlet_id',
    ];

    protected $casts = [
        'items' => 'array',
        'subtotal' => 'float',
        'discount' => 'float',
        'total' => 'float',
    ];
}