import { prisma } from "@/lib/db/prisma";

async function main() {
  const [
    users,
    merchants,
    stores,
    categories,
    products,
    variants,
    inventoryLedger,
    riders,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.merchant.count(),
    prisma.store.count(),
    prisma.category.count(),
    prisma.product.count(),
    prisma.variant.count(),
    prisma.inventoryLedger.count(),
    prisma.rider.count(),
  ]);

  console.log({
    users,
    merchants,
    stores,
    categories,
    products,
    variants,
    inventoryLedger,
    riders,
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
