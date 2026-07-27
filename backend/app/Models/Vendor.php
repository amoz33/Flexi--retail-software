<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Vendor extends Model
{
    protected $fillable = [
        'name', 'contact_name', 'phone', 'email',
        'account_number', 'address', 'status', 'notes',
    ];
}
