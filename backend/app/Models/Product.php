<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'name', 'sku', 'barcode', 'category', 'expiry_date', 'description',
        'images', 'attribute_data', 'variants', 'price', 'cost_price',
        'stock', 'sold_count', 'front_desk_visible', 'outlet_id',
    ];

    protected $casts = [
        'images' => 'array',
        'attribute_data' => 'array',
        'variants' => 'array',
        'expiry_date' => 'date:Y-m-d',
        'price' => 'float',
        'cost_price' => 'float',
        'stock' => 'integer',
        'sold_count' => 'integer',
        'front_desk_visible' => 'boolean',
    ];
}
