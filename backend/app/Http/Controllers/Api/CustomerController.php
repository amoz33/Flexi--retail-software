<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Only admins can view customers.'], 403);
        }

        return response()->json([
            'customers' => Customer::orderByDesc('updated_at')
                ->get()
                ->map(function (Customer $customer) {
                    return $this->customerPayload($customer);
                }),
        ]);
    }

    private function isAdmin(Request $request)
    {
        return $this->isPrivileged($request);
    }

    private function customerPayload(Customer $customer)
    {
        return [
            'id' => $customer->id,
            'name' => $customer->name,
            'phone' => $customer->phone,
            'email' => $customer->email,
            'address' => $customer->address,
            'segment' => $customer->segment,
            'status' => $customer->status,
            'source' => $customer->source,
            'lastPurchase' => $customer->last_purchase,
            'totalSpent' => $customer->total_spent,
            'createdAt' => optional($customer->created_at)->toIso8601String(),
            'updatedAt' => optional($customer->updated_at)->toIso8601String(),
        ];
    }
}
