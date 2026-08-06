import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import NavBar from "@/components/NavBar";

export default async function DashboardPage() {
    const session = await getSession();
    if (!session) {
        redirect("/login");
    }

    const [itemCount, quotationCount, totalRevenue] = await Promise.all([
        prisma.item.count(),
        prisma.quotation.count(),
        prisma.quotation.aggregate({ _sum: { totalAmount: true } }),
    ]);

    const stats = [
        {
            label: "Total Items",
            value: itemCount,
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
            ),
        },
        {
            label: "Total Quotations",
            value: quotationCount,
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
        },
        {
            label: "Total Revenue",
            value: `₹${(totalRevenue._sum.totalAmount || 0).toLocaleString("en-IN")}`,
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
    ];

    return (
        <div className="min-h-screen bg-gray-100">
            <NavBar />
            <main className="max-w-3xl mx-auto px-4 py-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-1">
                    Welcome, {session?.username}
                </h1>
                <p className="text-gray-500 mb-6">Create and manage quotations easily.</p>

                <div className="grid grid-cols-3 gap-3 mb-6">
                    {stats.map((s, i) => (
                        <div
                            key={i}
                            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                        >
                            <div className="text-indigo-600 mb-2">{s.icon}</div>
                            <div className="text-xl font-bold text-gray-800">{s.value}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                        </div>
                    ))}
                </div>

                <div className="space-y-3">
                    <Link
                        href="/quotations/create"
                        className="flex items-center justify-between bg-indigo-600 text-white rounded-xl p-4 shadow-sm hover:bg-indigo-700 active:scale-[0.99] transition"
                    >
                        <div>
                            <div className="font-semibold">Create New Quotation</div>
                            <div className="text-sm text-indigo-200">
                                Build a quote with dynamic items
                            </div>
                        </div>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                    </Link>

                    <Link
                        href="/quotations"
                        className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:bg-gray-50 active:scale-[0.99] transition"
                    >
                        <div>
                            <div className="font-semibold text-gray-800">Quotation History</div>
                            <div className="text-sm text-gray-500">
                                View saved quotations & PDFs
                            </div>
                        </div>
                        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </Link>

                    <Link
                        href="/items"
                        className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:bg-gray-50 active:scale-[0.99] transition"
                    >
                        <div>
                            <div className="font-semibold text-gray-800">Manage Items</div>
                            <div className="text-sm text-gray-500">
                                Add, edit & delete item master
                            </div>
                        </div>
                        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </Link>
                </div>
            </main>
        </div>
    );
}
