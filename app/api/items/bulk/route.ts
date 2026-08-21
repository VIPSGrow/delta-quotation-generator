import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyApiSession } from "@/lib/api-auth";
import { saveImage } from "@/lib/image";

// POST /api/items/bulk — bulk create/update items from parsed rows
export async function POST(request: NextRequest) {
  const session = await verifyApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rows = Array.isArray(body.items) ? body.items : [];
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No items provided to upload." },
      { status: 400 },
    );
  }

  let added = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const raw of rows) {
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    if (!name) {
      errors.push("Skipped row with missing name.");
      continue;
    }

    const unit =
      typeof raw.unit === "string" && raw.unit.trim() ? raw.unit.trim() : "PCS";
    const defaultPrice = Number(raw.defaultPrice) || 0;
    const image = await saveImage(raw.image);
    const cbmVal = Number(raw.cbm);
    const weightVal = Number(raw.weight);
    const cbm =
      raw.cbm === "" || raw.cbm === null || raw.cbm === undefined || isNaN(cbmVal)
        ? null
        : cbmVal;
    const weight =
      raw.weight === "" || raw.weight === null || raw.weight === undefined || isNaN(weightVal)
        ? null
        : weightVal;
    const finish = typeof raw.finish === "string" ? raw.finish.trim() : "";
    const size = typeof raw.size === "string" ? raw.size.trim() : "";
    const unit_value =
      raw.unit_value === "" ||
      raw.unit_value === null ||
      raw.unit_value === undefined
        ? 0
        : Math.max(0, Math.floor(Number(raw.unit_value)) || 0);
    const packageUnit =
      typeof raw.packageUnit === "string" ? raw.packageUnit.trim() : "";
    const priceConfig = raw.priceConfig === "package" ? "package" : "qty";

    const data = {
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
    };

    try {
      const existing = await prisma.item.findUnique({ where: { name } });
      if (existing) {
        await prisma.item.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await prisma.item.create({ data });
        added++;
      }
    } catch (error: any) {
      if (error?.code === "P2002") {
        errors.push(`Item "${name}" already exists.`);
      } else {
        console.error("Bulk item error:", error);
        errors.push(`Failed to save item "${name}".`);
      }
    }
  }

  return NextResponse.json({ added, updated, errors });
}
