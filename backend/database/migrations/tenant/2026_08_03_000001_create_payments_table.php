<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePaymentsTable extends Migration
{
    public function up()
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique()->index();
            $table->foreignId('order_id')->nullable()->constrained('retail_orders')->onDelete('set null');
            $table->string('customer_email')->index();
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('NGN');
            $table->string('status')->default('pending'); // pending, success, failed
            $table->string('gateway_response')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->json('transaction_data')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['customer_email', 'status']);
            $table->index(['created_at', 'status']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('payments');
    }
}