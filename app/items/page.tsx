"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import NavBar from "@/components/NavBar";
import * as XLSX from "xlsx";

interface Item {
    id: number;
    name: string;
    unit: string;
    defaultPrice: number;
    image: string | null;
    cbm: number | null;
    weight: number | null;
    finish: string;
    size: string;
    unit_value: number;
}

const emptyForm = { name: "", unit: "PCS", defaultPrice: "", image: "", cbm: "", weight: "", finish: "", size: "", unit_value: "" };

export default function ItemsPage() {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [imagePreview, setImagePreview] = useState<string>("");
    const [bulkUploading, setBulkUploading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [toggleFormVisibility, setToggleFormVisibility] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const excelInputRef = useRef<HTMLInputElement>(null);

    const PAGE_SIZE = 10;

    const fetchItems = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/items?page=${page}&limit=${PAGE_SIZE}`);
            if (!res.ok) throw new Error("Failed to load items");
            const data = await res.json();
            setItems(data.items);
            setCurrentPage(data.page);
            setTotalItems(data.total);
            setTotalPages(data.totalPages);
        } catch (err: any) {
            setError(err.message || "Failed to load items.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchItems(1);
    }, [fetchItems]);

    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = Math.min(startIndex + items.length, totalItems);
    const paginatedItems = items;

    function goToPage(page: number) {
        if (page < 1 || page > totalPages || page === currentPage) return;
        fetchItems(page);
    }

    function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) {
            setForm({ ...form, image: "" });
            setImagePreview("");
            return;
        }
        if (!file.type.startsWith("image/")) {
            setError("Please select a valid image file.");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            setForm({ ...form, image: result });
            setImagePreview(result);
        };
        reader.readAsDataURL(file);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setSubmitting(true);

        const payload = {
            name: form.name,
            unit: form.unit,
            defaultPrice: Number(form.defaultPrice) || 0,
            image: form.image,
            cbm: form.cbm === "" ? null : Number(form.cbm),
            weight: form.weight === "" ? null : Number(form.weight),
            finish: form.finish,
            size: form.size,
            unit_value: form.unit_value === "" ? 0 : Math.max(0, Math.floor(Number(form.unit_value)) || 0),
        };

        try {
            const url = editingId ? `/api/items/${editingId}` : "/api/items";
            const res = await fetch(url, {
                method: editingId ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Failed to save item.");
                setSubmitting(false);
                return;
            }
            setForm(emptyForm);
            setImagePreview("");
            setEditingId(null);
            await fetchItems(currentPage);
        } catch (err: any) {
            setError(err.message || "Network error.");
        } finally {
            setSubmitting(false);
        }
    }

    function handleEdit(item: Item) {
        setEditingId(item.id);
        setForm({
            name: item.name,
            unit: item.unit,
            defaultPrice: String(item.defaultPrice),
            image: item.image || "",
            cbm: item.cbm === null || item.cbm === undefined ? "" : String(item.cbm),
            weight: item.weight === null || item.weight === undefined ? "" : String(item.weight),
            finish: item.finish || "",
            size: item.size || "",
            unit_value: item.unit_value === null || item.unit_value === undefined ? "" : String(item.unit_value),
        });
        setImagePreview(item.image || "");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function handleCancel() {
        setEditingId(null);
        setForm(emptyForm);
        setImagePreview("");
        setError("");
    }

    async function handleDelete(item: Item) {
        if (!confirm(`Delete item "${item.name}"?`)) return;
        try {
            const res = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Failed to delete item.");
                return;
            }
            await fetchItems(currentPage);
        } catch (err: any) {
            setError(err.message || "Network error.");
        }
    }

    async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setBulkUploading(true);
        setError("");

        try {
            const fileData = await file.arrayBuffer();
            const workbook = XLSX.read(fileData, { type: "array" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

            const parsedItems = rows
                .map((row) => ({
                    name: String(row.name ?? "").trim(),
                    unit: String(row.unit ?? "PCS").trim() || "PCS",
                    defaultPrice: Number(row.defaultPrice) || 0,
                    image: row.image ? String(row.image).trim() : "",
                    cbm: row.cbm === "" || row.cbm === undefined || row.cbm === null ? null : Number(row.cbm),
                    weight: row.weight === "" || row.weight === undefined || row.weight === null ? null : Number(row.weight),
                    finish: row.finish ? String(row.finish).trim() : "",
                    size: row.size ? String(row.size).trim() : "",
                    unit_value: row.unit_value === "" || row.unit_value === undefined || row.unit_value === null ? 0 : Math.max(0, Math.floor(Number(row.unit_value)) || 0),
                }))
                .filter((r) => r.name);

            if (parsedItems.length === 0) {
                setError("No valid items found in the Excel file. Ensure columns: name, unit, defaultPrice, image, cbm, weight, finish, size, unit_value.");
                return;
            }

            const res = await fetch("/api/items/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items: parsedItems }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Failed to upload items.");
                return;
            }

            const msg = [
                data.added > 0 ? `${data.added} added` : "",
                data.updated > 0 ? `${data.updated} updated` : "",
            ].filter(Boolean).join(", ");
            alert(`Bulk upload complete: ${msg || "0 changed"}${data.errors?.length ? `\n${data.errors.length} skipped` : ""}`);
            await fetchItems(1);
        } catch (err: any) {
            setError(err.message || "Failed to read Excel file.");
        } finally {
            setBulkUploading(false);
            if (excelInputRef.current) excelInputRef.current.value = "";
        }
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <NavBar />
            <main className="max-w-3xl mx-auto px-4 py-6">
                <div className="flex items-center justify-between mb-1">
                    <h1 className="text-2xl font-bold text-gray-800">Item Master</h1>
                    <div className="items-center flex gap-2 justify-between">
                        <input
                            ref={excelInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleExcelUpload}
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => setToggleFormVisibility(!toggleFormVisibility)}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-900 text-white text-sm font-semibold hover:bg-emerald-700 active:scale-[0.98] transition disabled:opacity-60"
                        >
                            {toggleFormVisibility ? "Hide Form" : "Add Item"}
                        </button>
                        <button
                            type="button"
                            onClick={() => excelInputRef.current?.click()}
                            disabled={bulkUploading}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 active:scale-[0.98] transition disabled:opacity-60"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            {bulkUploading ? "Uploading..." : "Upload Excel"}
                        </button>
                    </div>
                </div>
                <p className="text-gray-500 mb-6">Add, edit and delete items. Bulk upload supported via Excel.</p>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">
                        {error}
                    </div>
                )}

                {/* Form */}
                {toggleFormVisibility &&
                    <form
                        onSubmit={handleSubmit}
                        className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6"
                    >
                        <h2 className="font-semibold text-gray-800 mb-4">
                            {editingId ? "Edit Item" : "Add New Item"}
                        </h2>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Item Name *
                                </label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g. Design Service - Logo"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Unit
                                    </label>
                                    <input
                                        type="text"
                                        value={form.unit}
                                        onChange={(e) => setForm({ ...form, unit: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="PCS"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Default Price
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.defaultPrice}
                                        onChange={(e) =>
                                            setForm({ ...form, defaultPrice: e.target.value })
                                        }
                                        className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Image
                                </label>
                                <div className="flex items-center gap-3">
                                    {(imagePreview || form.image) ? (
                                        <img
                                            src={form.image || imagePreview}
                                            alt="Preview"
                                            className="w-16 h-16 rounded-lg object-cover border border-gray-200 shrink-0"
                                        />
                                    ) : (
                                        <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-semibold file:cursor-pointer hover:file:bg-indigo-100"
                                        />
                                        {(imagePreview || editingId) && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setForm({ ...form, image: "" });
                                                    setImagePreview("");
                                                    if (fileInputRef.current) fileInputRef.current.value = "";
                                                }}
                                                className="mt-1 text-sm text-red-600 hover:underline"
                                            >
                                                Remove image
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        CBM (Cubic Meter)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={form.cbm}
                                        onChange={(e) => setForm({ ...form, cbm: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Weight
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={form.weight}
                                        onChange={(e) => setForm({ ...form, weight: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Finish
                                    </label>
                                    <input
                                        type="text"
                                        value={form.finish}
                                        onChange={(e) => setForm({ ...form, finish: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="e.g. Matte"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Size
                                    </label>
                                    <input
                                        type="text"
                                        value={form.size}
                                        onChange={(e) => setForm({ ...form, size: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="e.g. A4"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Unit Value
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={form.unit_value}
                                    onChange={(e) => setForm({ ...form, unit_value: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="0"
                                />
                            </div>

                            <div className="flex gap-2 pt-1">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 active:scale-[0.98] transition disabled:opacity-60"
                                >
                                    {submitting
                                        ? "Saving..."
                                        : editingId
                                            ? "Update Item"
                                            : "Add Item"}
                                </button>
                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={handleCancel}
                                        className="px-4 py-2.5 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>
                }

                {/* List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-800">Items ({totalItems})</h2>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading...</div>
                    ) : items.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No items yet. Add your first item above.
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {paginatedItems.map((item) => (
                                <li
                                    key={item.id}
                                    className="flex items-center justify-between px-4 py-3"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        {item.image ? (
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                                                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <div className="font-medium text-gray-800 truncate">
                                                {item.name}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {item.unit} · ₹{item.defaultPrice.toLocaleString("en-IN")}
                                                {item.cbm !== null && item.cbm !== undefined && (
                                                    <span> · CBM {item.cbm}</span>
                                                )}
                                                {item.weight !== null && item.weight !== undefined && (
                                                    <span> · Wt {item.weight}</span>
                                                )}
                                                {item.finish && (
                                                    <span> · Finish {item.finish}</span>
                                                )}
                                                {item.size && (
                                                    <span> · Size {item.size}</span>
                                                )}
                                                {item.unit_value !== null && item.unit_value !== undefined && item.unit_value !== 0 && (
                                                    <span> · Unit Value {item.unit_value}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <button
                                            onClick={() => {
                                                setToggleFormVisibility(true);
                                                handleEdit(item)
                                            }}
                                            className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50"
                                            aria-label="Edit"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item)}
                                            className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                                            aria-label="Delete"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* Pagination Controls */}
                    {!loading && totalPages > 1 && (
                        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
                            <span className="text-sm text-gray-500">
                                Showing {startIndex + 1}–{endIndex} of {totalItems}
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage <= 1}
                                    className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                    aria-label="Previous page"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => goToPage(p)}
                                        className={`w-9 h-9 rounded-lg text-sm font-medium transition ${p === currentPage
                                            ? "bg-indigo-600 text-white"
                                            : "text-gray-600 hover:bg-gray-100 border border-gray-200"
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}

                                <button
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage >= totalPages}
                                    className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                    aria-label="Next page"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
