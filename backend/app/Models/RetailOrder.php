<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RetailOrder extends Model
{
    protected $fillable = [
        'order_number',
        'customer_id',
        'customer_name',
        'phone',
        'email',
        'address',
        'delivery_option',
        'delivery_note',
        'payment_method',
        'payment_status',
        'items',
        'subtotal',
        'delivery_fee',
        'total',
        'status',
        'delivery_comment',
        'delivered_confirmed_at',
    ];

    protected $casts = [
        'items' => 'array',
        'subtotal' => 'float',
        'delivery_fee' => 'float',
        'total' => 'float',
        'delivered_confirmed_at' => 'datetime',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}
