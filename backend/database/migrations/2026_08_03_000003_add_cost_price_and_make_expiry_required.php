<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddCostPriceAndMakeExpiryRequired extends Migration
{
    public function up()
    {
        Schema::table('products', function (Blueprint $table) {
            // Add cost_price column
            $table->decimal('cost_price', 12, 2)->nullable()->after('price');
            
            // Make expiry_date required (not nullable)
            $table->date('expiry_date')->nullable(false)->change();
            
            // Add category column if not exists
            if (!Schema::hasColumn('products', 'category')) {
                $table->string('category')->nullable()->after('sku');
            }
            
            // Add index for category
            $table->index('category');
        });
    }

    public function down()
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('cost_price');
            $table->date('expiry_date')->nullable()->change();
            $table->dropIndex(['category']);
        });
    }
}