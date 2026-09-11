<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter(array_map('trim', explode(',', env('FRONTEND_URLS', 'http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000')))),

    'allowed_origins_patterns' => [
        // Any local tenant subdomain during development, e.g. http://testclient.localhost:3001
        '#^http://[a-zA-Z0-9-]+\.localhost:\d+$#',
        // Any real tenant subdomain in production, e.g. https://clienta.flexisoftware.ng
        '#^https://[a-zA-Z0-9-]+\.flexisoftware\.ng$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];