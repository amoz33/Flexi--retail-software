<?php

namespace App\Http\Middleware;

use App\Models\AuthToken;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AuthenticateBearerToken
{
    public function handle(Request $request, Closure $next)
    {
        $plainToken = $request->bearerToken();

        if (!$plainToken) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $token = AuthToken::with('user')
            ->where('token_hash', hash('sha256', $plainToken))
            ->first();

        if (!$token || $token->expires_at->isPast() || !$token->user || !$token->user->is_active) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $token->forceFill(['last_used_at' => Carbon::now()])->save();

        $request->setUserResolver(function () use ($token) {
            return $token->user;
        });
        $request->attributes->set('auth_token', $token);

        return $next($request);
    }
}
