"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";

interface Item {
    id: number;
    name: string;
    unit: string;
    defaultPrice: number;
    cbm: number | null;
    weight: number | null;
    image: string | null;
    unit_value: number;
    finish: string;
    size: string;
}

interface Row {
    id: number;
    itemId: string;
    itemName: string;
    unit: string;
    unit_value: number;
    finish: string;
    size: string;
    qty: string;
    price: string;
    amount: number;
    cbm: number | null;
    weight: number | null;
    image: string | null;
    images?: any[];
}

let rowCounter = 1;

const currency = (n: number) =>
    "₹" + (isFinite(n) ? n.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "0");

const fmt = (n: number | null | undefined) =>
    n === null || n === undefined || !isFinite(n) ? "—" : Number(n.toFixed(3)).toLocaleString("en-IN");

const effUnitValue = (uv: number | null | undefined) =>
    uv !== null && uv !== undefined && uv > 0 ? uv : 1;

const totalQty = (qty: number, uv: number | null | undefined) =>
    qty * effUnitValue(uv);

function CreateQuotationPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get("id");
    const isEditing = !!editId;
    const [items, setItems] = useState<Item[]>([]);
    const [partyName, setPartyName] = useState("");
    const [partyPhone, setPartyPhone] = useState("");
    const [rows, setRows] = useState<Row[]>([]);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [draft, setDraft] = useState<Partial<Row>>({});
    const [editingRowId, setEditingRowId] = useState<number | null>(null);

    const fetchItems = useCallback(async () => {
        try {
            const res = await fetch("/api/items?limit=100");
            if (!res.ok) throw new Error("Failed to load items");
            const data = await res.json();
            setItems(data.items);
        } catch (err: any) {
            setError(err.message || "Failed to load items.");
        }
    }, []);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    // When editing, load the existing quotation data
    useEffect(() => {
        if (!editId) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/quotations/${editId}`);
                if (!res.ok) throw new Error("Failed to load quotation");
                const data = await res.json();
                const q = data.quotation;
                if (cancelled || !q) return;
                setPartyName(q.partyName || "");
                setPartyPhone(q.partyPhone || "");
                setRows(
                    (q.items || []).map((it: any) => ({
                        id: rowCounter++,
                        itemId: String(it.id),
                        itemName: it.itemName,
                        unit: it.unit || "",
                        unit_value: Math.max(0, Number(it.unit_value) || 0),
                        finish: it.finish || "",
                        size: it.size || "",
                        qty: String(it.qty),
                        price: String(it.price),
                        amount: it.amount,
                        cbm: it.cbm,
                        weight: it.weight,
                        image: it.image || null,
                    }))
                );
            } catch (err: any) {
                if (!cancelled) setError(err.message || "Failed to load quotation.");
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [editId]);

    function openModal(row?: Row) {
        if (row) {
            setEditingRowId(row.id);
            setDraft({
                itemId: row.itemId,
                itemName: row.itemName,
                unit: row.unit,
                unit_value: row.unit_value,
                finish: row.finish,
                size: row.size,
                qty: String(Number(row.qty) || 1),
                price: row.price,
                cbm: row.cbm,
                weight: row.weight,
                image: row.image,
            });
        } else {
            setEditingRowId(null);
            setDraft({ itemId: "", itemName: "", qty: "1", price: "", cbm: null, weight: null });
        }
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setDraft({});
        setEditingRowId(null);
    }

    function handleDraftItemSelect(itemId: string) {
        const item = items.find((i) => i.id === Number(itemId));
        setDraft((d) => ({
            ...d,
            itemId,
            itemName: item ? item.name : "",
            unit: item ? item.unit : "",
            unit_value: item ? item.unit_value : 0,
            finish: item ? item.finish : "",
            size: item ? item.size : "",
            price: item ? String(item.defaultPrice) : "",
            cbm: item ? item.cbm : null,
            weight: item ? item.weight : null,
            image: item ? item.image : null,
        }));
    }

    function addDraftToRows() {
        const qty = Number(draft.qty) || 0;
        const price = Number(draft.price) || 0;
        if (!draft.itemName || qty <= 0) {
            setError("Please select an item and enter a valid quantity.");
            return;
        }
        const uv = draft.unit_value !== undefined ? draft.unit_value : 0;
        const amount = totalQty(qty, uv) * price;
        setRows((prev) => {
            const updatedRow: Row = {
                id: editingRowId ?? rowCounter++,
                itemId: draft.itemId!,
                itemName: draft.itemName!,
                unit: draft.unit || "",
                unit_value: uv,
                finish: draft.finish || "",
                size: draft.size || "",
                qty: String(qty),
                price: String(price),
                amount,
                cbm: draft.cbm !== undefined ? draft.cbm : null,
                weight: draft.weight !== undefined ? draft.weight : null,
                image: draft.image !== undefined ? draft.image : null,
            };

            if (editingRowId !== null) {
                return prev.map((r) => (r.id === editingRowId ? updatedRow : r));
            }
            return [...prev, updatedRow];
        });
        setError("");
        closeModal();
    }

    function removeRow(id: number) {
        setRows((prev) => prev.filter((r) => r.id !== id));
    }

    const grandTotal = rows.reduce((sum, r) => sum + r.amount, 0);
    const totalCbm = rows.reduce(
        (sum, r) => sum + totalQty(Number(r.qty) || 0, r.unit_value) * (r.cbm || 0),
        0
    );
    const totalWeight = rows.reduce(
        (sum, r) => sum + totalQty(Number(r.qty) || 0, r.unit_value) * (r.weight || 0),
        0
    );

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setSubmitting(true);

        const validRows = rows.filter((r) => r.itemName && Number(r.qty) > 0);
        if (validRows.length === 0) {
            setError("Please add at least one item with quantity.");
            setSubmitting(false);
            return;
        }

        try {
            const url = isEditing ? `/api/quotations/${editId}` : "/api/quotations";
            const method = isEditing ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    partyName,
                    partyPhone,
                    items: validRows.map((r) => ({
                        itemName: r.itemName,
                        unit: r.unit,
                        unit_value: r.unit_value,
                        finish: r.finish,
                        size: r.size,
                        qty: Number(r.qty),
                        price: Number(r.price),
                        cbm: r.cbm,
                        weight: r.weight,
                        image: r.image,
                    })),
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Failed to save quotation.");
                setSubmitting(false);
                return;
            }

            router.push(`/quotations/${data.quotation.id}`);
        } catch (err: any) {
            setError(err.message || "Network error.");
            setSubmitting(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-100 pb-24">
            <NavBar />
            <main className="max-w-3xl mx-auto px-4 py-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-1">
                    {isEditing ? "Edit Quotation" : "New Quotation"}
                </h1>
                <p className="text-gray-500 mb-6">
                    {isEditing
                        ? "Update party details and items."
                        : "Fill in party details and add items."}
                </p>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Party details */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
                        <h2 className="font-semibold text-gray-800 mb-4">Party Details</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Party Name *
                                </label>
                                <input
                                    type="text"
                                    value={partyName}
                                    onChange={(e) => setPartyName(e.target.value)}
                                    required
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Enter party / customer name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Party Phone (optional)
                                </label>
                                <input
                                    type="tel"
                                    value={partyPhone}
                                    onChange={(e) => setPartyPhone(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Enter phone number"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-gray-800">Items</h2>
                            <button
                                type="button"
                                onClick={() => openModal()}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 active:scale-[0.98] transition"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                                Add Item
                            </button>
                        </div>

                        {rows.length === 0 ? (
                            <div className="text-center text-gray-400 text-sm py-8 border-2 border-dashed border-gray-200 rounded-lg">
                                No items added yet. Click "Add Item" to add line items.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="hidden sm:grid grid-cols-12 gap-2 px-3 text-xs font-semibold text-gray-500 uppercase">
                                    <div className="col-span-4">Item</div>
                                    <div className="col-span-2 text-right">Qty</div>
                                    <div className="col-span-2 text-right">Price</div>
                                    <div className="col-span-2 text-right">CBM</div>
                                    <div className="col-span-2 text-right">Wt (kg)</div>
                                </div>
                                {rows.map((row, index) => (
                                    <div
                                        key={row.id}
                                        className="group relative flex flex-col gap-1.5 rounded-lg border border-gray-200 bg-white p-2 shadow-2xs transition-all hover:border-gray-300 hover:shadow-xs"
                                    >
                                        {/* Top Row: Index, Thumbnail, Item Name, Qty, Unit Price/CBM/Wt & Delete Button */}
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-[11px] font-bold text-gray-400 shrink-0">
                                                {index + 1}.
                                            </span>

                                            {/* Thumbnail */}
                                            {row.image ? (
                                                <img
                                                    src={`/api/${row.image}`}
                                                    alt={row.itemName}
                                                    className="h-7 w-7 shrink-0 rounded object-cover border border-gray-100"
                                                />
                                            ) : (
                                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-gray-50 border border-gray-100 text-gray-400">
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                            )}

                                            {/* Item Title & Unit Tag */}
                                            <div className="min-w-0 flex-1 flex items-center gap-1.5">
                                                <h4 className="text-xs font-semibold text-gray-800 truncate leading-tight">
                                                    {row.itemName}
                                                </h4>
                                                {row.unit && (
                                                    <span className="shrink-0 rounded bg-gray-100 px-1 py-0.2 text-[10px] font-medium text-gray-500">
                                                        {row.unit_value > 0 && row.unit_value} - {row.unit}
                                                    </span>
                                                )}
                                            </div>



                                            {/* Edit Action */}
                                            <button
                                                type="button"
                                                onClick={() => openModal(row)}
                                                className="p-1 rounded text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors shrink-0"
                                                aria-label="Edit row"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>

                                            {/* Remove Action */}
                                            <button
                                                type="button"
                                                onClick={() => removeRow(row.id)}
                                                className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                                                aria-label="Remove row"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                        <div className="flex">
                                            {/* Quick Qty Pill */}
                                            <div className="shrink-0 bg-emerald-300 px-1.5 py-0.5 rounded border border-gray-100 text-[11px] font-bold text-gray-700">
                                                <span className="text-[10px] font-normal  mr-1">CTN:</span>
                                                {row.qty}
                                                {/* {row.unit_value > 0 && (
                                                    <span className="text-[10px] font-normal ml-1">
                                                        x{row.unit_value}={totalQty(Number(row.qty) || 0, row.unit_value)}
                                                    </span>
                                                )} */}
                                            </div>
                                            <div className="shrink-0 bg-indigo-300 px-1.5 py-0.5 rounded border border-gray-100 text-[11px] font-bold text-gray-700">
                                                <span className="text-[10px] font-normal  mr-1">QTY:</span>
                                                {row.qty}
                                                {row.unit_value > 0 && (
                                                    <span className="text-[10px] font-normal ml-1">
                                                        x{row.unit_value}=<span className="text-[10px] font-bold ml-1">{totalQty(Number(row.qty) || 0, row.unit_value)}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Bottom Row: Compact Metrics (Unit vs Total) */}
                                        <div className="grid grid-cols-3 gap-1 bg-gray-50/70 rounded p-1.5 text-[11px] border border-gray-100">
                                            {/* Price */}
                                            <div className="min-w-0">
                                                <div className="text-[9px] font-bold uppercase text-gray-400 leading-none mb-0.5">Price</div>
                                                <div className="text-gray-500 text-[10px] truncate">
                                                    U: <span className="text-gray-700">{currency(Number(row.price) || 0)}</span>
                                                </div>
                                                <div className="font-bold text-gray-900 truncate">
                                                    T: {currency(row.amount)}
                                                </div>
                                            </div>

                                            {/* CBM */}
                                            <div className="min-w-0 border-l border-gray-200/60 pl-1.5">
                                                <div className="text-[9px] font-semibold uppercase text-gray-400 leading-none mb-0.5">CBM</div>
                                                <div className="text-gray-500 text-[10px] truncate">
                                                    U: <span className="text-gray-700">{fmt(Number(row.cbm) || 0)}</span>
                                                </div>
                                                <div className="font-bold text-gray-900 truncate">
                                                    T: {fmt(totalQty(Number(row.qty) || 0, row.unit_value) * (Number(row.cbm) || 0))}
                                                </div>
                                            </div>

                                            {/* Weight */}
                                            <div className="min-w-0 border-l border-gray-200/60 pl-1.5">
                                                <div className="text-[9px] font-semibold uppercase text-gray-400 leading-none mb-0.5">Weight</div>
                                                <div className="text-gray-500 text-[10px] truncate">
                                                    U: <span className="text-gray-700">{fmt(Number(row.weight) || 0)}</span>
                                                </div>
                                                <div className="font-bold text-gray-900 truncate">
                                                    T: {fmt(totalQty(Number(row.qty) || 0, row.unit_value) * (Number(row.weight) || 0))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Total */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 sticky bottom-0">
                        <div className="space-y-2 mb-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">T.CBM</span>
                                <span className="font-semibold text-gray-800">{fmt(totalCbm)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">T.Wt</span>
                                <span className="font-semibold text-gray-800">{fmt(totalWeight)} kg</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                            <span className="font-semibold text-gray-800">Grand Total</span>
                            <span className="text-2xl font-bold text-indigo-600">
                                {currency(grandTotal)}
                            </span>
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="no-print">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-semibold text-lg hover:bg-indigo-700 active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {submitting
                                ? isEditing
                                    ? "Updating..."
                                    : "Saving..."
                                : isEditing
                                    ? "Update Quotation"
                                    : "Save Quotation"}
                        </button>
                    </div>
                </form>
            </main>

            {/* Add Item Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={closeModal}
                    />
                    <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">
                                {editingRowId !== null ? "Edit Item" : "Add Item"}
                            </h3>
                            <button
                                type="button"
                                onClick={closeModal}
                                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                                aria-label="Close"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Select Item *
                                </label>
                                <select
                                    value={draft.itemId}
                                    onChange={(e) => handleDraftItemSelect(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">-- Select item --</option>
                                    {items.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name} ({item.unit})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {draft.itemName && (
                                <div className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                                    {draft.itemName}
                                    {(draft.unit_value !== undefined && draft.unit_value > 0) && (
                                        <span> · each CTN {effUnitValue(draft.unit_value)} {draft.unit}</span>
                                    )}
                                    {draft.finish && (
                                        <span> · Finish {draft.finish}</span>
                                    )}
                                    {draft.size && (
                                        <span> · Size {draft.size}</span>
                                    )}
                                    {draft.cbm !== null && draft.cbm !== undefined && (
                                        <span> · CBM {fmt(draft.cbm)}</span>
                                    )}
                                    {draft.weight !== null && draft.weight !== undefined && (
                                        <span> · Wt {fmt(draft.weight)} kg</span>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Qty *
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={draft.qty}
                                        onChange={(e) => setDraft({ ...draft, qty: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Price
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={draft.price}
                                        onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                                <span className="text-sm font-medium text-gray-600">
                                    Total Qty / Amount
                                </span>
                                <span className="text-right">
                                    <span className="block text-xs text-gray-500">
                                        {totalQty(Number(draft.qty) || 0, draft.unit_value)} {draft.unit || "units"}
                                    </span>
                                    <span className="font-semibold text-gray-800">
                                        {currency(totalQty(Number(draft.qty) || 0, draft.unit_value) * (Number(draft.price) || 0))}
                                    </span>
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-5">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="flex-1 py-2.5 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={addDraftToRows}
                                className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                            >
                                {editingRowId !== null ? "Update Item" : "Add Item"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-100"><NavBar /></div>}>
            <CreateQuotationPage />
        </Suspense>
    );
}

