<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddRetailFieldsToProductsTable extends Migration
{
    public function up()
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('category')->nullable()->after('barcode');
            $table->decimal('cost_price', 12, 2)->default(0)->after('price');
            $table->unsignedInteger('sold_count')->default(0)->after('stock');
        });
    }

    public function down()
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['category', 'cost_price', 'sold_count']);
        });
    }
}
