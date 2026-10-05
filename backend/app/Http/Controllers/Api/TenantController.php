<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantNginxSync;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Stancl\Tenancy\Database\Models\Domain;

class TenantController extends Controller
{
    public function index(Request $request)
    {
        $tenants = tenancy()->central(function () {
            return Tenant::with('domains')->get()->map(function ($tenant) {
                return [
                    'id' => $tenant->id,
                    'domains' => $tenant->domains->pluck('domain'),
                    'created_at' => optional($tenant->created_at)->toIso8601String(),
                ];
            });
        });

        return response()->json(['tenants' => $tenants]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'subdomain' => ['required', 'string', 'min:3', 'max:30', 'regex:/^[a-z0-9]+$/'],
            'admin_name' => ['required', 'string', 'max:255'],
            'admin_email' => ['required', 'email', 'max:255'],
            'admin_password' => ['nullable', 'string', 'min:8', 'max:255'],
        ]);

        $subdomain = Str::lower($data['subdomain']);

        $result = tenancy()->central(function () use ($subdomain, $data) {
            if (Domain::where('domain', $subdomain)->exists()) {
                return ['error' => 'That subdomain is already taken.'];
            }

            $tenant = Tenant::create(['id' => $subdomain]);
            $tenant->domains()->create(['domain' => $subdomain]);

            $password = $data['admin_password'] ?? (Str::random(4).'-'.Str::random(4).'-'.Str::random(4));

            tenancy()->initialize($tenant);

            User::create([
                'name' => $data['admin_name'],
                'email' => Str::lower($data['admin_email']),
                'role' => 'Admin',
                'password' => Hash::make($password),
                'is_active' => true,
                'allowed_pages' => [],
                'email_verified_at' => now(),
            ]);

            tenancy()->end();

            return [
                'tenant_id' => $tenant->id,
                'domain' => $subdomain.'.flexisoftware.ng',
                'admin_email' => Str::lower($data['admin_email']),
                'admin_password' => $password,
            ];
        });

        if (isset($result['error'])) {
            return response()->json(['message' => $result['error']], 422);
        }

        // Refresh the nginx allow-list so the new subdomain starts resolving.
        $routingSynced = app(TenantNginxSync::class)->sync();

        return response()->json([
            'tenant' => $result,
            'routing_synced' => $routingSynced,
        ], 201);
    }
}