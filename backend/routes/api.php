<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\EquipmentController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\OutletController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\StaffController;
use App\Http\Controllers\Api\VendorController;
use App\Http\Controllers\Api\VendorTransactionController;
use App\Http\Controllers\Api\WasteController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
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

// Outlet management (admin only)
Route::middleware('auth.bearer')->prefix('outlets')->group(function () {
    Route::get('/', [OutletController::class, 'index']);
    Route::post('/', [OutletController::class, 'store']);
    Route::get('/{outlet}', [OutletController::class, 'show']);
    Route::put('/{outlet}', [OutletController::class, 'update']);
    Route::delete('/{outlet}', [OutletController::class, 'destroy']);
    Route::patch('/{outlet}/status', [OutletController::class, 'toggleStatus']);
    Route::get('/{outlet}/statistics', [OutletController::class, 'statistics']);
});

Route::middleware('auth.bearer')->prefix('products')->group(function () {
    Route::get('/', [ProductController::class, 'index']);
    Route::post('/', [ProductController::class, 'store']);
    Route::post('/import', [ProductController::class, 'import']);
    Route::put('/{product}', [ProductController::class, 'update']);
    Route::delete('/{product}', [ProductController::class, 'destroy']);
});

// Public product listing for customers (only frontDeskVisible products)
Route::get('/products/customer', [ProductController::class, 'customerIndex']);

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

Route::middleware('auth.bearer')->prefix('vendors')->group(function () {
    Route::get('/', [VendorController::class, 'index']);
    Route::post('/', [VendorController::class, 'store']);
    Route::delete('/{vendor}', [VendorController::class, 'destroy']);
});

Route::middleware('auth.bearer')->prefix('vendor-transactions')->group(function () {
    Route::get('/', [VendorTransactionController::class, 'index']);
    Route::post('/', [VendorTransactionController::class, 'store']);
    Route::patch('/{transaction}/status', [VendorTransactionController::class, 'updateStatus']);
});

Route::middleware('auth.bearer')->prefix('equipment')->group(function () {
    Route::get('/', [EquipmentController::class, 'index']);
    Route::post('/', [EquipmentController::class, 'store']);
    Route::put('/{equipment}', [EquipmentController::class, 'update']);
    Route::post('/{equipment}/waste', [EquipmentController::class, 'moveToWaste']);
    Route::delete('/{equipment}', [EquipmentController::class, 'destroy']);
});

Route::middleware('auth.bearer')->prefix('waste')->group(function () {
    Route::get('/', [WasteController::class, 'index']);
    Route::post('/', [WasteController::class, 'store']);
});

// Cart API - public for shopping
Route::prefix('cart')->group(function () {
    Route::get('/', [\App\Http\Controllers\Api\CartController::class, 'get']);
    Route::put('/', [\App\Http\Controllers\Api\CartController::class, 'update']);
    Route::delete('/', [\App\Http\Controllers\Api\CartController::class, 'clear']);
    Route::post('/sync', [\App\Http\Controllers\Api\CartController::class, 'sync']);
});

// Payment API
Route::prefix('payments')->group(function () {
    Route::post('/initialize', [\App\Http\Controllers\Api\PaymentController::class, 'initialize']);
    Route::get('/verify/{reference}', [\App\Http\Controllers\Api\PaymentController::class, 'verify']);
    Route::post('/webhook', [\App\Http\Controllers\Api\PaymentController::class, 'webhook']);
});