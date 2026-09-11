<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePaymentSettingsTable extends Migration
{
    public function up()
    {
        Schema::create('payment_settings', function (Blueprint $table) {
            $table->id();
            $table->string('paystack_secret_key')->nullable();
            $table->string('dpo_company_token')->nullable();
            $table->string('dpo_service_type')->nullable();
            $table->string('pawapay_api_token')->nullable();
            $table->string('pawapay_env')->default('sandbox');
            $table->string('momo_subscription_key')->nullable();
            $table->string('momo_api_user')->nullable();
            $table->string('momo_api_key')->nullable();
            $table->string('momo_env')->default('sandbox');
            $table->string('momo_callback_host')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('payment_settings');
    }
}
