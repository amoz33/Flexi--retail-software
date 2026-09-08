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
        return $user && $this->isPrivileged($request) && $request->filled('outlet_id')
            ? (int) $request->input('outlet_id')
            : ($user ? $user->outlet_id : null);
    }

    protected function scopeToOutlet($query, Request $request)
    {
        $outletId = $this->requestedOutletId($request);
        return $outletId ? $query->where('outlet_id', $outletId) : $query;
    }

    /**
     * Admin and Developer both have full access. Developer additionally
     * bypasses the 5-user staff registration cap (enforced in StaffController).
     */
    protected function isPrivileged(Request $request)
    {
        return $request->user() && in_array($request->user()->role, ['Admin', 'Developer'], true);
    }
}
