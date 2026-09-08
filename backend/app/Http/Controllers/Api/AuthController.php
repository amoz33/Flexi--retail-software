<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuthToken;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'max:255'],
            'remember'=> ['sometimes', 'boolean'],
        ]);

        $email = Str::lower($credentials['email']);

        try {
            $user = User::where('email', $email)->first();
        } catch (QueryException $exception) {
            report($exception);

            return response()->json([
                'message' => 'Login service is unavailable. Please start MySQL and run the backend migrations.',
            ], 503);
        }

        if (!$user || !$user->is_active || !Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $plainToken = bin2hex(random_bytes(32));
        $expiresAt = Carbon::now()->addMinutes($request->boolean('remember') ? 43200 : 480);

        $token = $user->authTokens()->create([
            'name' => 'next-web',
            'token_hash' => hash('sha256', $plainToken),
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 1000),
            'expires_at' => $expiresAt,
        ]);

        return response()->json([
            'token' => $plainToken,
            'token_type' => 'Bearer',
            'expires_at' => $token->expires_at->toIso8601String(),
            'user' => $this->userPayload($user),
        ]);
    }

    public function me(Request $request)
    {
        return response()->json([
            'user' => $this->userPayload($request->user()),
        ]);
    }

    public function logout(Request $request)
    {
        $token = $request->attributes->get('auth_token');

        if ($token instanceof AuthToken) {
            $token->delete();
        }

        return response()->json([
            'message' => 'Signed out successfully.',
        ]);
    }

    private function userPayload(User $user)
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'allowed_pages' => $user->allowed_pages ?: [],
            'home' => $this->homeForRole($user->role),
        ];
    }

    private function homeForRole($role)
    {
        if ($role === 'Cashier') {
            return '/cashier';
        }

        if ($role === 'Customer') {
            return '/shop';
        }

        return '/dashboard';
    }
}
