<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateRetailOrdersTable extends Migration
{
    public function up()
    {
        Schema::create('retail_orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number')->unique();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('customer_name');
            $table->string('phone', 50)->nullable()->index();
            $table->string('email')->nullable()->index();
            $table->text('address')->nullable();
            $table->string('delivery_option', 50)->default('Home Delivery');
            $table->text('delivery_note')->nullable();
            $table->string('payment_method', 50)->nullable();
            $table->string('payment_status', 30)->default('Pending');
            $table->json('items');
            $table->decimal('subtotal', 14, 2)->default(0);
            $table->decimal('delivery_fee', 14, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);
            $table->string('status', 30)->default('Pending')->index();
            $table->text('delivery_comment')->nullable();
            $table->timestamp('delivered_confirmed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('retail_orders');
    }
}
