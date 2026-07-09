<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\StaffController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

    Route::middleware('auth.bearer')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::middleware('auth.bearer')->prefix('staff')->group(function () {
    Route::get('/', [StaffController::class, 'index']);
    Route::post('/', [StaffController::class, 'store']);
    Route::put('/{staff}', [StaffController::class, 'update']);
    Route::patch('/{staff}/status', [StaffController::class, 'toggleStatus']);
    Route::post('/{staff}/reset-password', [StaffController::class, 'resetPassword']);
});

Route::post('/orders', [OrderController::class, 'store']);
Route::get('/orders/customer', [OrderController::class, 'customerOrders']);
Route::patch('/orders/{order}/delivered', [OrderController::class, 'confirmDelivered']);

Route::middleware('auth.bearer')->group(function () {
    Route::get('/customers', [CustomerController::class, 'index']);
    Route::get('/orders', [OrderController::class, 'index']);
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
});
