<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vendor;
use App\Models\VendorTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class VendorTransactionController extends Controller
{
    public function index(Request $request)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Only admins can view vendor transactions.'], 403);
        }

        return response()->json([
            'transactions' => $this->scopeToOutlet(VendorTransaction::query(), $request)->orderByDesc('created_at')->get()->map(function (VendorTransaction $transaction) {
                return $this->transactionPayload($transaction);
            }),
        ]);
    }

    public function uploadReceipt(Request $request)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Only admins can upload receipts.'], 403);
        }

        $request->validate([
            'receipt' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ]);

        $path = $request->file('receipt')->store('vendor-receipts', 'public');

        return response()->json([
            'url' => \Illuminate\Support\Facades\Storage::disk('public')->url($path),
        ]);
    }

    public function store(Request $request)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Only admins can manage vendor transactions.'], 403);
        }

        $data = $request->validate([
            'vendorId' => ['required', 'integer'],
            'productName' => ['required', 'string', 'max:255'],
            'sku' => ['nullable', 'string', 'max:100'],
            'quantity' => ['required', 'integer', 'min:1'],
            'unitCost' => ['required', 'numeric', 'min:0'],
            'paymentAmount' => ['nullable', 'numeric', 'min:0'],
            'paymentStatus' => ['required', 'string', 'max:30'],
            'paymentMethod' => ['nullable', 'string', 'max:100'],
            'receiptSnapshot' => ['nullable', 'string', 'max:255'],
            'vendorSignature' => ['nullable', 'string', 'max:255'],
            'date' => ['nullable', 'date'],
        ]);

        $vendor = Vendor::find($data['vendorId']);
        if (!$vendor) {
            return response()->json(['message' => 'Selected vendor was not found.'], 422);
        }

        $totalCost = $data['quantity'] * $data['unitCost'];
        $paymentAmount = $data['paymentStatus'] === 'Paid'
            ? $totalCost
            : ($data['paymentStatus'] === 'Unpaid' ? 0 : (float) ($data['paymentAmount'] ?? 0));

        $transaction = VendorTransaction::create([
            'transaction_number' => 'VTX-'.now()->format('ymd').'-'.Str::upper(Str::random(4)),
            'vendor_id' => $vendor->id,
            'vendor_name' => $vendor->name,
            'product_name' => $data['productName'],
            'sku' => $data['sku'] ?? null,
            'quantity' => $data['quantity'],
            'unit_cost' => $data['unitCost'],
            'payment_amount' => $paymentAmount,
            'payment_status' => $data['paymentStatus'],
            'payment_method' => $data['paymentMethod'] ?: ($data['paymentStatus'] === 'Unpaid' ? 'Pending' : 'Bank Transfer'),
            'receipt_snapshot' => $data['receiptSnapshot'] ?? null,
            'vendor_signature' => $data['vendorSignature'] ?? null,
            'transacted_on' => $data['date'] ?? now()->toDateString(),
        ]);

        return response()->json(['transaction' => $this->transactionPayload($transaction)], 201);
    }

    public function updateStatus(Request $request, VendorTransaction $transaction)
    {
        if (!$this->isAdmin($request)) {
            return response()->json(['message' => 'Only admins can manage vendor transactions.'], 403);
        }

        $data = $request->validate([
            'paymentStatus' => ['required', 'string', 'max:30'],
        ]);

        $totalCost = $transaction->quantity * $transaction->unit_cost;

        $transaction->forceFill([
            'payment_status' => $data['paymentStatus'],
            'payment_amount' => $data['paymentStatus'] === 'Paid' ? $totalCost : 0,
            'payment_method' => $data['paymentStatus'] === 'Paid' && $transaction->payment_method === 'Pending'
                ? 'Bank Transfer'
                : $transaction->payment_method,
        ])->save();

        return response()->json(['transaction' => $this->transactionPayload($transaction->fresh())]);
    }

    private function isAdmin(Request $request)
    {
        return $this->isPrivileged($request);
    }

    private function transactionPayload(VendorTransaction $transaction)
    {
        return [
            'id' => $transaction->transaction_number,
            'databaseId' => $transaction->id,
            'vendorId' => $transaction->vendor_id,
            'vendorName' => $transaction->vendor_name,
            'productName' => $transaction->product_name,
            'sku' => $transaction->sku,
            'quantity' => (int) $transaction->quantity,
            'unitCost' => (float) $transaction->unit_cost,
            'paymentAmount' => (float) $transaction->payment_amount,
            'paymentStatus' => $transaction->payment_status,
            'paymentMethod' => $transaction->payment_method,
            'receiptSnapshot' => $transaction->receipt_snapshot,
            'vendorSignature' => $transaction->vendor_signature,
            'date' => $transaction->transacted_on ? $transaction->transacted_on->format('M j, Y') : '',
        ];
    }
}
