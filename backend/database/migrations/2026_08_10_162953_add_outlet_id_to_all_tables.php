<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddOutletIdToAllTables extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // Add outlet_id to users table
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('outlet_id')->nullable()->constrained('outlets')->onDelete('set null');
        });

        // Add outlet_id to products table
        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('outlet_id')->nullable()->constrained('outlets')->onDelete('set null');
        });

        // Add outlet_id to orders table
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('outlet_id')->nullable()->constrained('outlets')->onDelete('set null');
        });

        // Add outlet_id to sales table
        Schema::table('sales', function (Blueprint $table) {
            $table->foreignId('outlet_id')->nullable()->constrained('outlets')->onDelete('set null');
        });

        // Add outlet_id to waste table
        Schema::table('waste', function (Blueprint $table) {
            $table->foreignId('outlet_id')->nullable()->constrained('outlets')->onDelete('set null');
        });

        // Add outlet_id to carts table
        Schema::table('carts', function (Blueprint $table) {
            $table->foreignId('outlet_id')->nullable()->constrained('outlets')->onDelete('set null');
        });

        // Add outlet_id to vendor_transactions table
        Schema::table('vendor_transactions', function (Blueprint $table) {
            $table->foreignId('outlet_id')->nullable()->constrained('outlets')->onDelete('set null');
        });

        // Add outlet_id to equipment table
        Schema::table('equipment', function (Blueprint $table) {
            $table->foreignId('outlet_id')->nullable()->constrained('outlets')->onDelete('set null');
        });

        // Add indexes for better performance
        Schema::table('products', function (Blueprint $table) {
            $table->index('outlet_id');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->index('outlet_id');
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->index('outlet_id');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['outlet_id']);
            $table->dropColumn('outlet_id');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['outlet_id']);
            $table->dropColumn('outlet_id');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['outlet_id']);
            $table->dropColumn('outlet_id');
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->dropForeign(['outlet_id']);
            $table->dropColumn('outlet_id');
        });

        Schema::table('waste', function (Blueprint $table) {
            $table->dropForeign(['outlet_id']);
            $table->dropColumn('outlet_id');
        });

        Schema::table('carts', function (Blueprint $table) {
            $table->dropForeign(['outlet_id']);
            $table->dropColumn('outlet_id');
        });

        Schema::table('vendor_transactions', function (Blueprint $table) {
            $table->dropForeign(['outlet_id']);
            $table->dropColumn('outlet_id');
        });

        Schema::table('equipment', function (Blueprint $table) {
            $table->dropForeign(['outlet_id']);
            $table->dropColumn('outlet_id');
        });
    }
}
