<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateVendorTransactionsTable extends Migration
{
    public function up()
    {
        Schema::create('vendor_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('transaction_number')->unique();
            $table->unsignedBigInteger('vendor_id');
            $table->string('vendor_name');
            $table->string('product_name');
            $table->string('sku')->nullable();
            $table->unsignedInteger('quantity')->default(0);
            $table->decimal('unit_cost', 14, 2)->default(0);
            $table->decimal('payment_amount', 14, 2)->default(0);
            $table->string('payment_status')->default('Unpaid');
            $table->string('payment_method')->nullable();
            $table->string('receipt_snapshot')->nullable();
            $table->string('vendor_signature')->nullable();
            $table->date('transacted_on')->nullable();
            $table->timestamps();

            $table->index('vendor_id');
        });
    }

    public function down()
    {
        Schema::dropIfExists('vendor_transactions');
    }
}
