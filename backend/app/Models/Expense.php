<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Expense extends Model
{
    protected $fillable = [
        'expense_number', 'outlet_id', 'category', 'description', 'amount',
        'payment_method', 'receipt_snapshot', 'logged_by_id', 'logged_by_name',
        'expensed_on',
    ];

    protected $casts = [
        'amount' => 'float',
        'expensed_on' => 'date',
    ];

    public function outlet()
    {
        return $this->belongsTo(Outlet::class);
    }
}
