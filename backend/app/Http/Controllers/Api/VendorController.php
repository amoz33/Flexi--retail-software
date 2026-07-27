<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vendor;
use Illuminate\Http\Request;

class VendorController extends Controller
{
    public function index(Request $request)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Only admins can view vendors.'], 403);
        }

        return response()->json([
            'vendors' => Vendor::orderByDesc('created_at')->get()->map(function (Vendor $vendor) {
                return $this->vendorPayload($vendor);
            }),
        ]);
    }

    public function store(Request $request)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Only admins can manage vendors.'], 403);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'contactName' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'accountNumber' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:500'],
            'status' => ['nullable', 'string', 'max:30'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $vendor = Vendor::create([
            'name' => $data['name'],
            'contact_name' => $data['contactName'] ?? null,
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'] ?? null,
            'account_number' => $data['accountNumber'] ?? null,
            'address' => $data['address'] ?? null,
            'status' => $data['status'] ?? 'Active',
            'notes' => $data['notes'] ?? null,
        ]);

        return response()->json(['vendor' => $this->vendorPayload($vendor)], 201);
    }

    public function destroy(Request $request, Vendor $vendor)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Only admins can manage vendors.'], 403);
        }

        $vendor->delete();

        return response()->json(['message' => 'Vendor deleted.']);
    }

    private function isAdmin(Request $request)
    {
        return $request->user() && $request->user()->role === 'Admin';
    }

    private function vendorPayload(Vendor $vendor)
    {
        return [
            'id' => $vendor->id,
            'name' => $vendor->name,
            'contactName' => $vendor->contact_name,
            'phone' => $vendor->phone,
            'email' => $vendor->email,
            'accountNumber' => $vendor->account_number,
            'address' => $vendor->address,
            'status' => $vendor->status,
            'notes' => $vendor->notes,
        ];
    }
}
