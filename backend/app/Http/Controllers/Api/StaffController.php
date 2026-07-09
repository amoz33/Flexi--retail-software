<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StaffController extends Controller
{
    private $roles = ['Admin', 'Manager', 'Cashier', 'Inventory', 'Staff'];

    public function index(Request $request)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Only admins can manage staff.'], 403);
        }

        return response()->json([
            'staff' => User::where('role', '!=', 'Customer')
                ->orderBy('name')
                ->get()
                ->map(function (User $user) {
                    return $this->staffPayload($user);
                })
                ->values(),
        ]);
    }

    public function store(Request $request)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Only admins can create staff.'], 403);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:2000'],
            'role' => ['required', Rule::in($this->roles)],
            'allowed_pages' => ['sometimes', 'array'],
            'allowed_pages.*' => ['string', 'max:100'],
        ]);

        $password = $this->generatePassword();

        $user = User::create([
            'name' => $data['name'],
            'email' => Str::lower($data['email']),
            'phone' => $data['phone'] ?? null,
            'address' => $data['address'] ?? null,
            'role' => $data['role'],
            'password' => Hash::make($password),
            'is_active' => true,
            'allowed_pages' => $data['allowed_pages'] ?? [],
            'email_verified_at' => now(),
        ]);

        return response()->json([
            'staff' => $this->staffPayload($user),
            'generated_password' => $password,
        ], 201);
    }

    public function update(Request $request, User $staff)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Only admins can update staff.'], 403);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($staff->id)],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:2000'],
            'role' => ['required', Rule::in($this->roles)],
            'allowed_pages' => ['sometimes', 'array'],
            'allowed_pages.*' => ['string', 'max:100'],
        ]);

        $staff->forceFill([
            'name' => $data['name'],
            'email' => Str::lower($data['email']),
            'phone' => $data['phone'] ?? null,
            'address' => $data['address'] ?? null,
            'role' => $data['role'],
            'allowed_pages' => $data['allowed_pages'] ?? [],
        ])->save();

        return response()->json([
            'staff' => $this->staffPayload($staff->fresh()),
        ]);
    }

    public function toggleStatus(Request $request, User $staff)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Only admins can update staff.'], 403);
        }

        if ($request->user()->id === $staff->id) {
            return response()->json(['message' => 'You cannot deactivate your own admin account.'], 422);
        }

        $data = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $staff->forceFill(['is_active' => $data['is_active']])->save();

        return response()->json([
            'staff' => $this->staffPayload($staff->fresh()),
        ]);
    }

    public function resetPassword(Request $request, User $staff)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Only admins can reset staff passwords.'], 403);
        }

        if ($staff->role === 'Admin') {
            return response()->json(['message' => 'Admin passwords cannot be reset from the staff table.'], 422);
        }

        $password = $this->generatePassword();
        $staff->forceFill(['password' => Hash::make($password)])->save();

        return response()->json([
            'staff' => $this->staffPayload($staff->fresh()),
            'generated_password' => $password,
        ]);
    }

    private function isAdmin(Request $request)
    {
        return $request->user() && $request->user()->role === 'Admin';
    }

    private function generatePassword()
    {
        return Str::random(4).'-'.Str::random(4).'-'.Str::random(4);
    }

    private function staffPayload(User $user)
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'address' => $user->address,
            'role' => $user->role,
            'is_active' => (bool) $user->is_active,
            'allowed_pages' => $user->allowed_pages ?: [],
            'created_at' => optional($user->created_at)->toIso8601String(),
            'updated_at' => optional($user->updated_at)->toIso8601String(),
        ];
    }
}
