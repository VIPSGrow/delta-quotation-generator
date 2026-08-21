import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiSession } from "@/lib/api-auth";
import { saveImage, deleteImage } from "@/lib/image";

type Params = { params: { id: string } };

// GET /api/items/:id — get a single item
export async function GET(_request: NextRequest, { params }: Params) {
  const session = await verifyApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id) {
    return NextResponse.json({ error: "Invalid item id." }, { status: 400 });
  }

  try {
    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (error) {
    console.error("Get item error:", error);
    return NextResponse.json(
      { error: "Failed to fetch item." },
      { status: 500 },
    );
  }
}

// PUT /api/items/:id — update an item
export async function PUT(request: NextRequest, { params }: Params) {
  const session = await verifyApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id) {
    return NextResponse.json({ error: "Invalid item id." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const unit = typeof body.unit === "string" ? body.unit.trim() : "PCS";
    const defaultPrice = Number(body.defaultPrice) || 0;
    const image = await saveImage(body.image);
    const cbm =
      body.cbm === "" || body.cbm === null || body.cbm === undefined
        ? null
        : Number(body.cbm);
    const weight =
      body.weight === "" || body.weight === null || body.weight === undefined
        ? null
        : Number(body.weight);
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

    const existing = await prisma.item.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    const item = await prisma.item.update({
      where: { id },
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

    // If the image changed, remove the old image file
    if (image !== existing.image) {
      await deleteImage(existing.image);
    }

    return NextResponse.json({ item });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "An item with this name already exists." },
        { status: 409 },
      );
    }
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }
    console.error("Update item error:", error);
    return NextResponse.json(
      { error: "Failed to update item." },
      { status: 500 },
    );
  }
}

// DELETE /api/items/:id — delete an item
export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await verifyApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id) {
    return NextResponse.json({ error: "Invalid item id." }, { status: 400 });
  }

  try {
    const existing = await prisma.item.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }
    await prisma.item.delete({ where: { id } });
    await deleteImage(existing.image);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }
    console.error("Delete item error:", error);
    return NextResponse.json(
      { error: "Failed to delete item." },
      { status: 500 },
    );
  }
}
