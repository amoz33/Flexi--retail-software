<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Outlet;
use Illuminate\Http\Request;

class OutletController extends Controller
{
    public function index(Request $request)
    {
        // Check if user is admin
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $outlets = Outlet::orderBy('name')->get();
        
        return response()->json([
            'outlets' => $outlets
        ]);
    }

    public function store(Request $request)
    {
        // Check if user is admin
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $data = $request->validate([
            'name' => 'required|string|max:255|unique:outlets',
            'code' => 'required|string|max:50|unique:outlets',
            'address' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'manager_name' => 'nullable|string|max:100',
            'opening_time' => 'nullable|date_format:H:i',
            'closing_time' => 'nullable|date_format:H:i',
            'is_active' => 'nullable|boolean',
            'settings' => 'nullable|array'
        ]);

        $outlet = Outlet::create($data);

        return response()->json([
            'message' => 'Outlet created successfully',
            'outlet' => $outlet
        ], 201);
    }

    public function show(Request $request, $id)
    {
        // Check if user is admin
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $outlet = Outlet::findOrFail($id);

        return response()->json([
            'outlet' => $outlet
        ]);
    }

    public function update(Request $request, $id)
    {
        // Check if user is admin
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $outlet = Outlet::findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255|unique:outlets,name,' . $id,
            'code' => 'sometimes|string|max:50|unique:outlets,code,' . $id,
            'address' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'manager_name' => 'nullable|string|max:100',
            'opening_time' => 'nullable|date_format:H:i',
            'closing_time' => 'nullable|date_format:H:i',
            'is_active' => 'nullable|boolean',
            'settings' => 'nullable|array'
        ]);

        $outlet->update($data);

        return response()->json([
            'message' => 'Outlet updated successfully',
            'outlet' => $outlet
        ]);
    }

    public function destroy(Request $request, $id)
    {
        // Check if user is admin
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $outlet = Outlet::findOrFail($id);
        
        // Check if outlet has any associated data
        $hasData = $outlet->users()->exists() || 
                   $outlet->products()->exists() || 
                   $outlet->orders()->exists() || 
                   $outlet->sales()->exists();

        if ($hasData) {
            return response()->json([
                'message' => 'Cannot delete outlet that has associated data. Deactivate it instead.'
            ], 400);
        }

        $outlet->delete();

        return response()->json([
            'message' => 'Outlet deleted successfully'
        ]);
    }

    public function toggleStatus(Request $request, $id)
    {
        // Check if user is admin
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $outlet = Outlet::findOrFail($id);
        $outlet->is_active = !$outlet->is_active;
        $outlet->save();

        return response()->json([
            'message' => 'Outlet status updated successfully',
            'outlet' => $outlet
        ]);
    }

    public function statistics(Request $request, $id)
    {
        // Check if user is admin
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $outlet = Outlet::findOrFail($id);

        // Get outlet statistics
        $stats = [
            'total_products' => $outlet->products()->count(),
            'total_orders' => $outlet->orders()->count(),
            'total_sales' => $outlet->sales()->count(),
            'active_staff' => $outlet->users()->where('is_active', true)->count(),
            'total_revenue' => $outlet->orders()->sum('total') + $outlet->sales()->sum('total'),
            'this_month_revenue' => $outlet->orders()->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)->sum('total') + 
                $outlet->sales()->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)->sum('total')
        ];

        return response()->json([
            'outlet' => $outlet,
            'statistics' => $stats
        ]);
    }

    private function isAdmin(Request $request)
    {
        $user = $request->user();
        return $user && $user->email === 'admin@flexiretail.ng';
    }
}