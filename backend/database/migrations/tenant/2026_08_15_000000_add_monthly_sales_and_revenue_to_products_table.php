<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddMonthlySalesAndRevenueToProductsTable extends Migration
{
    public function up()
    {
        if (!Schema::hasColumn('products', 'monthly_sales')) {
            Schema::table('products', function (Blueprint $table) {
                $table->json('monthly_sales')->nullable()->after('sold_count');
            });
        }

        if (!Schema::hasColumn('products', 'revenue')) {
            Schema::table('products', function (Blueprint $table) {
                $table->decimal('revenue', 12, 2)->default(0.00)->after('category');
            });
        }
    }

    public function down()
    {
        if (Schema::hasColumn('products', 'monthly_sales')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropColumn('monthly_sales');
            });
        }

        if (Schema::hasColumn('products', 'revenue')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropColumn('revenue');
            });
        }
    }
}
