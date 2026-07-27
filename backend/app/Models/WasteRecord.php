<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WasteRecord extends Model
{
    protected $fillable = [
        'item_name', 'item_type', 'reason', 'quantity', 'action',
        'note', 'product_id', 'equipment_id', 'user_id',
    ];

    protected $casts = [
        'quantity' => 'integer',
    ];
}
