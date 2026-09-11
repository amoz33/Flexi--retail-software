<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddCostPriceAndMakeExpiryRequired extends Migration
{
    public function up()
    {
        Schema::table('products', function (Blueprint $table) {
            // Add cost_price column if it does not already exist
            if (!Schema::hasColumn('products', 'cost_price')) {
                $table->decimal('cost_price', 12, 2)->nullable()->after('price');
            }

            // expiry_date stays nullable — not all products expire
            // (removed the ->nullable(false)->change() line)

            // Add category column if not exists
            if (!Schema::hasColumn('products', 'category')) {
                $table->string('category')->nullable()->after('sku');
            }

            // Add index for category if not exists
            if (!Schema::hasColumn('products', 'category')) {
                $table->index('category');
            }
        });
    }

    public function down()
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('cost_price');
            $table->dropIndex(['category']);
        });
    }

}