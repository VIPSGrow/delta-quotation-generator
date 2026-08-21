import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiSession } from "@/lib/api-auth";
import { saveImage } from "@/lib/image";

// GET /api/items — list items with pagination
export async function GET(request: NextRequest) {
  const session = await verifyApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(
      1,
      parseInt(searchParams.get("page") || "1", 10) || 1,
    );
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "5", 10) || 5),
    );

    const total = await prisma.item.count();
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);

    const items = await prisma.item.findMany({
      orderBy: { name: "asc" },
      skip: (safePage - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      items,
      total,
      page: safePage,
      pageSize,
      totalPages,
    });
  } catch (error) {
    console.error("Get items error:", error);
    return NextResponse.json(
      { error: "Failed to fetch items." },
      { status: 500 },
    );
  }
}

// POST /api/items — create a new item
export async function POST(request: NextRequest) {
  const session = await verifyApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const unit = typeof body.unit === "string" ? body.unit.trim() : "PCS";
    const defaultPrice = Number(body.defaultPrice) || 0;
    const image = await saveImage(body.image);
    const cbmVal = Number(body.cbm);
    const weightVal = Number(body.weight);
    const cbm =
      body.cbm === "" || body.cbm === null || body.cbm === undefined || isNaN(cbmVal)
        ? null
        : cbmVal;
    const weight =
      body.weight === "" || body.weight === null || body.weight === undefined || isNaN(weightVal)
        ? null
        : weightVal;
    const finish = typeof body.finish === "string" ? body.finish.trim() : "";
    const size = typeof body.size === "string" ? body.size.trim() : "";
    const unit_value =
      body.unit_value === "" ||
      body.unit_value === null ||
      body.unit_value === undefined
        ? 0
        : Math.max(0, Math.floor(Number(body.unit_value)) || 0);
    const packageUnit =
      typeof body.packageUnit === "string" ? body.packageUnit.trim() : "";
    const priceConfig = body.priceConfig === "package" ? "package" : "qty";

    if (!name) {
      return NextResponse.json(
        { error: "Item name is required." },
        { status: 400 },
      );
    }

    const item = await prisma.item.create({
      data: {
        name,
        unit,
        defaultPrice,
        image,
        cbm,
        weight,
        finish,
        size,
        unit_value,
        packageUnit,
        priceConfig,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "An item with this name already exists." },
        { status: 409 },
      );
    }
    console.error("Create item error:", error);
    return NextResponse.json(
      { error: "Failed to create item." },
      { status: 500 },
    );
  }
}
