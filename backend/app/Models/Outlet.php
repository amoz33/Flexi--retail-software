<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Outlet extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'address',
        'city',
        'state',
        'phone',
        'email',
        'manager_name',
        'opening_time',
        'closing_time',
        'is_active',
        'settings'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'settings' => 'array',
        'opening_time' => 'datetime:H:i',
        'closing_time' => 'datetime:H:i'
    ];

    // Relationships
    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function sales()
    {
        return $this->hasMany(Sale::class);
    }

    public function waste()
    {
        return $this->hasMany(Waste::class);
    }

    public function carts()
    {
        return $this->hasMany(Cart::class);
    }

    public function vendorTransactions()
    {
        return $this->hasMany(VendorTransaction::class);
    }

    public function equipment()
    {
        return $this->hasMany(Equipment::class);
    }
}
