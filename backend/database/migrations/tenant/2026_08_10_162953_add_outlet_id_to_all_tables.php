<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class AddOutletIdToAllTables extends Migration
{
    public function up()
    {
        // users: already has column + constraint from earlier partial run — guarded anyway
        if (!Schema::hasColumn('users', 'outlet_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->foreignId('outlet_id')->nullable()->constrained('outlets')->onDelete('set null');
            });
        }

        // products: already has column + constraint from earlier partial run — guarded anyway
        if (!Schema::hasColumn('products', 'outlet_id')) {
            Schema::table('products', function (Blueprint $table) {
                $table->foreignId('outlet_id')->nullable()->constrained('outlets')->onDelete('set null');
            });
        }

        // retail_orders: column already exists, constraint does not — add constraint only
        if (!Schema::hasColumn('retail_orders', 'outlet_id')) {
            Schema::table('retail_orders', function (Blueprint $table) {
                $table->foreignId('outlet_id')->nullable()->constrained('outlets')->onDelete('set null');
            });
        } else {
            $constraintExists = DB::select("
                SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'retail_orders'
                AND REFERENCED_TABLE_NAME = 'outlets'
            ");
            if (empty($constraintExists)) {
                Schema::table('retail_orders', function (Blueprint $table) {
                    $table->foreign('outlet_id')->references('id')->on('outlets')->onDelete('set null');
                });
            }
        }

        Schema::table('sales', function (Blueprint $table) {
            $table->foreignId('outlet_id')->nullable()->constrained('outlets')->onDelete('set null');
        });

        Schema::table('waste_records', function (Blueprint $table) {
            $table->foreignId('outlet_id')->nullable()->constrained('outlets')->onDelete('set null');
        });

        Schema::table('carts', function (Blueprint $table) {
            $table->foreignId('outlet_id')->nullable()->constrained('outlets')->onDelete('set null');
        });

        Schema::table('vendor_transactions', function (Blueprint $table) {
            $table->foreignId('outlet_id')->nullable()->constrained('outlets')->onDelete('set null');
        });

        Schema::table('equipment_items', function (Blueprint $table) {
            $table->foreignId('outlet_id')->nullable()->constrained('outlets')->onDelete('set null');
        });

        // Note: older schema used `equipment_inventory`; current schema uses `equipment_items`.
        // No action required for `equipment_inventory` if it does not exist.

        Schema::table('retail_orders', function (Blueprint $table) {
            $table->index('outlet_id');
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->index('outlet_id');
        });
    }

    public function down()
    {
        $tables = [
            'users',
            'products',
            'retail_orders',
            'sales',
            'waste_records',
            'carts',
            'vendor_transactions',
            'equipment_items',
        ];

        foreach ($tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropForeign(['outlet_id']);
                $table->dropColumn('outlet_id');
            });
        }
    }
}