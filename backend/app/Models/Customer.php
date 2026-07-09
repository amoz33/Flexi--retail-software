<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    protected $fillable = [
        'name',
        'phone',
        'email',
        'address',
        'segment',
        'status',
        'source',
        'last_purchase',
        'total_spent',
    ];

    protected $casts = [
        'total_spent' => 'float',
    ];

    public function orders()
    {
        return $this->hasMany(RetailOrder::class);
    }
}
