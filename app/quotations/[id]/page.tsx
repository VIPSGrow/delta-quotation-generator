import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import PrintButton from "@/components/PrintButton";

const currency = (n: number) =>
    "₹" +
    (isFinite(n) ? n.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "0");

function formatDate(iso: Date) {
    return new Date(iso).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

export default async function QuotationDetailPage({
    params,
}: {
    params: { id: string };
}) {
    const session = await getSession();
    if (!session) {
        redirect("/login");
    }

    const id = Number(params.id);
    if (!id) return notFound();

    const quotation = await prisma.quotation.findUnique({
        where: { id },
        include: { items: true },
    });

    // console.log(quotation);

    if (!quotation) return notFound();


    const quoteRef = `QT-${String(quotation.id).padStart(6, "0")}`;

    return (
        <main className="min-h-screen bg-gray-100">
            {/* Action bar */}
            <div className="sticky top-0 z-20 bg-white border-b border-gray-200 no-print">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
                    <Link
                        href="/quotations"
                        className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back
                    </Link>
                    <div className="flex gap-2">
                        <PrintButton />
                    </div>
                </div>
            </div>

            {/* Printable quotation document */}
            <div className="max-w-5xl mx-auto px-4 py-6" >
                <div
                    id="quotation-doc"
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 print:shadow-none print:border-0 print:rounded-none"
                >
                    {/* Header */}
                    <div className="flex items-start justify-between border-b-2 border-indigo-600 pb-4 mb-6">
                        <div>
                            <div className="text-2xl font-bold text-indigo-600">QUOTATION</div>
                            <div className="text-sm text-gray-500 mt-1">Reference: {quoteRef}</div>
                        </div>
                        <div className="text-right">
                            <div className="font-semibold text-gray-800">Date</div>
                            <div className="text-sm text-gray-600">{formatDate(quotation.createdAt)}</div>
                        </div>
                    </div>

                    {/* Party */}
                    <div className="mb-6">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Bill To
                        </div>
                        <div className="text-lg font-semibold text-gray-800">
                            {quotation.partyName}
                        </div>
                        {quotation.partyPhone && (
                            <div className="text-sm text-gray-600">
                                Phone: {quotation.partyPhone}
                            </div>
                        )}
                    </div>

                    {/* Items table */}
                    <div style={{ overflow: 'auto' }}>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-gray-200 text-left">
                                    <th className="py-2 pr-2 font-semibold text-gray-100 w-8 bg-gray-700 border text-center">#</th>
                                    <th className="py-2 px-1 font-semibold text-gray-100 w-28 bg-gray-700 border text-center">
                                        Image
                                    </th>
                                    <th className="py-2 px-1 font-semibold text-gray-100 w-12 text-center border bg-gray-700">
                                        Finish
                                    </th>
                                    <th className="py-2 px-1 font-semibold text-gray-100 w-12 text-center border bg-gray-700">
                                        Size
                                    </th>
                                    <th className="py-2 px-1 font-semibold text-gray-100 w-12 text-center border bg-gray-700">
                                        Packing
                                    </th>
                                    <th className="py-2 px-1 font-semibold text-gray-100 w-12 text-center border bg-gray-700">
                                        CTN
                                    </th>
                                    <th className="py-2 px-2 font-semibold text-gray-100 text-right w-16 border text-center bg-gray-700">
                                        Qty
                                    </th>
                                    <th className="py-2 px-2 font-semibold text-gray-100 text-right w-24 border bg-gray-700">
                                        Rates
                                    </th>
                                    <th className="py-2 pe-2 font-semibold text-gray-100 text-right w-28 border bg-gray-700">
                                        Amount
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {quotation.items.map((item, index) => (
                                    <tr key={item.id} className="border-b border-gray-100">
                                        <td className="py-2.5 pr-2 border text-gray-500 text-center">{index + 1}</td>
                                        <td className="py-2.5 px-1 border">
                                            {item.image ? (
                                                <img
                                                    src={item.image}
                                                    alt={item.itemName}
                                                    className="h-50 w-50 rounded object-cover border border-gray-100"
                                                />
                                            ) : (
                                                <div className="h-10 w-10 rounded bg-gray-50 border border-gray-100" />
                                            )}
                                            <span className="text-sm text-gray-800 block mt-1">{item.itemName}</span>
                                        </td>

                                        <td className="py-2.5 border px-2 text-right text-gray-800 text-center">
                                            {item.finish !== "" ? item.finish : "-"}
                                        </td>

                                        <td className="py-2.5 border px-2 text-right text-gray-800 text-center">
                                            {item.size !== "" ? item.size : "-"}
                                        </td>
                                        <td className="py-2.5 border px-2 text-right text-gray-800 text-center">
                                            {item.unit_value} - {item.unit}
                                        </td>

                                        <td className="py-2.5 border px-2 text-right text-gray-800">
                                            {item.qty}
                                        </td>

                                        <td className="py-2.5 border px-2 text-right text-gray-800">
                                            {item.qty * item.unit_value}
                                        </td>
                                        <td className="py-2.5 border px-2 text-right text-gray-800">
                                            {currency(item.price)}
                                        </td>
                                        <td className="py-2.5 border pe-2 text-right font-medium text-gray-800">
                                            {currency(item.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Total */}
                    <div className="flex justify-end mt-4">
                        <div className="w-full max-w-xs">
                            <div className="flex items-center justify-between border-t-2 border-gray-800 pt-3 mt-2">
                                <span className="font-bold text-gray-800">Grand Total</span>
                                <span className="text-xl font-bold text-indigo-600">
                                    {currency(quotation.totalAmount)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-10 pt-6 border-t border-gray-200 text-center">
                        <p className="text-sm text-gray-600">Thank you for your business!</p>
                        <p className="text-xs text-gray-400 mt-1">
                            This is a computer-generated quotation. No signature required.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
