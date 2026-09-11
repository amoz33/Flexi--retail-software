<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddPaymentFieldsToOrdersTable extends Migration
{
    public function up()
    {
        Schema::table('retail_orders', function (Blueprint $table) {
            $table->string('payment_reference')->nullable()->after('payment_status');
            $table->json('payment_data')->nullable()->after('payment_reference');
            $table->index('payment_reference');
        });
    }

    public function down()
    {
        Schema::table('retail_orders', function (Blueprint $table) {
            $table->dropColumn('payment_reference');
            $table->dropColumn('payment_data');
        });
    }
}