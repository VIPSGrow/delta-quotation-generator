import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiSession } from "@/lib/api-auth";

type Params = { params: { id: string } };

// GET /api/quotations/:id — get a single quotation with items
export async function GET(_request: NextRequest, { params }: Params) {
  const session = await verifyApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id) {
    return NextResponse.json(
      { error: "Invalid quotation id." },
      { status: 400 },
    );
  }

  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!quotation) {
      return NextResponse.json(
        { error: "Quotation not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ quotation });
  } catch (error) {
    console.error("Get quotation error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quotation." },
      { status: 500 },
    );
  }
}

// PUT /api/quotations/:id — update a quotation with line items
export async function PUT(request: NextRequest, { params }: Params) {
  const session = await verifyApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id) {
    return NextResponse.json(
      { error: "Invalid quotation id." },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();
    const partyName =
      typeof body.partyName === "string" ? body.partyName.trim() : "";
    const partyPhone =
      typeof body.partyPhone === "string" ? body.partyPhone.trim() : "";
    const currency =
      typeof body.currency === "string" ? body.currency.trim() : "INR";
    const items = Array.isArray(body.items) ? body.items : [];

    if (!partyName) {
      return NextResponse.json(
        { error: "Party name is required." },
        { status: 400 },
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required." },
        { status: 400 },
      );
    }

    // Validate and sanitize line items
    const lineItems = items
      .map((row: any) => {
        const itemName =
          typeof row.itemName === "string" ? row.itemName.trim() : "";
        const qty = Number(row.qty) || 0;
        const price = Number(row.price) || 0;
        const unit_value =
          row.unit_value === "" ||
          row.unit_value === null ||
          row.unit_value === undefined
            ? 0
            : Math.max(0, Math.floor(Number(row.unit_value)) || 0);
        const packageUnit =
          typeof row.packageUnit === "string" ? row.packageUnit.trim() : "";
        const priceConfig =
          row.priceConfig === "package" ? "package" : "qty";
        const finalQty =
          priceConfig === "qty"
            ? qty * (unit_value > 0 ? unit_value : 1)
            : qty;
        const amount = finalQty * price;
        const cbmVal = Number(row.cbm);
        const weightVal = Number(row.weight);
        const cbm =
          row.cbm === "" || row.cbm === null || row.cbm === undefined || isNaN(cbmVal)
            ? null
            : cbmVal;
        const weight =
          row.weight === "" || row.weight === null || row.weight === undefined || isNaN(weightVal)
            ? null
            : weightVal;
        const image =
          row.image === "" || row.image === null || row.image === undefined
            ? null
            : String(row.image);
        const unit = typeof row.unit === "string" ? row.unit.trim() : "PCS";
        const finish = typeof row.finish === "string" ? row.finish.trim() : "";
        const size = typeof row.size === "string" ? row.size.trim() : "";
        if (!itemName || qty <= 0) return null;
        return {
          itemName,
          unit,
          unit_value,
          packageUnit,
          priceConfig,
          finish,
          size,
          qty,
          price,
          amount,
          cbm,
          weight,
          image,
        };
      })
      .filter(Boolean) as {
      itemName: string;
      unit: string;
      unit_value: number;
      packageUnit: string;
      priceConfig: string;
      finish: string;
      size: string;
      qty: number;
      price: number;
      amount: number;
      cbm: number | null;
      weight: number | null;
      image: string | null;
    }[];

    if (lineItems.length === 0) {
      return NextResponse.json(
        { error: "At least one valid item is required." },
        { status: 400 },
      );
    }

    const totalAmount = lineItems.reduce((sum, i) => sum + i.amount, 0);

    // Update quotation and replace items in a transaction
    const quotation = await prisma.$transaction(async (tx) => {
      await tx.quotationItem.deleteMany({ where: { quotationId: id } });
      return tx.quotation.update({
        where: { id },
        data: {
          partyName,
          partyPhone: partyPhone || null,
          currency,
          totalAmount,
          items: {
            create: lineItems,
          },
        },
        include: { items: true },
      });
    });

    return NextResponse.json({ quotation });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json(
        { error: "Quotation not found." },
        { status: 404 },
      );
    }
    console.error("Update quotation error:", error);
    return NextResponse.json(
      { error: "Failed to update quotation." },
      { status: 500 },
    );
  }
}

// DELETE /api/quotations/:id — delete a quotation
export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await verifyApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id) {
    return NextResponse.json(
      { error: "Invalid quotation id." },
      { status: 400 },
    );
  }

  try {
    await prisma.quotation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json(
        { error: "Quotation not found." },
        { status: 404 },
      );
    }
    console.error("Delete quotation error:", error);
    return NextResponse.json(
      { error: "Failed to delete quotation." },
      { status: 500 },
    );
  }
}
