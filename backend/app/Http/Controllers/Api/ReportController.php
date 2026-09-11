<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\SalesReportMail;
use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class ReportController extends Controller
{
    /**
     * Aggregated sales report — daily, monthly, or yearly, for a given
     * reference date (defaults to today).
     */
    public function sales(Request $request)
    {
        $validated = $request->validate([
            'period' => 'required|in:daily,monthly,yearly',
            'date' => 'nullable|date',
        ]);

        $referenceDate = $validated['date'] ?? now()->toDateString();
        [$start, $end, $label] = $this->periodBounds($validated['period'], $referenceDate);

        $query = $this->scopeToOutlet(Sale::query(), $request)
            ->whereBetween('created_at', [$start, $end])
            ->orderBy('created_at');

        $sales = $query->get();

        $summary = [
            'period' => $validated['period'],
            'label' => $label,
            'startDate' => $start->toDateString(),
            'endDate' => $end->toDateString(),
            'totalRevenue' => (float) $sales->sum('total'),
            'totalTransactions' => $sales->count(),
            'averageSale' => $sales->count() ? round($sales->sum('total') / $sales->count(), 2) : 0,
        ];

        return response()->json([
            'summary' => $summary,
            'sales' => $sales->map(fn (Sale $sale) => [
                'id' => $sale->id,
                'saleNumber' => $sale->sale_number,
                'date' => $sale->created_at->toDateTimeString(),
                'cashier' => $sale->cashier_name,
                'customer' => $sale->customer_name,
                'paymentMethod' => $sale->payment_method,
                'subtotal' => (float) $sale->subtotal,
                'discount' => (float) $sale->discount,
                'total' => (float) $sale->total,
            ]),
        ]);
    }

    /**
     * Emails the same report (as an HTML summary + table) to a given address.
     * Requires MAIL_* settings to be configured in .env — see the delivery
     * notes for what's needed. Uses whatever mail driver is configured; with
     * nothing set up, Laravel defaults to the "log" driver, which writes the
     * email to storage/logs/laravel.log instead of actually sending it — a
     * safe way to confirm this works before real SMTP credentials exist.
     */
    public function emailSales(Request $request)
    {
        $validated = $request->validate([
            'period' => 'required|in:daily,monthly,yearly',
            'date' => 'nullable|date',
            'email' => 'required|email',
        ]);

        $referenceDate = $validated['date'] ?? now()->toDateString();
        [$start, $end, $label] = $this->periodBounds($validated['period'], $referenceDate);

        $sales = $this->scopeToOutlet(Sale::query(), $request)
            ->whereBetween('created_at', [$start, $end])
            ->orderBy('created_at')
            ->get();

        $summary = [
            'period' => $validated['period'],
            'label' => $label,
            'startDate' => $start->toDateString(),
            'endDate' => $end->toDateString(),
            'totalRevenue' => (float) $sales->sum('total'),
            'totalTransactions' => $sales->count(),
        ];

        try {
            Mail::to($validated['email'])->send(new SalesReportMail($summary, $sales));
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Could not send the email. Confirm MAIL_* settings are correct in .env. Details: ' . $e->getMessage(),
            ], 500);
        }

        return response()->json(['message' => "Report sent to {$validated['email']}."]);
    }

    private function periodBounds(string $period, string $referenceDate): array
    {
        $date = \Carbon\Carbon::parse($referenceDate);

        return match ($period) {
            'daily' => [$date->copy()->startOfDay(), $date->copy()->endOfDay(), $date->toFormattedDateString()],
            'monthly' => [$date->copy()->startOfMonth(), $date->copy()->endOfMonth(), $date->format('F Y')],
            'yearly' => [$date->copy()->startOfYear(), $date->copy()->endOfYear(), $date->format('Y')],
        };
    }
}
