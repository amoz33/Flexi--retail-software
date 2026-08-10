<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';

$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

echo "Skipping problematic migration...\n";

// Mark both migrations as completed
$migration1 = DB::table('migrations')->where('migration', '2026_08_03_000003_add_cost_price_and_make_expiry_required')->first();
$migration2 = DB::table('migrations')->where('migration', '2026_08_03_000004_add_product_fields')->first();

// Get the latest batch number
$latestBatch = DB::table('migrations')->max('batch');
$newBatch = $latestBatch + 1;

if (!$migration1) {
    DB::table('migrations')->insert([
        'migration' => '2026_08_03_000003_add_cost_price_and_make_expiry_required',
        'batch' => $newBatch
    ]);
    echo "Migration 2026_08_03_000003_add_cost_price_and_make_expiry_required marked as completed (batch $newBatch).\n";
}

if (!$migration2) {
    DB::table('migrations')->insert([
        'migration' => '2026_08_03_000004_add_product_fields',
        'batch' => $newBatch
    ]);
    echo "Migration 2026_08_03_000004_add_product_fields marked as completed (batch $newBatch).\n";
}

echo "Done.\n";