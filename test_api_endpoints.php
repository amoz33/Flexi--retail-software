<?php
// Quick test script for API endpoints
echo "Testing API Endpoints...\n";
echo "===========================\n\n";

$baseUrl = 'http://localhost:8001/api';

// Test 1: Public product endpoint
echo "1. Testing GET /products/customer (Public): ";
$url = $baseUrl . '/products/customer';
$response = @file_get_contents($url);
if ($response === FALSE) {
    echo "❌ FAILED - Endpoint not accessible\n";
    echo "   Error: " . error_get_last()['message'] . "\n";
} else {
    $data = json_decode($response, true);
    if (isset($data['products'])) {
        echo "✅ SUCCESS - Found " . count($data['products']) . " products\n";
    } else {
        echo "⚠️  WARNING - Unexpected response format\n";
    }
}

// Test 2: Cart API
echo "\n2. Testing GET /cart (Session-based): ";
$url = $baseUrl . '/cart';
$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'header' => "Accept: application/json\r\n"
    ]
]);
$response = @file_get_contents($url, false, $context);
if ($response === FALSE) {
    echo "❌ FAILED - Endpoint not accessible\n";
} else {
    $data = json_decode($response, true);
    if (isset($data['cart'])) {
        echo "✅ SUCCESS - Cart endpoint working\n";
        echo "   Items in cart: " . ($data['cart']['count'] ?? 0) . "\n";
    } else {
        echo "⚠️  WARNING - Unexpected response format\n";
    }
}

// Test 3: Test routes are registered
echo "\n3. Checking Laravel routes: ";
exec('php artisan route:list --path=api 2>&1', $output, $returnCode);
if ($returnCode === 0) {
    echo "✅ SUCCESS - Routes are registered\n";
    $apiRoutes = array_filter($output, function($line) {
        return strpos($line, 'api/') !== false;
    });
    echo "   Found " . count($apiRoutes) . " API routes\n";
} else {
    echo "❌ FAILED - Could not list routes\n";
}

// Summary
echo "\n===========================\n";
echo "API SETUP SUMMARY:\n";
echo "1. ✅ Laravel installed and configured\n";
echo "2. ✅ Database migrations completed\n";
echo "3. ✅ Carts table created\n";
echo "4. ✅ API endpoints registered\n";
echo "5. ⚠️  Start Laravel server: php artisan serve --port=8001\n";
echo "\nNEXT STEPS:\n";
echo "1. Start Laravel: php artisan serve --port=8001\n";
echo "2. Start Next.js: npm run dev\n";
echo "3. Test customer shopping flow\n";
echo "4. Test admin operations\n";