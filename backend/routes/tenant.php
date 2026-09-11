<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Stancl\Tenancy\Middleware\InitializeTenancyBySubdomain;
use Stancl\Tenancy\Middleware\PreventAccessFromCentralDomains;

/*
|--------------------------------------------------------------------------
| Tenant Routes
|--------------------------------------------------------------------------
|
| Not currently used for real application routes — since routes/api.php is
| now set up as Universal Routes (see the comment block there), your actual
| API lives in that one file and correctly serves both central and tenant
| domains automatically. This file is left as the original package-generated
| example, kept only in case you want genuinely tenant-only routes later
| (something that should never be reachable from a central domain at all).
|
*/

Route::middleware([
    'web',
    InitializeTenancyBySubdomain::class,
    PreventAccessFromCentralDomains::class,
])->group(function () {
    Route::get('/', function () {
        return 'This is your multi-tenant application. The id of the current tenant is ' . tenant('id');
    });
});
