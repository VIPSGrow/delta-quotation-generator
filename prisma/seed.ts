import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create default admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: hashedPassword,
    },
  });

  console.log(`✅ Default admin user created: ${admin.username} / admin123`);

  // Create some sample items
  const sampleItems = [
    {
      name: "Design Service - Logo",
      unit: "PCS",
      defaultPrice: 5000,
      image: null,
      cbm: null,
      weight: null,
      finish: "",
      size: "",
      unit_value: 0,
    },
    {
      name: "Design Service - Banner",
      unit: "PCS",
      defaultPrice: 2000,
      image: null,
      cbm: null,
      weight: null,
      finish: "",
      size: "",
      unit_value: 0,
    },
    {
      name: "Design Service - Brochure",
      unit: "PCS",
      defaultPrice: 3500,
      image: null,
      cbm: null,
      weight: null,
      finish: "",
      size: "",
      unit_value: 0,
    },
    {
      name: "Web Development - Landing Page",
      unit: "PCS",
      defaultPrice: 15000,
      image: null,
      cbm: null,
      weight: null,
      finish: "",
      size: "",
      unit_value: 0,
    },
    {
      name: "Web Development - Multi Page",
      unit: "PCS",
      defaultPrice: 35000,
      image: null,
      cbm: null,
      weight: null,
      finish: "",
      size: "",
      unit_value: 0,
    },
    {
      name: "Consultation Fee",
      unit: "HR",
      defaultPrice: 1000,
      image: null,
      cbm: null,
      weight: null,
      finish: "",
      size: "",
      unit_value: 0,
    },
    {
      name: "Printing - A4 Color",
      unit: "PCS",
      defaultPrice: 50,
      image: null,
      cbm: null,
      weight: null,
      finish: "",
      size: "",
      unit_value: 0,
    },
    {
      name: "Printing - A3 Color",
      unit: "PCS",
      defaultPrice: 100,
      image: null,
      cbm: null,
      weight: null,
      finish: "",
      size: "",
      unit_value: 0,
    },
  ];

  for (const item of sampleItems) {
    await prisma.item.upsert({
      where: { name: item.name },
      update: {},
      create: item,
    });
  }

  console.log(`✅ ${sampleItems.length} sample items created.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
