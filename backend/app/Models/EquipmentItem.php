<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EquipmentItem extends Model
{
    protected $fillable = [
        'name', 'category', 'location', 'quantity', 'status', 'note', 'outlet_id',
    ];

    protected $casts = [
        'quantity' => 'integer',
    ];
}
