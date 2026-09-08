<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class AddGatewayToPaymentsTable extends Migration
{
    public function up()
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('gateway', 30)->nullable()->after('currency');
            $table->string('gateway_reference')->nullable()->after('gateway');
            $table->index('gateway');
            $table->index('gateway_reference');
        });

        // Existing rows all came through Paystack (the only gateway that existed
        // before this migration) — backfill so nothing looks unset.
        DB::table('payments')->whereNull('gateway')->update(['gateway' => 'paystack']);
    }

    public function down()
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['gateway', 'gateway_reference']);
        });
    }
}
