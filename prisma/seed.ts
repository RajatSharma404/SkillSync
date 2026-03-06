import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEFAULT_DOMAINS } from "../src/types";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set.");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding default domains…");
  for (const domain of DEFAULT_DOMAINS) {
    const existing = await prisma.domain.findUnique({
      where: { name: domain.name },
    });
    if (!existing) {
      await prisma.domain.create({ data: domain });
      console.log(`  ✓ Created domain: ${domain.icon} ${domain.name}`);
    } else {
      console.log(`  · Already exists: ${domain.name}`);
    }
  }
  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
