"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import NavBar from "@/components/NavBar";

interface Quotation {
    id: number;
    partyName: string;
    partyPhone: string | null;
    currency: string;
    totalAmount: number;
    createdAt: string;
    items: Array<{
        id: number;
        itemName: string;
        qty: number;
        price: number;
        amount: number;
        image: string | null;
        unit: string;
        unit_value: number;
        finish: string;
        size: string;
        cbm: number;
        weight: number;
    }>;
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

const CURRENCY_SYMBOLS: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
    AED: "د.إ",
    CNY: "¥",
};

const getCurrencySymbol = (code: string) => CURRENCY_SYMBOLS[code] || code + " ";

function exportToExcel(q: Quotation) {
    const quoteRef = `QT-${String(q.id).padStart(6, "0")}`;

    // Build header rows
    const rows: (string | number)[][] = [];
    rows.push(["", "QUOTATION", "", "", "", "", "", "", "", ""]);
    rows.push(["", "Reference", quoteRef, "", "", "", "", "", "", ""]);
    rows.push(["", "Party", q.partyName, "", "", "", "", "", "", ""]);
    if (q.partyPhone) {
        rows.push(["", "Phone", q.partyPhone, "", "", "", "", "", "", ""]);
    }
    rows.push(["", "Date", formatDate(q.createdAt), "", "", "", "", "", "", ""]);
    rows.push([]);
    rows.push([
        "#",
        "Item Name",
        "Finish",
        "Size",
        "Packing",
        "CTN",
        "CBM/CTN",
        "Weight/CTN",
        "Qty",
        "Rates",
        "Amount",
        "Total CBM",
        "Total Weight"

    ]);

    let total_cbm = 0;
    let total_w = 0;

    q.items.forEach((item, index) => {
        total_cbm += item.cbm * item.qty * item.unit_value;
        total_w += item.weight * item.qty * item.unit_value;
        rows.push([
            index + 1,
            item.itemName,
            item.finish || "-",
            item.size || "-",
            `${item.unit_value} - ${item.unit}`,
            item.cbm,
            item.weight,
            item.qty,
            item.qty * item.unit_value,
            item.price,
            item.amount,
            item.cbm * item.qty * item.unit_value,
            item.weight * item.qty * item.unit_value
        ]);

    });

    rows.push([]);
    rows.push(["", "", "", "", "", "", "", "", "", "Grand Total", q.totalAmount, total_cbm, total_w]);

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Set column widths for readability
    ws["!cols"] = [
        { wch: 5 },
        { wch: 28 },
        { wch: 12 },
        { wch: 12 },
        { wch: 14 },
        { wch: 10 },
        { wch: 10 },
        { wch: 12 },
        { wch: 14 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Quotation");
    XLSX.writeFile(wb, `${quoteRef}.xlsx`);
}

export default function QuotationsPage() {
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchQuotations = useCallback(async () => {
        try {
            const res = await fetch("/api/quotations");
            if (!res.ok) throw new Error("Failed to load quotations");
            const data = await res.json();
            setQuotations(data.quotations);
        } catch (err: any) {
            setError(err.message || "Failed to load quotations.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchQuotations();
    }, [fetchQuotations]);

    async function handleDelete(id: number) {
        if (!confirm("Delete this quotation?")) return;
        try {
            const res = await fetch(`/api/quotations/${id}`, { method: "DELETE" });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Failed to delete.");
                return;
            }
            await fetchQuotations();
        } catch (err: any) {
            setError(err.message || "Network error.");
        }
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <NavBar />
            <main className="max-w-3xl mx-auto px-4 py-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Quotation History</h1>
                        <p className="text-gray-500 text-sm">All saved quotations</p>
                    </div>
                    <Link
                        href="/quotations/create"
                        className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:scale-[0.98] transition"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        New Quote
                    </Link>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="bg-white rounded-xl p-8 text-center text-gray-500 shadow-sm border border-gray-100">
                        Loading...
                    </div>
                ) : quotations.length === 0 ? (
                    <div className="bg-white rounded-xl p-8 text-center text-gray-500 shadow-sm border border-gray-100">
                        No quotations yet.
                        <div className="mt-2">
                            <Link href="/quotations/create" className="text-indigo-600 font-medium">
                                Create your first quotation
                            </Link>
                        </div>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {quotations.map((q) => (
                            <li
                                key={q.id}
                                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="min-w-0">
                                        <div className="font-semibold text-gray-800 truncate">
                                            {q.partyName}
                                            {q.partyPhone && (
                                                <span className="text-gray-400 font-normal"> · {q.partyPhone}</span>
                                            )}
                                        </div>
                                        <div className="text-sm text-gray-500 mt-0.5">
                                            {formatDate(q.createdAt)}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {q.items.length} item{q.items.length !== 1 ? "s" : ""}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="font-bold text-indigo-600">
                                            {getCurrencySymbol(q.currency)}{q.totalAmount.toLocaleString("en-IN")}
                                        </div>
                                    </div>
                                </div>

                                {/* Item thumbnails */}
                                {q.items.length > 0 && (
                                    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100 overflow-x-auto">
                                        {q.items.slice(0, 6).map((it) => (
                                            <div key={it.id} className="relative shrink-0 group">
                                                {it.image ? (
                                                    <img
                                                        src={`/api/${it.image}`}
                                                        alt={it.itemName}
                                                        className="h-10 w-10 rounded object-cover border border-gray-100"
                                                    />
                                                ) : (
                                                    <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-50 border border-gray-100 text-gray-300">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                )}
                                                <span className="sr-only">{it.itemName}</span>
                                            </div>
                                        ))}
                                        {q.items.length > 6 && (
                                            <span className="shrink-0 text-xs font-semibold text-gray-400">
                                                +{q.items.length - 6}
                                            </span>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                                    <Link
                                        href={`/quotations/${q.id}`}
                                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 active:scale-[0.98] transition"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        View / PDF
                                    </Link>
                                    <button
                                        onClick={() => exportToExcel(q)}
                                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 active:scale-[0.98] transition"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17h6M9 13h6M9 9h6M4 6a2 2 0 012-2h8l6 6v10a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
                                        </svg>
                                        Excel
                                    </button>
                                    <Link
                                        href={`/quotations/create?id=${q.id}`}
                                        className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 active:scale-[0.98] transition"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>

                                    </Link>
                                    <button
                                        onClick={() => handleDelete(q.id)}
                                        className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 active:scale-[0.98] transition"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>

                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </main>
        </div>
    );
}
