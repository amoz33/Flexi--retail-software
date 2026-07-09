<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * @return void
     */
    public function run()
    {
        $users = [
            [
                'name' => 'System Admin',
                'email' => 'admin@flexiretail.ng',
                'password' => 'admin2026',
                'role' => 'Admin',
                'allowed_pages' => [],
            ],
            [
                'name' => 'Front Desk Cashier',
                'email' => 'cashier@flexiretail.ng',
                'password' => 'cashier2026',
                'role' => 'Cashier',
                'allowed_pages' => [
                    '/cashier',
                    '/front-desk',
                    '/front-desk/sell',
                    '/front-desk/receipt',
                    '/front-desk/sales-history',
                ],
            ],
            [
                'name' => 'Retail Customer',
                'email' => 'customer@flexiretail.ng',
                'password' => 'customer2026',
                'role' => 'Customer',
            ],
        ];

        foreach ($users as $user) {
            User::updateOrCreate(
                ['email' => $user['email']],
                [
                    'name' => $user['name'],
                    'password' => Hash::make($user['password']),
                    'role' => $user['role'],
                    'allowed_pages' => $user['allowed_pages'] ?? [],
                    'is_active' => true,
                    'email_verified_at' => now(),
                ]
            );
        }
    }
}
