<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\StaffController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\SaleController;

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

Route::middleware('auth.bearer')->prefix('products')->group(function () {
    Route::get('/', [ProductController::class, 'index']);
    Route::post('/', [ProductController::class, 'store']);
    Route::post('/import', [ProductController::class, 'import']);
    Route::put('/{product}', [ProductController::class, 'update']);
    Route::delete('/{product}', [ProductController::class, 'destroy']);
});

Route::post('/orders', [OrderController::class, 'store']);
Route::get('/orders/customer', [OrderController::class, 'customerOrders']);
Route::patch('/orders/{order}/delivered', [OrderController::class, 'confirmDelivered']);

Route::middleware('auth.bearer')->group(function () {
    Route::get('/customers', [CustomerController::class, 'index']);
    Route::get('/orders', [OrderController::class, 'index']);
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
});

Route::middleware('auth.bearer')->prefix('sales')->group(function () {
    Route::get('/', [SaleController::class, 'index']);
    Route::get('/{sale}', [SaleController::class, 'show']);
    Route::post('/', [SaleController::class, 'store']);
});