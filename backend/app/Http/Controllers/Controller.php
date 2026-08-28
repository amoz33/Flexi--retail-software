<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Bus\DispatchesJobs;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Http\Request;

class Controller extends BaseController
{
    use AuthorizesRequests, DispatchesJobs, ValidatesRequests;

    protected function requestedOutletId(Request $request)
    {
        $user = $request->user();
        return $user && $user->role === 'Admin' && $request->filled('outlet_id')
            ? (int) $request->input('outlet_id')
            : ($user ? $user->outlet_id : null);
    }

    protected function scopeToOutlet($query, Request $request)
    {
        $outletId = $this->requestedOutletId($request);
        return $outletId ? $query->where('outlet_id', $outletId) : $query;
    }
}
