<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateExpensesTable extends Migration
{
    public function up()
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->string('expense_number')->unique();
            $table->foreignId('outlet_id')->nullable()->constrained('outlets')->onDelete('set null');
            $table->string('category', 100);
            $table->string('description', 500);
            $table->decimal('amount', 14, 2);
            $table->string('payment_method', 100)->nullable();
            $table->string('receipt_snapshot')->nullable();
            $table->foreignId('logged_by_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('logged_by_name')->nullable();
            $table->date('expensed_on');
            $table->timestamps();

            $table->index('category');
            $table->index('expensed_on');
        });
    }

    public function down()
    {
        Schema::dropIfExists('expenses');
    }
}
