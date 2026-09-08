<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        if (!$this->isPrivileged($request)) {
            return response()->json(['message' => 'Only admins can view expenses.'], 403);
        }

        $query = $this->scopeToOutlet(Expense::query(), $request)->orderByDesc('expensed_on');

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('from')) {
            $query->whereDate('expensed_on', '>=', $request->input('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('expensed_on', '<=', $request->input('to'));
        }

        return response()->json([
            'expenses' => $query->get()->map(fn (Expense $expense) => $this->expensePayload($expense)),
            'total' => (float) $query->sum('amount'),
        ]);
    }

    public function store(Request $request)
    {
        if (!$this->isPrivileged($request)) {
            return response()->json(['message' => 'Only admins can log expenses.'], 403);
        }

        $data = $request->validate([
            'category' => ['required', 'string', 'max:100'],
            'description' => ['required', 'string', 'max:500'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'paymentMethod' => ['nullable', 'string', 'max:100'],
            'receiptSnapshot' => ['nullable', 'string', 'max:255'],
            'date' => ['nullable', 'date'],
        ]);

        $expense = Expense::create([
            'expense_number' => 'EXP-'.now()->format('ymd').'-'.Str::upper(Str::random(4)),
            'outlet_id' => $this->requestedOutletId($request),
            'category' => $data['category'],
            'description' => $data['description'],
            'amount' => $data['amount'],
            'payment_method' => $data['paymentMethod'] ?? null,
            'receipt_snapshot' => $data['receiptSnapshot'] ?? null,
            'logged_by_id' => $request->user()->id,
            'logged_by_name' => $request->user()->name,
            'expensed_on' => $data['date'] ?? now()->toDateString(),
        ]);

        return response()->json(['expense' => $this->expensePayload($expense)], 201);
    }

    public function destroy(Request $request, Expense $expense)
    {
        if (!$this->isPrivileged($request)) {
            return response()->json(['message' => 'Only admins can delete expenses.'], 403);
        }

        $expense->delete();

        return response()->json(['message' => 'Expense deleted.']);
    }

    public function uploadReceipt(Request $request)
    {
        if (!$this->isPrivileged($request)) {
            return response()->json(['message' => 'Only admins can upload receipts.'], 403);
        }

        $request->validate([
            'receipt' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ]);

        $path = $request->file('receipt')->store('expense-receipts', 'public');

        return response()->json([
            'url' => Storage::disk('public')->url($path),
        ]);
    }

    private function expensePayload(Expense $expense)
    {
        return [
            'id' => $expense->expense_number,
            'databaseId' => $expense->id,
            'outletId' => $expense->outlet_id,
            'category' => $expense->category,
            'description' => $expense->description,
            'amount' => (float) $expense->amount,
            'paymentMethod' => $expense->payment_method,
            'receiptSnapshot' => $expense->receipt_snapshot,
            'loggedBy' => $expense->logged_by_name,
            'date' => $expense->expensed_on ? $expense->expensed_on->format('M j, Y') : '',
            'createdAt' => optional($expense->created_at)->toIso8601String(),
        ];
    }
}
