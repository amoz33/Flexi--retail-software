<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cart extends Model
{
    protected $table = 'carts';

    protected $fillable = [
        'session_id',
        'user_id',
        'items',
        'expires_at',
    ];

    protected $casts = [
        'items' => 'array',
        'expires_at' => 'datetime',
    ];

    protected $attributes = [
        'items' => '[]',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}