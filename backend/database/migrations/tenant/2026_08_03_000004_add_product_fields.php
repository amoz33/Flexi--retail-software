<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddProductFields extends Migration
{
    public function up()
    {
        Schema::table('products', function (Blueprint $table) {
            // Add cost_price column if not exists
            if (!Schema::hasColumn('products', 'cost_price')) {
                $table->decimal('cost_price', 12, 2)->nullable()->after('price');
            }
            
            // Add category column if not exists
            if (!Schema::hasColumn('products', 'category')) {
                $table->string('category')->nullable()->after('sku');
            }
            
            // Add index for category
            $table->index(['category']);
        });
        
        // Update existing products to have a default category
        DB::table('products')->whereNull('category')->update(['category' => 'General']);
        
        // Update existing products to have a default expiry date (30 days from now)
        DB::table('products')->whereNull('expiry_date')->update([
            'expiry_date' => DB::raw('DATE_ADD(NOW(), INTERVAL 30 DAY)')
        ]);
        
        // Update existing products to have cost_price = price * 0.7 if cost_price is null
        DB::table('products')->whereNull('cost_price')->update([
            'cost_price' => DB::raw('price * 0.7')
        ]);
    }

    public function down()
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['cost_price', 'category']);
            $table->dropIndex(['category']);
        });
    }
}