<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Stancl\Tenancy\Database\Models\Domain;

/**
 * Writes the list of registered tenant hostnames to a file that a root-owned
 * systemd path unit watches (tenant-nginx-sync.path). That unit regenerates the
 * nginx allow-list map and reloads nginx. PHP never gets root access.
 */
class TenantNginxSync
{
    const SYNC_FILE = '/var/lib/tenant-nginx/domains.txt';
    const BASE_DOMAIN = 'flexisoftware.ng';

    /**
     * Rebuild the host list from the central `domains` table.
     * Returns true if the list file was written, false otherwise.
     */
    public function sync(): bool
    {
        try {
            $domains = tenancy()->central(function () {
                return Domain::query()->pluck('domain')->all();
            });

            $suffix = '.'.self::BASE_DOMAIN;
            $hosts = [];

            foreach ($domains as $domain) {
                $domain = strtolower(trim((string) $domain));

                if ($domain === '') {
                    continue;
                }

                // Tenants created from the GUI store only the subdomain label.
                if (strpos($domain, '.') === false) {
                    $domain .= $suffix;
                }

                if (substr($domain, -strlen($suffix)) !== $suffix) {
                    continue;
                }

                $hosts[] = $domain;
            }

            $hosts = array_values(array_unique($hosts));
            sort($hosts);

            $written = file_put_contents(self::SYNC_FILE, implode("\n", $hosts)."\n", LOCK_EX);

            return $written !== false;
        } catch (\Throwable $e) {
            Log::error('Tenant nginx sync failed: '.$e->getMessage());

            return false;
        }
    }
}