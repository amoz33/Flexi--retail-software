<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateWasteRecordsTable extends Migration
{
    public function up()
    {
        Schema::create('waste_records', function (Blueprint $table) {
            $table->id();
            $table->string('item_name');
            $table->string('item_type')->default('Product');
            $table->string('reason')->default('Expired');
            $table->unsignedInteger('quantity')->default(1);
            $table->string('action')->default('Quarantine');
            $table->text('note')->nullable();
            $table->unsignedBigInteger('product_id')->nullable();
            $table->unsignedBigInteger('equipment_id')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('waste_records');
    }
}
