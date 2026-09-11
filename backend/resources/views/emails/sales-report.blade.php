<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; }
        h1 { font-size: 20px; color: #0D0D0D; }
        .summary-box { background: #FFF9E6; border: 1px solid #C9A020; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
        .summary-box p { margin: 4px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { text-align: left; padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
        th { background: #f9fafb; }
    </style>
</head>
<body>
    <h1>Sales Report — {{ $summary['label'] }}</h1>

    <div class="summary-box">
        <p><strong>Period:</strong> {{ $summary['startDate'] }} to {{ $summary['endDate'] }}</p>
        <p><strong>Total Revenue:</strong> ₦{{ number_format($summary['totalRevenue'], 2) }}</p>
        <p><strong>Total Transactions:</strong> {{ $summary['totalTransactions'] }}</p>
    </div>

    <table>
        <thead>
            <tr>
                <th>Sale #</th>
                <th>Date</th>
                <th>Cashier</th>
                <th>Payment</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($sales as $sale)
            <tr>
                <td>{{ $sale->sale_number }}</td>
                <td>{{ $sale->created_at->format('Y-m-d H:i') }}</td>
                <td>{{ $sale->cashier_name }}</td>
                <td>{{ $sale->payment_method }}</td>
                <td>₦{{ number_format($sale->total, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
