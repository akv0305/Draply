/**
 * Draply — Development Seed
 * Run via: pnpm db:seed
 *
 * Creates: categories, users, addresses, merchants, stores, riders,
 *          products, variants, inventoryLedger rows.
 * Idempotent: truncates all rows first, then re-inserts.
 */

import { PrismaClient, UserRole, MerchantKycStatus, StoreStatus, RiderStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

// Load env — tsx is invoked with --env-file=.env.local but dotenv ensures it works either way
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

function makeClient() {
  const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"]! });
  return new PrismaClient({ adapter, log: ["error", "warn"] });
}

const prisma = makeClient();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** Return a random int in [min, max] inclusive */
function rnd(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Return a random float in [min, max] rounded to 6 decimal places */
function rndF(min: number, max: number): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(6));
}

// ─────────────────────────────────────────────────────────────────────────────
// Data definitions
// ─────────────────────────────────────────────────────────────────────────────

const BRANDS = ["Trendz", "Stitchcraft", "Local Weave", "Urbane", "Saanjh"];

const COLORS = [
  { name: "Black", hex: "#1a1a1a" },
  { name: "White", hex: "#ffffff" },
  { name: "Navy", hex: "#1b3a6b" },
  { name: "Maroon", hex: "#800000" },
  { name: "Beige", hex: "#f5f0e8" },
  { name: "Olive", hex: "#6b7c3b" },
  { name: "Mustard", hex: "#e3a908" },
  { name: "Rose", hex: "#f4a7b9" },
  { name: "Teal", hex: "#1a7f7a" },
  { name: "Charcoal", hex: "#3c3c3c" },
];

// Unsplash stable image collections (query-based direct URLs)
const UNSPLASH_FASHION = [
  "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&q=80", // Indian woman kurta
  "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&q=80", // Indian ethnic wear
  "https://images.unsplash.com/photo-1594938298603-c8148c4b4f41?w=600&q=80", // saree
  "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&q=80", // anarkali kurta
  "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=600&q=80", // ethnic jacket
  "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&q=80", // men shirt formal
  "https://images.unsplash.com/photo-1512327428910-e8e85a7041ed?w=600&q=80", // men tshirt
  "https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=600&q=80", // trousers
  "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&q=80", // men kurta
  "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=600&q=80", // fashion dress
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80", // tops women
  "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=600&q=80", // dupatta ethnic
  "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=600&q=80", // accessories fashion
  "https://images.unsplash.com/photo-1591370874773-6702e8f12fd8?w=600&q=80", // jacket women
  "https://images.unsplash.com/photo-1542060748-10c28b62716f?w=600&q=80", // innerwear/basics
];

const STORE_BANNERS = [
  "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=1200&q=80",
  "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=1200&q=80",
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80",
  "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200&q=80",
  "https://images.unsplash.com/photo-1530305408560-82d13781b33a?w=1200&q=80",
  "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=1200&q=80",
  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&q=80",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80",
];

const STORE_LOGOS = [
  "https://images.unsplash.com/photo-1620325867502-221cfb5faa5f?w=200&q=80",
  "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&q=80",
  "https://images.unsplash.com/photo-1607082350899-7e105aa886ae?w=200&q=80",
  "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=200&q=80",
];

// ─────────────────────────────────────────────────────────────────────────────
// Truncation helper — deletes in reverse FK order
// ─────────────────────────────────────────────────────────────────────────────

async function truncateAll() {
  console.log("⚙️  Truncating all tables…");
  // Raw TRUNCATE CASCADE is cleanest in Postgres
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "OrderEvent",
      "Refund",
      "Return",
      "Assignment",
      "TrialItem",
      "Trial",
      "OrderItem",
      "SubOrder",
      "Order",
      "CartItem",
      "Cart",
      "InventoryReservation",
      "InventoryLedger",
      "Variant",
      "Product",
      "Category",
      "Store",
      "Merchant",
      "Rider",
      "Address",
      "User"
    RESTART IDENTITY CASCADE
  `);
  console.log("✅  All tables truncated.");
}

// ─────────────────────────────────────────────────────────────────────────────
// Step b — Categories
// ─────────────────────────────────────────────────────────────────────────────

async function seedCategories() {
  console.log("\n📂  Seeding categories…");

  // Top-level parents first
  const womenCat = await prisma.category.create({
    data: { slug: "women", name: "Women", sortOrder: 1, imageUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80" },
  });
  const menCat = await prisma.category.create({
    data: { slug: "men", name: "Men", sortOrder: 2, imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&q=80" },
  });
  const unisexCat = await prisma.category.create({
    data: { slug: "unisex", name: "Unisex", sortOrder: 3, imageUrl: "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=400&q=80" },
  });

  // Women sub-cats
  const wKurtas = await prisma.category.create({ data: { slug: "women-kurtas", name: "Kurtas", parentId: womenCat.id, sortOrder: 1 } });
  const wSarees = await prisma.category.create({ data: { slug: "women-sarees", name: "Sarees", parentId: womenCat.id, sortOrder: 2 } });
  const wTops = await prisma.category.create({ data: { slug: "women-tops", name: "Tops", parentId: womenCat.id, sortOrder: 3 } });
  const wDresses = await prisma.category.create({ data: { slug: "women-dresses", name: "Dresses", parentId: womenCat.id, sortOrder: 4 } });
  const wEthnicSets = await prisma.category.create({ data: { slug: "women-ethnic-sets", name: "Ethnic Sets", parentId: womenCat.id, sortOrder: 5 } });

  // Men sub-cats
  const mShirts = await prisma.category.create({ data: { slug: "men-shirts", name: "Shirts", parentId: menCat.id, sortOrder: 1 } });
  const mTshirts = await prisma.category.create({ data: { slug: "men-tshirts", name: "T-Shirts", parentId: menCat.id, sortOrder: 2 } });
  const mTrousers = await prisma.category.create({ data: { slug: "men-trousers", name: "Trousers", parentId: menCat.id, sortOrder: 3 } });
  const mKurtas = await prisma.category.create({ data: { slug: "men-kurtas", name: "Kurtas", parentId: menCat.id, sortOrder: 4 } });

  // Unisex sub-cats
  const uJackets = await prisma.category.create({ data: { slug: "unisex-jackets", name: "Jackets", parentId: unisexCat.id, sortOrder: 1 } });
  const uInnerwear = await prisma.category.create({ data: { slug: "unisex-innerwear", name: "Innerwear", parentId: unisexCat.id, sortOrder: 2 } });
  const uAccessories = await prisma.category.create({ data: { slug: "unisex-accessories", name: "Accessories", parentId: unisexCat.id, sortOrder: 3 } });

  console.log("✅  Categories: 15 created (3 parents + 12 sub-cats).");

  return {
    womenCat, menCat, unisexCat,
    wKurtas, wSarees, wTops, wDresses, wEthnicSets,
    mShirts, mTshirts, mTrousers, mKurtas,
    uJackets, uInnerwear, uAccessories,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step c — Users
// ─────────────────────────────────────────────────────────────────────────────

async function seedUsers() {
  console.log("\n👤  Seeding users…");

  const customers = await Promise.all([
    prisma.user.create({ data: { phone: "+919900000001", name: "Ananya Reddy", role: UserRole.CUSTOMER } }),
    prisma.user.create({ data: { phone: "+919900000002", name: "Vikram Rao", role: UserRole.CUSTOMER } }),
    prisma.user.create({ data: { phone: "+919900000003", name: "Priya Sharma", role: UserRole.CUSTOMER } }),
    prisma.user.create({ data: { phone: "+919900000004", name: "Karthik Naidu", role: UserRole.CUSTOMER } }),
    prisma.user.create({ data: { phone: "+919900000005", name: "Meera Iyer", role: UserRole.CUSTOMER } }),
  ]);

  const merchantOwners = await Promise.all([
    prisma.user.create({ data: { phone: "+919900000010", name: "Ravi Kumar", role: UserRole.MERCHANT } }),
    prisma.user.create({ data: { phone: "+919900000011", name: "Sita Devi", role: UserRole.MERCHANT } }),
  ]);

  const admin = await prisma.user.create({ data: { phone: "+919900000099", name: "Admin User", role: UserRole.ADMIN } });

  const riders = await Promise.all([
    prisma.user.create({ data: { phone: "+919900000020", name: "Suresh", role: UserRole.RIDER } }),
    prisma.user.create({ data: { phone: "+919900000021", name: "Mahesh", role: UserRole.RIDER } }),
    prisma.user.create({ data: { phone: "+919900000022", name: "Ramesh", role: UserRole.RIDER } }),
    prisma.user.create({ data: { phone: "+919900000023", name: "Lokesh", role: UserRole.RIDER } }),
  ]);

  console.log(`✅  Users: ${customers.length} customers, ${merchantOwners.length} merchant owners, 1 admin, ${riders.length} riders.`);
  return { customers, merchantOwners, admin, riders };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step d — Addresses
// ─────────────────────────────────────────────────────────────────────────────

async function seedAddresses(customers: { id: string }[]) {
  console.log("\n📍  Seeding addresses…");

  // Each customer gets one default address; some get a second
  const addressData = [
    // Ananya Reddy — Gachibowli
    { userId: customers[0]!.id, label: "Home", line1: "Flat 201, Sai Residency", line2: "Road No. 3", landmark: "Near DLF Cybercity", city: "Hyderabad", pincode: "500032", lat: 17.4400, lng: 78.3489, isDefault: true },
    // Vikram Rao — Madhapur
    { userId: customers[1]!.id, label: "Home", line1: "H.No 8-2-286, Madhapur Main Road", line2: null, landmark: "Opp. Westin Hotel", city: "Hyderabad", pincode: "500081", lat: 17.4484, lng: 78.3916, isDefault: true },
    // Priya Sharma — Jubilee Hills
    { userId: customers[2]!.id, label: "Home", line1: "Plot 42, Road No. 12", line2: "Jubilee Hills", landmark: "Near Check Post", city: "Hyderabad", pincode: "500033", lat: 17.4320, lng: 78.4071, isDefault: true },
    // Karthik Naidu — Kondapur
    { userId: customers[3]!.id, label: "Home", line1: "Flat 503, Prestige Towers", line2: "Kondapur Main Road", landmark: "Near Botanical Garden", city: "Hyderabad", pincode: "500084", lat: 17.4614, lng: 78.3612, isDefault: true },
    // Meera Iyer — Hitech City
    { userId: customers[4]!.id, label: "Home", line1: "Unit 12, Hitech Enclave", line2: "Hitech City Road", landmark: "Beside Inorbit Mall", city: "Hyderabad", pincode: "500081", lat: 17.4435, lng: 78.3772, isDefault: true },
    // Karthik Naidu — second address Work
    { userId: customers[3]!.id, label: "Work", line1: "Building 4, HITEC City SEZ", line2: null, landmark: "Cyber Towers Lobby", city: "Hyderabad", pincode: "500081", lat: 17.4501, lng: 78.3803, isDefault: false },
  ];

  const addresses = await Promise.all(addressData.map((a) => prisma.address.create({ data: a })));
  console.log(`✅  Addresses: ${addresses.length} created.`);
  return addresses;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step e — Merchants
// ─────────────────────────────────────────────────────────────────────────────

async function seedMerchants(merchantOwners: { id: string }[]) {
  console.log("\n🏪  Seeding merchants…");

  const trendz = await prisma.merchant.create({
    data: {
      ownerId: merchantOwners[0]!.id,
      legalName: "Trendz Fashions Private Limited",
      displayName: "Trendz Boutique",
      gstin: "36AABCT1234F1Z5",
      pan: "AABCT1234F",
      phone: "+914023456789",
      email: "admin@trendzhy.com",
      kycStatus: MerchantKycStatus.APPROVED,
      payoutBank: "4523",
      commissionBps: 1200,
    },
  });

  const stitchcraft = await prisma.merchant.create({
    data: {
      ownerId: merchantOwners[1]!.id,
      legalName: "Stitchcraft Hyderabad LLP",
      displayName: "Stitchcraft Hyderabad",
      gstin: "36AADCS9876G1Z2",
      pan: "AADCS9876G",
      phone: "+914024567890",
      email: "hello@stitchcrafthy.com",
      kycStatus: MerchantKycStatus.APPROVED,
      payoutBank: "7811",
      commissionBps: 1500,
    },
  });

  console.log("✅  Merchants: 2 created (Trendz Boutique, Stitchcraft Hyderabad).");
  return { trendz, stitchcraft };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step f — Stores
// ─────────────────────────────────────────────────────────────────────────────

interface StoreSpec {
  merchantId: string;
  name: string;
  description: string;
  phone: string;
  addressLine: string;
  city: string;
  pincode: string;
  lat: number;
  lng: number;
  rating: number;
  ratingCount: number;
  avgPrepMins: number;
  bannerUrl: string;
  logoUrl: string;
  shortcode: string;
}

async function seedStores(trendz: { id: string }, stitchcraft: { id: string }) {
  console.log("\n🏬  Seeding stores…");

  const storeSpecs: StoreSpec[] = [
    // Trendz Boutique stores
    {
      merchantId: trendz.id,
      name: "Trendz Boutique — Gachibowli",
      description: "Premium ethnic and fusion wear in the heart of Gachibowli",
      phone: "+914023456701",
      addressLine: "Plot 14, Gachibowli Main Road, Beside Image Hospital",
      city: "Hyderabad",
      pincode: "500032",
      lat: 17.4390,
      lng: 78.3477,
      rating: 4.7,
      ratingCount: 312,
      avgPrepMins: 7,
      bannerUrl: STORE_BANNERS[0]!,
      logoUrl: STORE_LOGOS[0]!,
      shortcode: "TGB",
    },
    {
      merchantId: trendz.id,
      name: "Trendz Boutique — Madhapur",
      description: "Contemporary fashion for the tech-savvy Hyderabadi",
      phone: "+914023456702",
      addressLine: "8-2-293/82, Madhapur, Near Cyber Towers",
      city: "Hyderabad",
      pincode: "500081",
      lat: 17.4510,
      lng: 78.3910,
      rating: 4.6,
      ratingCount: 498,
      avgPrepMins: 8,
      bannerUrl: STORE_BANNERS[1]!,
      logoUrl: STORE_LOGOS[1]!,
      shortcode: "TMP",
    },
    {
      merchantId: trendz.id,
      name: "Trendz Boutique — Hitech City",
      description: "Trendy casuals and workwear, open late for IT crowd",
      phone: "+914023456703",
      addressLine: "Unit G7, Hitech City Mall, Madhapur",
      city: "Hyderabad",
      pincode: "500081",
      lat: 17.4438,
      lng: 78.3760,
      rating: 4.5,
      ratingCount: 234,
      avgPrepMins: 6,
      bannerUrl: STORE_BANNERS[2]!,
      logoUrl: STORE_LOGOS[2]!,
      shortcode: "THC",
    },
    {
      merchantId: trendz.id,
      name: "Trendz Boutique — Kondapur",
      description: "Ethnic bridal and festive collection specialists",
      phone: "+914023456704",
      addressLine: "Shop 3, Kondapur Main Road, Opp. Jayabheri Temple",
      city: "Hyderabad",
      pincode: "500084",
      lat: 17.4618,
      lng: 78.3608,
      rating: 4.8,
      ratingCount: 175,
      avgPrepMins: 9,
      bannerUrl: STORE_BANNERS[3]!,
      logoUrl: STORE_LOGOS[3]!,
      shortcode: "TKP",
    },
    // Stitchcraft stores
    {
      merchantId: stitchcraft.id,
      name: "Stitchcraft — Jubilee Hills",
      description: "Handcrafted bespoke kurtas and sarees with artisan touch",
      phone: "+914024567801",
      addressLine: "Road No. 36, Jubilee Hills, Near PVR Cinemas",
      city: "Hyderabad",
      pincode: "500033",
      lat: 17.4312,
      lng: 78.4065,
      rating: 4.8,
      ratingCount: 423,
      avgPrepMins: 10,
      bannerUrl: STORE_BANNERS[4]!,
      logoUrl: STORE_LOGOS[0]!,
      shortcode: "SJH",
    },
    {
      merchantId: stitchcraft.id,
      name: "Stitchcraft — Banjara Hills",
      description: "Curated luxury ethnic wear for every occasion",
      phone: "+914024567802",
      addressLine: "Road No. 12, Banjara Hills, Near Care Hospital",
      city: "Hyderabad",
      pincode: "500034",
      lat: 17.4179,
      lng: 78.4377,
      rating: 4.7,
      ratingCount: 289,
      avgPrepMins: 8,
      bannerUrl: STORE_BANNERS[5]!,
      logoUrl: STORE_LOGOS[1]!,
      shortcode: "SBH",
    },
    {
      merchantId: stitchcraft.id,
      name: "Stitchcraft — Madhapur",
      description: "Fusion wear meets traditional craftsmanship",
      phone: "+914024567803",
      addressLine: "Ground Floor, Madhapur Trade Centre, Hi-Tech City Road",
      city: "Hyderabad",
      pincode: "500081",
      lat: 17.4499,
      lng: 78.3882,
      rating: 4.4,
      ratingCount: 161,
      avgPrepMins: 7,
      bannerUrl: STORE_BANNERS[6]!,
      logoUrl: STORE_LOGOS[2]!,
      shortcode: "SMP",
    },
    {
      merchantId: stitchcraft.id,
      name: "Stitchcraft — Gachibowli",
      description: "Premium cotton and linen everyday wear for professionals",
      phone: "+914024567804",
      addressLine: "Block B, DLF Cyber City Road, Gachibowli",
      city: "Hyderabad",
      pincode: "500032",
      lat: 17.4412,
      lng: 78.3501,
      rating: 4.3,
      ratingCount: 88,
      avgPrepMins: 5,
      bannerUrl: STORE_BANNERS[7]!,
      logoUrl: STORE_LOGOS[3]!,
      shortcode: "SGB",
    },
  ];

  const stores = await Promise.all(
    storeSpecs.map((spec) => {
      const { shortcode, ...data } = spec;
      return prisma.store.create({
        data: {
          ...data,
          serviceRadiusKm: 4,
          status: StoreStatus.ONLINE,
          openTime: "10:00",
          closeTime: "21:00",
        },
      });
    })
  );

  console.log(`✅  Stores: ${stores.length} created.`);
  // Return stores with shortcodes mapped
  return stores.map((s, i) => ({ ...s, shortcode: storeSpecs[i]!.shortcode }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Step g — Riders
// ─────────────────────────────────────────────────────────────────────────────

async function seedRiders(riderUsers: { id: string; name: string; phone: string }[]) {
  console.log("\n🏍️   Seeding riders…");

  const riderData = [
    { userId: riderUsers[0]!.id, name: riderUsers[0]!.name, phone: riderUsers[0]!.phone, lat: 17.4401, lng: 78.3488, rating: 4.8 },
    { userId: riderUsers[1]!.id, name: riderUsers[1]!.name, phone: riderUsers[1]!.phone, lat: 17.4512, lng: 78.3905, rating: 4.9 },
    { userId: riderUsers[2]!.id, name: riderUsers[2]!.name, phone: riderUsers[2]!.phone, lat: 17.4320, lng: 78.4060, rating: 4.6 },
    { userId: riderUsers[3]!.id, name: riderUsers[3]!.name, phone: riderUsers[3]!.phone, lat: 17.4620, lng: 78.3615, rating: 4.7 },
  ];

  const riders = await Promise.all(
    riderData.map((r) =>
      prisma.rider.create({
        data: {
          ...r,
          vehicle: "BIKE",
          status: RiderStatus.AVAILABLE,
          ratingCount: rnd(20, 150),
        },
      })
    )
  );

  console.log(`✅  Riders: ${riders.length} created.`);
  return riders;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step h + i + j — Products, Variants, InventoryLedger
// ─────────────────────────────────────────────────────────────────────────────

interface ProductTemplate {
  title: string;
  description: string;
  brand: string;
  categoryKey: string; // which category to assign
  isTrialEligible: boolean;
  attributes: Record<string, string>;
  sizeSets: string[];
  colorCount: number; // how many colors to pick per size subset
  mrpMin: number;
  mrpMax: number;
}

// Templates per store type (15 per store, 8 stores = 120 products)
function buildProductTemplates(cats: Record<string, string>): (ProductTemplate & { storeIdx: number })[] {
  const templates: (ProductTemplate & { storeIdx: number })[] = [];

  // ───────────── Trendz Gachibowli (storeIdx 0) ─────────────
  // Focus: Women ethnic, Men shirts
  const tgbProds: ProductTemplate[] = [
    { title: "Anarkali Kurta with Mirror Work", description: "Flared Anarkali with intricate mirror embroidery, perfect for festive occasions", brand: "Trendz", categoryKey: "wKurtas", isTrialEligible: true, attributes: { gender: "women", fabric: "cotton-silk", occasion: "festive", sleeveLength: "three-quarter", pattern: "embroidered" }, sizeSets: ["XS", "S", "M", "L", "XL"], colorCount: 3, mrpMin: 180000, mrpMax: 250000 },
    { title: "Bandhani Dupatta Set", description: "Traditional Bandhani print with matching dupatta — pure Rajasthani craft", brand: "Local Weave", categoryKey: "wEthnicSets", isTrialEligible: true, attributes: { gender: "women", fabric: "georgette", occasion: "casual-festive", pattern: "bandhani" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 3, mrpMin: 150000, mrpMax: 220000 },
    { title: "Straight Kurta with Palazzo", description: "Elegant straight-cut kurta paired with wide-leg palazzo — easy breezy daily wear", brand: "Saanjh", categoryKey: "wKurtas", isTrialEligible: true, attributes: { gender: "women", fabric: "rayon", occasion: "daily", sleeveLength: "full", pattern: "solid" }, sizeSets: ["XS", "S", "M", "L", "XL"], colorCount: 4, mrpMin: 100000, mrpMax: 140000 },
    { title: "Chikankari Lucknowi Kurta", description: "Handcrafted Lucknowi Chikankari on soft cotton — delicate floral motifs", brand: "Local Weave", categoryKey: "wKurtas", isTrialEligible: true, attributes: { gender: "women", fabric: "cotton", occasion: "casual", sleeveLength: "half", pattern: "chikankari" }, sizeSets: ["S", "M", "L"], colorCount: 2, mrpMin: 120000, mrpMax: 180000 },
    { title: "Kantha Stitch Saree", description: "Bengal Kantha embroidery on soft cotton — wearable art for the modern woman", brand: "Local Weave", categoryKey: "wSarees", isTrialEligible: true, attributes: { gender: "women", fabric: "cotton", occasion: "formal-casual", pattern: "kantha-embroidery" }, sizeSets: ["Free"], colorCount: 4, mrpMin: 200000, mrpMax: 320000 },
    { title: "Pure Silk Kanjivaram Saree", description: "Classic Kanjivaram in rich zari-border — for weddings and auspicious occasions", brand: "Saanjh", categoryKey: "wSarees", isTrialEligible: true, attributes: { gender: "women", fabric: "pure-silk", occasion: "bridal-wedding", pattern: "zari-woven" }, sizeSets: ["Free"], colorCount: 3, mrpMin: 280000, mrpMax: 350000 },
    { title: "Printed Rayon Top", description: "Flowy rayon top with abstract print — perfect for work-from-office style", brand: "Urbane", categoryKey: "wTops", isTrialEligible: true, attributes: { gender: "women", fabric: "rayon", occasion: "office-casual", sleeveLength: "half", pattern: "printed" }, sizeSets: ["XS", "S", "M", "L", "XL"], colorCount: 3, mrpMin: 80000, mrpMax: 110000 },
    { title: "Floral Midi Dress", description: "Elegant floral midi with smocked waist — effortlessly feminine", brand: "Urbane", categoryKey: "wDresses", isTrialEligible: true, attributes: { gender: "women", fabric: "polyester-blend", occasion: "brunch-casual", sleeveLength: "sleeveless", pattern: "floral" }, sizeSets: ["XS", "S", "M", "L"], colorCount: 3, mrpMin: 130000, mrpMax: 180000 },
    { title: "Slim Fit Oxford Shirt", description: "Premium Oxford cotton slim fit — sharp look for boardroom and beyond", brand: "Trendz", categoryKey: "mShirts", isTrialEligible: true, attributes: { gender: "men", fabric: "oxford-cotton", occasion: "formal", sleeveLength: "full", pattern: "solid" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 4, mrpMin: 120000, mrpMax: 180000 },
    { title: "Linen Kurta — Beige", description: "Breathable linen kurta for summer weddings and casual evenings", brand: "Local Weave", categoryKey: "mKurtas", isTrialEligible: true, attributes: { gender: "men", fabric: "linen", occasion: "festive-casual", sleeveLength: "full", pattern: "solid" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 2, mrpMin: 110000, mrpMax: 160000 },
    { title: "Cotton Graphic Tee", description: "GOTS certified organic cotton tee with Hyderabad skyline graphic", brand: "Urbane", categoryKey: "mTshirts", isTrialEligible: true, attributes: { gender: "men", fabric: "organic-cotton", occasion: "casual", sleeveLength: "half", pattern: "graphic" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 3, mrpMin: 80000, mrpMax: 110000 },
    { title: "Linen Trousers — Beige", description: "Relaxed straight-fit linen trousers — easy sophistication for warm weather", brand: "Urbane", categoryKey: "mTrousers", isTrialEligible: true, attributes: { gender: "men", fabric: "linen", occasion: "smart-casual", pattern: "solid" }, sizeSets: ["30", "32", "34", "36"], colorCount: 3, mrpMin: 130000, mrpMax: 190000 },
    { title: "Quilted Bomber Jacket", description: "Lightweight quilted bomber — day to night versatility", brand: "Trendz", categoryKey: "uJackets", isTrialEligible: true, attributes: { gender: "unisex", fabric: "polyester-fill", occasion: "casual-evening", pattern: "solid" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 3, mrpMin: 200000, mrpMax: 280000 },
    { title: "Beaded Tassel Earrings Set", description: "Handcrafted beaded tassel earrings — a pop of colour for any outfit", brand: "Saanjh", categoryKey: "uAccessories", isTrialEligible: true, attributes: { gender: "unisex", fabric: "brass-beads", occasion: "festive-casual", pattern: "beaded" }, sizeSets: ["Free"], colorCount: 4, mrpMin: 50000, mrpMax: 90000 },
    { title: "Cotton Innerwear Brief — Pack of 3", description: "Premium combed cotton innerwear briefs — comfort all day long", brand: "Urbane", categoryKey: "uInnerwear", isTrialEligible: false, attributes: { gender: "men", fabric: "combed-cotton", occasion: "daily", pattern: "solid" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 2, mrpMin: 40000, mrpMax: 70000 },
  ];
  tgbProds.forEach((p) => templates.push({ ...p, storeIdx: 0 }));

  // ───────────── Trendz Madhapur (storeIdx 1) ─────────────
  // Focus: Mixed contemporary + ethnic
  const tmpProds: ProductTemplate[] = [
    { title: "Ikat Weave Salwar Set", description: "Traditional Ikat pattern salwar kameez set — woven on handlooms", brand: "Local Weave", categoryKey: "wEthnicSets", isTrialEligible: true, attributes: { gender: "women", fabric: "cotton-ikat", occasion: "festive-casual", pattern: "ikat" }, sizeSets: ["XS", "S", "M", "L", "XL"], colorCount: 3, mrpMin: 160000, mrpMax: 220000 },
    { title: "Phulkari Dupatta Kurta Set", description: "Vibrant Phulkari embroidery dupatta paired with straight kurta", brand: "Saanjh", categoryKey: "wEthnicSets", isTrialEligible: true, attributes: { gender: "women", fabric: "cotton", occasion: "festive", pattern: "phulkari" }, sizeSets: ["S", "M", "L"], colorCount: 4, mrpMin: 170000, mrpMax: 240000 },
    { title: "Block Print A-Line Dress", description: "Hand block-printed Dabu A-line dress — artisan craft meets modern silhouette", brand: "Local Weave", categoryKey: "wDresses", isTrialEligible: true, attributes: { gender: "women", fabric: "cotton", occasion: "brunch-casual", sleeveLength: "half", pattern: "block-print" }, sizeSets: ["XS", "S", "M", "L", "XL"], colorCount: 3, mrpMin: 130000, mrpMax: 185000 },
    { title: "Banarasi Silk Dupatta", description: "Opulent Banarasi brocade dupatta — a timeless heirloom piece", brand: "Saanjh", categoryKey: "wSarees", isTrialEligible: true, attributes: { gender: "women", fabric: "banarasi-silk", occasion: "bridal", pattern: "brocade" }, sizeSets: ["Free"], colorCount: 3, mrpMin: 250000, mrpMax: 340000 },
    { title: "Crepe Georgette Top", description: "Lightweight crepe georgette top with drape neckline — office to evening", brand: "Urbane", categoryKey: "wTops", isTrialEligible: true, attributes: { gender: "women", fabric: "crepe-georgette", occasion: "office-evening", sleeveLength: "three-quarter", pattern: "solid" }, sizeSets: ["XS", "S", "M", "L"], colorCount: 4, mrpMin: 90000, mrpMax: 130000 },
    { title: "Chanderi Kurta with Dupatta", description: "Breezy Chanderi silk kurta with matching dupatta — soft and lustrous", brand: "Local Weave", categoryKey: "wKurtas", isTrialEligible: true, attributes: { gender: "women", fabric: "chanderi-silk", occasion: "festive-casual", sleeveLength: "three-quarter", pattern: "woven" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 3, mrpMin: 150000, mrpMax: 210000 },
    { title: "Check Flannel Shirt", description: "Classic tartan flannel shirt — warm, rugged, and effortlessly stylish", brand: "Trendz", categoryKey: "mShirts", isTrialEligible: true, attributes: { gender: "men", fabric: "flannel", occasion: "casual-weekend", sleeveLength: "full", pattern: "check" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 3, mrpMin: 110000, mrpMax: 160000 },
    { title: "Terry Polo T-Shirt", description: "Pique cotton polo with ribbed collar — smart casual essential", brand: "Urbane", categoryKey: "mTshirts", isTrialEligible: true, attributes: { gender: "men", fabric: "pique-cotton", occasion: "smart-casual", sleeveLength: "half", pattern: "solid" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 4, mrpMin: 90000, mrpMax: 130000 },
    { title: "Khadi Nehru Jacket", description: "Hand-spun Khadi Nehru jacket — nationalist chic for modern India", brand: "Local Weave", categoryKey: "uJackets", isTrialEligible: true, attributes: { gender: "men", fabric: "khadi", occasion: "festive-formal", pattern: "solid" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 3, mrpMin: 180000, mrpMax: 240000 },
    { title: "Jodhpuri Trousers", description: "Tailored Jodhpuri trousers with ankle strap — for the bold dresser", brand: "Saanjh", categoryKey: "mTrousers", isTrialEligible: true, attributes: { gender: "men", fabric: "cotton-blend", occasion: "formal-ethnic", pattern: "solid" }, sizeSets: ["30", "32", "34", "36"], colorCount: 2, mrpMin: 160000, mrpMax: 220000 },
    { title: "Silk Nehru Collar Kurta", description: "Rich silk kurta with Nehru collar and churidar — wedding-ready", brand: "Saanjh", categoryKey: "mKurtas", isTrialEligible: true, attributes: { gender: "men", fabric: "silk", occasion: "wedding-festive", sleeveLength: "full", pattern: "woven" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 3, mrpMin: 220000, mrpMax: 310000 },
    { title: "Denim Jacket Unisex", description: "Raw denim trucker jacket — the wardrobe workhorse", brand: "Urbane", categoryKey: "uJackets", isTrialEligible: true, attributes: { gender: "unisex", fabric: "denim", occasion: "casual", pattern: "solid" }, sizeSets: ["XS", "S", "M", "L", "XL"], colorCount: 2, mrpMin: 170000, mrpMax: 240000 },
    { title: "Oxidised Silver Bangles Set", description: "Set of 8 hand-crafted oxidised silver bangles — Rajasthani artisan work", brand: "Local Weave", categoryKey: "uAccessories", isTrialEligible: true, attributes: { gender: "women", fabric: "oxidised-silver", occasion: "festive-casual", pattern: "ethnic" }, sizeSets: ["Free"], colorCount: 1, mrpMin: 60000, mrpMax: 95000 },
    { title: "Floral Midi Wrap Dress", description: "Wrap midi dress in floral chiffon — feminine, adjustable, beautiful", brand: "Urbane", categoryKey: "wDresses", isTrialEligible: true, attributes: { gender: "women", fabric: "chiffon", occasion: "brunch-evening", sleeveLength: "half", pattern: "floral" }, sizeSets: ["XS", "S", "M", "L"], colorCount: 3, mrpMin: 140000, mrpMax: 195000 },
    { title: "Microfibre Innerwear Trunks — 3-Pack", description: "Ultra-soft microfibre trunks — minimal seams for all-day comfort", brand: "Urbane", categoryKey: "uInnerwear", isTrialEligible: false, attributes: { gender: "men", fabric: "microfibre", occasion: "daily", pattern: "solid" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 2, mrpMin: 45000, mrpMax: 75000 },
  ];
  tmpProds.forEach((p) => templates.push({ ...p, storeIdx: 1 }));

  // ───────────── Trendz Hitech City (storeIdx 2) ─────────────
  // Focus: Workwear, casuals, contemporary
  const thcProds: ProductTemplate[] = [
    { title: "Linen Blend Blazer — Women", description: "Structured linen-blend blazer — power dressing for the modern woman", brand: "Trendz", categoryKey: "uJackets", isTrialEligible: true, attributes: { gender: "women", fabric: "linen-blend", occasion: "office-formal", pattern: "solid" }, sizeSets: ["XS", "S", "M", "L", "XL"], colorCount: 3, mrpMin: 240000, mrpMax: 320000 },
    { title: "Bamboo Cotton Crop Top", description: "Breathable bamboo-cotton crop top — eco-conscious everyday essential", brand: "Urbane", categoryKey: "wTops", isTrialEligible: true, attributes: { gender: "women", fabric: "bamboo-cotton", occasion: "casual-workout", sleeveLength: "sleeveless", pattern: "solid" }, sizeSets: ["XS", "S", "M", "L"], colorCount: 4, mrpMin: 70000, mrpMax: 100000 },
    { title: "Printed Georgette Kurta", description: "Georgette kurta with digital floral print — lightweight and vibrant", brand: "Saanjh", categoryKey: "wKurtas", isTrialEligible: true, attributes: { gender: "women", fabric: "georgette", occasion: "office-casual", sleeveLength: "three-quarter", pattern: "printed-floral" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 3, mrpMin: 110000, mrpMax: 160000 },
    { title: "Embroidered Patiala Salwar Set", description: "Full Patiala salwar with embroidered kameez — Punjabi festive favourite", brand: "Saanjh", categoryKey: "wEthnicSets", isTrialEligible: true, attributes: { gender: "women", fabric: "cotton-silk", occasion: "festive", pattern: "embroidered" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 3, mrpMin: 155000, mrpMax: 215000 },
    { title: "Digital Print Saree", description: "Contemporary digital print on chiffon saree — ideal for office and events", brand: "Urbane", categoryKey: "wSarees", isTrialEligible: true, attributes: { gender: "women", fabric: "chiffon", occasion: "office-event", pattern: "digital-print" }, sizeSets: ["Free"], colorCount: 4, mrpMin: 180000, mrpMax: 250000 },
    { title: "Slim Fit Stretch Jeans", description: "4-way stretch slim-fit trousers — classic on the outside, athletic within", brand: "Urbane", categoryKey: "mTrousers", isTrialEligible: true, attributes: { gender: "men", fabric: "stretch-cotton", occasion: "casual", pattern: "solid" }, sizeSets: ["30", "32", "34", "36"], colorCount: 3, mrpMin: 130000, mrpMax: 190000 },
    { title: "Mandarin Collar Formal Shirt", description: "Mandarin collar cotton-poplin shirt — subtle detail, powerful statement", brand: "Trendz", categoryKey: "mShirts", isTrialEligible: true, attributes: { gender: "men", fabric: "cotton-poplin", occasion: "office-formal", sleeveLength: "full", pattern: "solid" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 4, mrpMin: 130000, mrpMax: 185000 },
    { title: "Half-Sleeve Linen Shirt", description: "Easy-care half-sleeve linen shirt — wardrobe MVP for Hyderabad summers", brand: "Trendz", categoryKey: "mShirts", isTrialEligible: true, attributes: { gender: "men", fabric: "linen", occasion: "smart-casual", sleeveLength: "half", pattern: "solid" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 4, mrpMin: 110000, mrpMax: 160000 },
    { title: "Oversized Drop-Shoulder Tee", description: "Relaxed-fit drop-shoulder tee in 240gsm jersey — streetwear staple", brand: "Urbane", categoryKey: "mTshirts", isTrialEligible: true, attributes: { gender: "men", fabric: "jersey", occasion: "casual-streetwear", sleeveLength: "half", pattern: "solid" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 4, mrpMin: 85000, mrpMax: 120000 },
    { title: "Sherwani Kurta Set", description: "Festive Sherwani-style kurta with contrast cuffs — celebration-ready", brand: "Saanjh", categoryKey: "mKurtas", isTrialEligible: true, attributes: { gender: "men", fabric: "brocade-blend", occasion: "wedding-festive", sleeveLength: "full", pattern: "woven-pattern" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 3, mrpMin: 280000, mrpMax: 350000 },
    { title: "Reversible Quilted Jacket", description: "2-in-1 reversible padded jacket — solid on one side, check on the other", brand: "Trendz", categoryKey: "uJackets", isTrialEligible: true, attributes: { gender: "unisex", fabric: "polyester-fill", occasion: "casual-winter", pattern: "reversible" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 2, mrpMin: 220000, mrpMax: 300000 },
    { title: "Leather Strap Watch Band", description: "Handcrafted genuine leather watch band — compatible with 22mm lugs", brand: "Saanjh", categoryKey: "uAccessories", isTrialEligible: true, attributes: { gender: "unisex", fabric: "genuine-leather", occasion: "formal-casual", pattern: "plain" }, sizeSets: ["Free"], colorCount: 3, mrpMin: 50000, mrpMax: 85000 },
    { title: "Long Shrug Cardigan", description: "Open-front long shrug in fine cotton knit — layer effortlessly", brand: "Urbane", categoryKey: "uJackets", isTrialEligible: true, attributes: { gender: "women", fabric: "cotton-knit", occasion: "casual-evening", pattern: "solid" }, sizeSets: ["XS", "S", "M", "L", "XL"], colorCount: 4, mrpMin: 120000, mrpMax: 170000 },
    { title: "Handloom Cotton Saree", description: "Authentic handloom cotton saree from Pochampally — wearable tradition", brand: "Local Weave", categoryKey: "wSarees", isTrialEligible: true, attributes: { gender: "women", fabric: "handloom-cotton", occasion: "casual-festive", pattern: "pochampally-ikat" }, sizeSets: ["Free"], colorCount: 3, mrpMin: 160000, mrpMax: 230000 },
    { title: "Seamless Innerwear Bra — Sports", description: "High-impact seamless sports bra — full coverage, wicking fabric", brand: "Urbane", categoryKey: "uInnerwear", isTrialEligible: false, attributes: { gender: "women", fabric: "nylon-spandex", occasion: "sports-workout", pattern: "solid" }, sizeSets: ["XS", "S", "M", "L"], colorCount: 3, mrpMin: 55000, mrpMax: 90000 },
  ];
  thcProds.forEach((p) => templates.push({ ...p, storeIdx: 2 }));

  // ───────────── Trendz Kondapur (storeIdx 3) ─────────────
  // Focus: Bridal, festive, ethnic
  const tkpProds: ProductTemplate[] = [
    { title: "Leheriya Tie-Dye Saree", description: "Rajasthani Leheriya diagonal tie-dye on fine chiffon — waves of colour", brand: "Local Weave", categoryKey: "wSarees", isTrialEligible: true, attributes: { gender: "women", fabric: "chiffon", occasion: "festive", pattern: "leheriya-tie-dye" }, sizeSets: ["Free"], colorCount: 4, mrpMin: 190000, mrpMax: 270000 },
    { title: "Embroidered Bridal Lehenga Choli", description: "Heavy zardozi embroidered lehenga with matching choli and dupatta — bridal glory", brand: "Saanjh", categoryKey: "wEthnicSets", isTrialEligible: true, attributes: { gender: "women", fabric: "velvet-silk", occasion: "bridal", pattern: "zardozi-embroidery" }, sizeSets: ["XS", "S", "M", "L"], colorCount: 2, mrpMin: 300000, mrpMax: 350000 },
    { title: "Printed Anarkali with Dupatta", description: "Calf-length printed Anarkali with sheer dupatta — effortless festive dressing", brand: "Trendz", categoryKey: "wKurtas", isTrialEligible: true, attributes: { gender: "women", fabric: "georgette", occasion: "festive", sleeveLength: "three-quarter", pattern: "printed-floral" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 3, mrpMin: 160000, mrpMax: 220000 },
    { title: "Tussar Silk Kurta", description: "Natural Tussar silk kurta with subtle texture — understated elegance", brand: "Local Weave", categoryKey: "wKurtas", isTrialEligible: true, attributes: { gender: "women", fabric: "tussar-silk", occasion: "festive-casual", sleeveLength: "half", pattern: "textured" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 3, mrpMin: 140000, mrpMax: 200000 },
    { title: "Designer Crop Top with Sharara", description: "Festive crop top and wide-legged sharara — modern meets traditional", brand: "Saanjh", categoryKey: "wEthnicSets", isTrialEligible: true, attributes: { gender: "women", fabric: "net-inner", occasion: "festive-party", pattern: "embellished" }, sizeSets: ["XS", "S", "M", "L"], colorCount: 3, mrpMin: 220000, mrpMax: 300000 },
    { title: "Handpainted Madhubani Dupatta", description: "Hand-painted Madhubani art on cotton dupatta — a gallery-worthy accessory", brand: "Local Weave", categoryKey: "uAccessories", isTrialEligible: true, attributes: { gender: "women", fabric: "cotton", occasion: "festive-casual", pattern: "madhubani-art" }, sizeSets: ["Free"], colorCount: 4, mrpMin: 90000, mrpMax: 140000 },
    { title: "Thread Embroidered Tote Bag", description: "Cotton tote with vibrant thread embroidery — fashion meets utility", brand: "Saanjh", categoryKey: "uAccessories", isTrialEligible: true, attributes: { gender: "unisex", fabric: "cotton-canvas", occasion: "casual", pattern: "embroidered" }, sizeSets: ["Free"], colorCount: 3, mrpMin: 70000, mrpMax: 110000 },
    { title: "Silk Blend Straight Fit Kurta — Men", description: "Silk-blend straight-cut kurta for men — classic festive choice", brand: "Trendz", categoryKey: "mKurtas", isTrialEligible: true, attributes: { gender: "men", fabric: "silk-blend", occasion: "festive", sleeveLength: "full", pattern: "solid" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 3, mrpMin: 150000, mrpMax: 210000 },
    { title: "Pathani Kurta with Salwar", description: "Classic Pathani kurta and salwar set — relaxed festive comfort", brand: "Local Weave", categoryKey: "mKurtas", isTrialEligible: true, attributes: { gender: "men", fabric: "cotton-linen", occasion: "festive", sleeveLength: "full", pattern: "solid" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 2, mrpMin: 130000, mrpMax: 185000 },
    { title: "Formal Herringbone Trousers", description: "Italian-inspired herringbone wool-blend trousers — boardroom authority", brand: "Urbane", categoryKey: "mTrousers", isTrialEligible: true, attributes: { gender: "men", fabric: "wool-blend", occasion: "formal", pattern: "herringbone" }, sizeSets: ["30", "32", "34", "36"], colorCount: 2, mrpMin: 200000, mrpMax: 280000 },
    { title: "Slim Casual Chinos", description: "Stretch-cotton slim chinos — tailored enough for the office, comfy for the café", brand: "Trendz", categoryKey: "mTrousers", isTrialEligible: true, attributes: { gender: "men", fabric: "stretch-cotton", occasion: "smart-casual", pattern: "solid" }, sizeSets: ["30", "32", "34", "36"], colorCount: 3, mrpMin: 120000, mrpMax: 175000 },
    { title: "Bomber Jacket — Ethnic Print", description: "Satin bomber with ethnic block-print lining — East-meets-West fusion", brand: "Trendz", categoryKey: "uJackets", isTrialEligible: true, attributes: { gender: "unisex", fabric: "satin-outer", occasion: "casual-festive", pattern: "block-print-lining" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 2, mrpMin: 230000, mrpMax: 300000 },
    { title: "Embossed Silk Stole", description: "Embossed silk stole in solid hue — an elegant finishing touch", brand: "Saanjh", categoryKey: "uAccessories", isTrialEligible: true, attributes: { gender: "unisex", fabric: "silk", occasion: "formal-festive", pattern: "embossed" }, sizeSets: ["Free"], colorCount: 4, mrpMin: 80000, mrpMax: 130000 },
    { title: "Pencil Skirt — Solid", description: "Mid-length pencil skirt in bengaline fabric — timeless office staple", brand: "Urbane", categoryKey: "wDresses", isTrialEligible: true, attributes: { gender: "women", fabric: "bengaline", occasion: "office-formal", pattern: "solid" }, sizeSets: ["XS", "S", "M", "L", "XL"], colorCount: 4, mrpMin: 110000, mrpMax: 160000 },
    { title: "Bamboo Fibre Innerwear Vest — 2-Pack", description: "Ultra-soft bamboo fibre vest top — breathable and anti-bacterial", brand: "Urbane", categoryKey: "uInnerwear", isTrialEligible: false, attributes: { gender: "women", fabric: "bamboo-fibre", occasion: "daily", pattern: "solid" }, sizeSets: ["XS", "S", "M", "L"], colorCount: 2, mrpMin: 38000, mrpMax: 60000 },
  ];
  tkpProds.forEach((p) => templates.push({ ...p, storeIdx: 3 }));

  // ───────────── Stitchcraft Jubilee Hills (storeIdx 4) ─────────────
  // Focus: Handcrafted, premium artisan
  const sjhProds: ProductTemplate[] = [
    { title: "Artisan Kalamkari Saree", description: "Hand-painted Kalamkari on cotton — nature motifs drawn by pen-kalam artisans", brand: "Local Weave", categoryKey: "wSarees", isTrialEligible: true, attributes: { gender: "women", fabric: "cotton", occasion: "festive-cultural", pattern: "kalamkari" }, sizeSets: ["Free"], colorCount: 3, mrpMin: 230000, mrpMax: 320000 },
    { title: "Kasuti Embroidered Kurta", description: "Karnataka Kasuti embroidery on cotton kurta — painstaking geometric artistry", brand: "Local Weave", categoryKey: "wKurtas", isTrialEligible: true, attributes: { gender: "women", fabric: "cotton", occasion: "festive-casual", sleeveLength: "three-quarter", pattern: "kasuti-embroidery" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 2, mrpMin: 160000, mrpMax: 220000 },
    { title: "Ajrakh Block Print Kurta — Women", description: "Resist-dyed Ajrakh block-print kurta — an ancient craft from Kutch", brand: "Stitchcraft", categoryKey: "wKurtas", isTrialEligible: true, attributes: { gender: "women", fabric: "cotton", occasion: "casual-festive", sleeveLength: "full", pattern: "ajrakh" }, sizeSets: ["XS", "S", "M", "L", "XL"], colorCount: 3, mrpMin: 140000, mrpMax: 200000 },
    { title: "Hand-Smocked Yoke Top", description: "Delicate hand-smocked yoke on cotton voile top — heirloom-quality detail", brand: "Stitchcraft", categoryKey: "wTops", isTrialEligible: true, attributes: { gender: "women", fabric: "cotton-voile", occasion: "casual", sleeveLength: "half", pattern: "smocked" }, sizeSets: ["XS", "S", "M", "L"], colorCount: 3, mrpMin: 110000, mrpMax: 160000 },
    { title: "Mughal Jaal Embroidered Dupatta Set", description: "Mughal jaal pattern embroidery dupatta with solid kurta — regal look", brand: "Stitchcraft", categoryKey: "wEthnicSets", isTrialEligible: true, attributes: { gender: "women", fabric: "net-silk", occasion: "festive", pattern: "mughal-jaal" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 3, mrpMin: 200000, mrpMax: 270000 },
    { title: "Shibori Dyed Shirt", description: "Japanese Shibori indigo-dye technique on cotton shirt — no two alike", brand: "Stitchcraft", categoryKey: "mShirts", isTrialEligible: true, attributes: { gender: "men", fabric: "cotton", occasion: "casual-artistic", sleeveLength: "full", pattern: "shibori" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 2, mrpMin: 160000, mrpMax: 230000 },
    { title: "Ajrakh Print Kurta — Men", description: "Men's Ajrakh block-print short kurta with contrast piping — artisan meets modern", brand: "Stitchcraft", categoryKey: "mKurtas", isTrialEligible: true, attributes: { gender: "men", fabric: "cotton", occasion: "casual-festive", sleeveLength: "half", pattern: "ajrakh" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 3, mrpMin: 130000, mrpMax: 185000 },
    { title: "Textured Slub Linen Shirt", description: "Naturally slubbed linen shirt — texture-rich sustainable daily wear", brand: "Stitchcraft", categoryKey: "mShirts", isTrialEligible: true, attributes: { gender: "men", fabric: "slub-linen", occasion: "casual-smart", sleeveLength: "full", pattern: "textured-solid" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 3, mrpMin: 130000, mrpMax: 185000 },
    { title: "Cotton Ikat Trousers", description: "Straight-cut Ikat weave cotton trousers — statement bottom, conversation starter", brand: "Local Weave", categoryKey: "mTrousers", isTrialEligible: true, attributes: { gender: "men", fabric: "cotton-ikat", occasion: "casual-festive", pattern: "ikat" }, sizeSets: ["30", "32", "34", "36"], colorCount: 3, mrpMin: 150000, mrpMax: 210000 },
    { title: "Indigo Resist-Dyed T-Shirt", description: "Hand resist-dyed indigo tee — no two pieces identical, slow fashion at its best", brand: "Stitchcraft", categoryKey: "mTshirts", isTrialEligible: true, attributes: { gender: "men", fabric: "cotton", occasion: "casual", sleeveLength: "half", pattern: "indigo-resist" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 1, mrpMin: 100000, mrpMax: 145000 },
    { title: "Handwoven Shawl Jacket", description: "Handwoven wool shawl repurposed into a structured jacket — artisan upcycling", brand: "Stitchcraft", categoryKey: "uJackets", isTrialEligible: true, attributes: { gender: "unisex", fabric: "handwoven-wool", occasion: "casual-winter", pattern: "woven-stripe" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 2, mrpMin: 280000, mrpMax: 350000 },
    { title: "Warli Painted Tote", description: "Canvas tote hand-painted with Warli tribal art — functional folk canvas", brand: "Local Weave", categoryKey: "uAccessories", isTrialEligible: true, attributes: { gender: "unisex", fabric: "cotton-canvas", occasion: "casual", pattern: "warli-art" }, sizeSets: ["Free"], colorCount: 2, mrpMin: 75000, mrpMax: 115000 },
    { title: "Beaded Clutch Bag", description: "Hand-beaded evening clutch — artisan labour that shows in every bead", brand: "Stitchcraft", categoryKey: "uAccessories", isTrialEligible: true, attributes: { gender: "women", fabric: "beaded-fabric", occasion: "evening-festive", pattern: "beaded" }, sizeSets: ["Free"], colorCount: 3, mrpMin: 130000, mrpMax: 190000 },
    { title: "Jamdani Weave Saree", description: "Dhaka Jamdani supplementary-weft weave saree — UNESCO-heritage textile", brand: "Local Weave", categoryKey: "wSarees", isTrialEligible: true, attributes: { gender: "women", fabric: "cotton-silk", occasion: "festive-formal", pattern: "jamdani-weave" }, sizeSets: ["Free"], colorCount: 3, mrpMin: 270000, mrpMax: 350000 },
    { title: "Organic Cotton Innerwear Set — Women", description: "GOTS-certified organic cotton bralette + brief set — gentle on skin and planet", brand: "Stitchcraft", categoryKey: "uInnerwear", isTrialEligible: false, attributes: { gender: "women", fabric: "organic-cotton", occasion: "daily", pattern: "solid" }, sizeSets: ["XS", "S", "M", "L"], colorCount: 2, mrpMin: 60000, mrpMax: 95000 },
  ];
  sjhProds.forEach((p) => templates.push({ ...p, storeIdx: 4 }));

  // ───────────── Stitchcraft Banjara Hills (storeIdx 5) ─────────────
  // Focus: Luxury, occasion, premium
  const sbhProds: ProductTemplate[] = [
    { title: "Velvet Embroidered Lehenga", description: "Velvet base lehenga with dense thread embroidery — opulence redefined", brand: "Stitchcraft", categoryKey: "wEthnicSets", isTrialEligible: true, attributes: { gender: "women", fabric: "velvet-silk", occasion: "bridal-wedding", pattern: "thread-embroidery" }, sizeSets: ["XS", "S", "M", "L"], colorCount: 2, mrpMin: 320000, mrpMax: 350000 },
    { title: "Tissue Silk Anarkali", description: "Shimmering tissue silk Anarkali with gold zari borders — ethereal festive look", brand: "Saanjh", categoryKey: "wKurtas", isTrialEligible: true, attributes: { gender: "women", fabric: "tissue-silk", occasion: "festive-wedding", sleeveLength: "full", pattern: "zari-border" }, sizeSets: ["XS", "S", "M", "L", "XL"], colorCount: 3, mrpMin: 250000, mrpMax: 340000 },
    { title: "Pure Georgette Plisse Saree", description: "Micro-pleated plisse georgette saree — avant-garde draping with minimal effort", brand: "Urbane", categoryKey: "wSarees", isTrialEligible: true, attributes: { gender: "women", fabric: "pure-georgette", occasion: "formal-event", pattern: "plisse" }, sizeSets: ["Free"], colorCount: 4, mrpMin: 200000, mrpMax: 285000 },
    { title: "Cutwork Embroidered Top", description: "Laser-cut cotton top with floral cutwork — delicate feminine detail", brand: "Stitchcraft", categoryKey: "wTops", isTrialEligible: true, attributes: { gender: "women", fabric: "cotton", occasion: "casual-dressy", sleeveLength: "half", pattern: "cutwork" }, sizeSets: ["XS", "S", "M", "L"], colorCount: 3, mrpMin: 110000, mrpMax: 165000 },
    { title: "Organza Ruffle Dress", description: "Organza ruffle midi dress — dramatic volume, minimal accessories needed", brand: "Saanjh", categoryKey: "wDresses", isTrialEligible: true, attributes: { gender: "women", fabric: "organza", occasion: "party-formal", sleeveLength: "sleeveless", pattern: "ruffle" }, sizeSets: ["XS", "S", "M", "L"], colorCount: 3, mrpMin: 220000, mrpMax: 310000 },
    { title: "Brocade Jodhpuri Suit — Men", description: "Rich brocade Jodhpuri suit jacket with matching trousers — groom's party look", brand: "Saanjh", categoryKey: "mKurtas", isTrialEligible: true, attributes: { gender: "men", fabric: "brocade", occasion: "wedding", sleeveLength: "full", pattern: "brocade" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 2, mrpMin: 320000, mrpMax: 350000 },
    { title: "Formal Suit Trouser", description: "Tailored formal suit trouser in wool-blend — classic pant for every occasion", brand: "Trendz", categoryKey: "mTrousers", isTrialEligible: true, attributes: { gender: "men", fabric: "wool-blend", occasion: "formal", pattern: "solid" }, sizeSets: ["30", "32", "34", "36"], colorCount: 3, mrpMin: 180000, mrpMax: 250000 },
    { title: "Premium Cotton Dobby Shirt", description: "Dobby-weave cotton formal shirt with subtle geometric texture", brand: "Trendz", categoryKey: "mShirts", isTrialEligible: true, attributes: { gender: "men", fabric: "dobby-cotton", occasion: "office-formal", sleeveLength: "full", pattern: "dobby" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 3, mrpMin: 150000, mrpMax: 210000 },
    { title: "Suede Effect Jacket", description: "Faux-suede unlined jacket — luxe look, vegan conscience", brand: "Urbane", categoryKey: "uJackets", isTrialEligible: true, attributes: { gender: "unisex", fabric: "faux-suede", occasion: "casual-evening", pattern: "solid" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 3, mrpMin: 260000, mrpMax: 340000 },
    { title: "Handcrafted Potli Bag", description: "Silk potli bag with zardozi embroidery — timeless Indian evening bag", brand: "Stitchcraft", categoryKey: "uAccessories", isTrialEligible: true, attributes: { gender: "women", fabric: "silk-zardozi", occasion: "festive-evening", pattern: "zardozi" }, sizeSets: ["Free"], colorCount: 4, mrpMin: 100000, mrpMax: 165000 },
    { title: "Vintage Silk Scarf", description: "Fine silk twill scarf with vintage floral print — timeless boardroom or evening accessory", brand: "Saanjh", categoryKey: "uAccessories", isTrialEligible: true, attributes: { gender: "unisex", fabric: "silk-twill", occasion: "formal-casual", pattern: "vintage-floral" }, sizeSets: ["Free"], colorCount: 4, mrpMin: 80000, mrpMax: 130000 },
    { title: "Mirror Work Cotton Dress", description: "Midi cotton dress with traditional mirror-work panels — festival wardrobe hero", brand: "Stitchcraft", categoryKey: "wDresses", isTrialEligible: true, attributes: { gender: "women", fabric: "cotton", occasion: "festive-casual", sleeveLength: "sleeveless", pattern: "mirror-work" }, sizeSets: ["XS", "S", "M", "L", "XL"], colorCount: 3, mrpMin: 170000, mrpMax: 240000 },
    { title: "Striped Linen-Cotton Shirt", description: "Smart Bengal-stripe linen-cotton shirt — effortless resort casual", brand: "Trendz", categoryKey: "mShirts", isTrialEligible: true, attributes: { gender: "men", fabric: "linen-cotton", occasion: "casual-resort", sleeveLength: "half", pattern: "stripe" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 3, mrpMin: 120000, mrpMax: 170000 },
    { title: "Corduroy Trousers", description: "Wide-wale corduroy trousers — textured sophistication for cooler evenings", brand: "Urbane", categoryKey: "mTrousers", isTrialEligible: true, attributes: { gender: "men", fabric: "corduroy", occasion: "smart-casual", pattern: "textured-solid" }, sizeSets: ["30", "32", "34", "36"], colorCount: 3, mrpMin: 150000, mrpMax: 210000 },
    { title: "Innerwear Thermal Set — Unisex", description: "Lightweight thermal inner top + legging set — warmth without bulk", brand: "Urbane", categoryKey: "uInnerwear", isTrialEligible: false, attributes: { gender: "unisex", fabric: "polyester-thermal", occasion: "daily-winter", pattern: "solid" }, sizeSets: ["XS", "S", "M", "L", "XL"], colorCount: 2, mrpMin: 70000, mrpMax: 110000 },
  ];
  sbhProds.forEach((p) => templates.push({ ...p, storeIdx: 5 }));

  // ───────────── Stitchcraft Madhapur (storeIdx 6) ─────────────
  // Focus: Fusion, contemporary
  const smpProds: ProductTemplate[] = [
    { title: "Indo-Western Dhoti Pants", description: "Relaxed dhoti silhouette with elasticated waist — fusion favourite", brand: "Stitchcraft", categoryKey: "wEthnicSets", isTrialEligible: true, attributes: { gender: "women", fabric: "rayon", occasion: "casual-festive", pattern: "solid" }, sizeSets: ["XS", "S", "M", "L", "XL"], colorCount: 4, mrpMin: 110000, mrpMax: 160000 },
    { title: "Asymmetric Hem Kurta", description: "Modern asymmetric hem kurta with side slits — urban ethnic", brand: "Stitchcraft", categoryKey: "wKurtas", isTrialEligible: true, attributes: { gender: "women", fabric: "poly-crepe", occasion: "office-casual", sleeveLength: "three-quarter", pattern: "solid" }, sizeSets: ["XS", "S", "M", "L", "XL"], colorCount: 4, mrpMin: 120000, mrpMax: 170000 },
    { title: "Collar-Neck Embroidered Top", description: "Mandarin collar top with thread-embroidered placket — office statement", brand: "Trendz", categoryKey: "wTops", isTrialEligible: true, attributes: { gender: "women", fabric: "cotton-blend", occasion: "office-casual", sleeveLength: "half", pattern: "embroidered-placket" }, sizeSets: ["XS", "S", "M", "L"], colorCount: 3, mrpMin: 95000, mrpMax: 140000 },
    { title: "Tiered Boho Skirt", description: "Three-tier boho maxi skirt in crinkle cotton — free-spirited festival look", brand: "Urbane", categoryKey: "wDresses", isTrialEligible: true, attributes: { gender: "women", fabric: "crinkle-cotton", occasion: "casual-bohemian", pattern: "printed" }, sizeSets: ["XS", "S", "M", "L", "XL"], colorCount: 3, mrpMin: 130000, mrpMax: 185000 },
    { title: "Satin Cami Dress", description: "Slip-style satin cami dress — minimalist eveningwear done right", brand: "Urbane", categoryKey: "wDresses", isTrialEligible: true, attributes: { gender: "women", fabric: "satin", occasion: "evening-party", sleeveLength: "sleeveless", pattern: "solid" }, sizeSets: ["XS", "S", "M", "L"], colorCount: 4, mrpMin: 150000, mrpMax: 215000 },
    { title: "Printed Shirt Dress", description: "Button-through shirt dress in vibrant Indian block print — 2-in-1 wardrobe wonder", brand: "Stitchcraft", categoryKey: "wDresses", isTrialEligible: true, attributes: { gender: "women", fabric: "cotton", occasion: "casual-day", sleeveLength: "half", pattern: "block-print" }, sizeSets: ["XS", "S", "M", "L", "XL"], colorCount: 3, mrpMin: 140000, mrpMax: 200000 },
    { title: "Relaxed Fit Cargo Trouser", description: "Casual cargo trousers with utility pockets — streetwear comfort meets function", brand: "Urbane", categoryKey: "mTrousers", isTrialEligible: true, attributes: { gender: "men", fabric: "cotton-twill", occasion: "casual-streetwear", pattern: "solid" }, sizeSets: ["30", "32", "34", "36"], colorCount: 3, mrpMin: 130000, mrpMax: 185000 },
    { title: "Kurta Jogger Set — Men", description: "Cotton kurta paired with drawstring jogger pants — home-to-street comfort", brand: "Trendz", categoryKey: "mKurtas", isTrialEligible: true, attributes: { gender: "men", fabric: "cotton", occasion: "casual", sleeveLength: "half", pattern: "solid" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 3, mrpMin: 110000, mrpMax: 165000 },
    { title: "Resort Print Short Sleeve Shirt", description: "Cuban-collar resort shirt in vibrant tropical print — vacation energy, city life", brand: "Trendz", categoryKey: "mShirts", isTrialEligible: true, attributes: { gender: "men", fabric: "rayon", occasion: "casual-vacation", sleeveLength: "half", pattern: "tropical-print" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 3, mrpMin: 110000, mrpMax: 160000 },
    { title: "Streetwear Graphic Hoodie", description: "French terry hoodie with Hyderabad-inspired street art graphic — local pride", brand: "Urbane", categoryKey: "uJackets", isTrialEligible: true, attributes: { gender: "unisex", fabric: "french-terry", occasion: "casual-streetwear", pattern: "graphic" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 3, mrpMin: 180000, mrpMax: 250000 },
    { title: "Embroidered Kalamkari Tote", description: "Kalamkari-print tote with leather handles — artisan meets minimal", brand: "Local Weave", categoryKey: "uAccessories", isTrialEligible: true, attributes: { gender: "unisex", fabric: "cotton-leather", occasion: "casual", pattern: "kalamkari" }, sizeSets: ["Free"], colorCount: 2, mrpMin: 80000, mrpMax: 125000 },
    { title: "Chunky Resin Bangle Set", description: "Set of 4 chunky resin bangles in jewel tones — bold and playful", brand: "Saanjh", categoryKey: "uAccessories", isTrialEligible: true, attributes: { gender: "women", fabric: "resin", occasion: "casual-festive", pattern: "solid" }, sizeSets: ["Free"], colorCount: 4, mrpMin: 45000, mrpMax: 75000 },
    { title: "Striped Henley Tee", description: "Classic Breton stripe Henley tee — effortless nautical casual", brand: "Urbane", categoryKey: "mTshirts", isTrialEligible: true, attributes: { gender: "men", fabric: "cotton", occasion: "casual", sleeveLength: "half", pattern: "stripe" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 3, mrpMin: 85000, mrpMax: 120000 },
    { title: "Kalamkari Saree", description: "Bold Kalamkari on cream cotton saree — the storyteller drape", brand: "Local Weave", categoryKey: "wSarees", isTrialEligible: true, attributes: { gender: "women", fabric: "cotton", occasion: "cultural-festive", pattern: "kalamkari" }, sizeSets: ["Free"], colorCount: 3, mrpMin: 200000, mrpMax: 280000 },
    { title: "Cotton Boxers — 3-Pack", description: "Breathable cotton boxers with elastic waistband — reliable daily comfort", brand: "Urbane", categoryKey: "uInnerwear", isTrialEligible: false, attributes: { gender: "men", fabric: "cotton", occasion: "daily", pattern: "checked" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 2, mrpMin: 42000, mrpMax: 68000 },
  ];
  smpProds.forEach((p) => templates.push({ ...p, storeIdx: 6 }));

  // ───────────── Stitchcraft Gachibowli (storeIdx 7) ─────────────
  // Focus: Cotton, linen, daily wear for professionals
  const sgbProds: ProductTemplate[] = [
    { title: "Poplin Shirt — Women", description: "Crisp cotton-poplin shirt dress for women — boardroom to brunch", brand: "Stitchcraft", categoryKey: "wTops", isTrialEligible: true, attributes: { gender: "women", fabric: "cotton-poplin", occasion: "office-casual", sleeveLength: "full", pattern: "solid" }, sizeSets: ["XS", "S", "M", "L", "XL"], colorCount: 4, mrpMin: 110000, mrpMax: 160000 },
    { title: "High-Waist Wide-Leg Trousers — Women", description: "High-waist wide-leg trousers in crepe — '70s vibe with modern tailoring", brand: "Urbane", categoryKey: "wDresses", isTrialEligible: true, attributes: { gender: "women", fabric: "crepe", occasion: "office-casual", pattern: "solid" }, sizeSets: ["XS", "S", "M", "L", "XL"], colorCount: 3, mrpMin: 130000, mrpMax: 185000 },
    { title: "Handblock Kaftan Top", description: "Airy handblock kaftan top in muslin — loungewear elevated to street style", brand: "Local Weave", categoryKey: "wTops", isTrialEligible: true, attributes: { gender: "women", fabric: "muslin", occasion: "casual-lounge", sleeveLength: "three-quarter", pattern: "block-print" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 3, mrpMin: 95000, mrpMax: 140000 },
    { title: "Raw Mango Pallu Saree", description: "Vibrant raw mango coloured saree with contrast pallu — South Indian classic", brand: "Local Weave", categoryKey: "wSarees", isTrialEligible: true, attributes: { gender: "women", fabric: "silk-blend", occasion: "festive-temple", pattern: "contrast-pallu" }, sizeSets: ["Free"], colorCount: 3, mrpMin: 210000, mrpMax: 290000 },
    { title: "Bandhej Gota Patti Kurta", description: "Bandhej print with gota patti border — Rajasthani festive craft on modern kurta", brand: "Stitchcraft", categoryKey: "wKurtas", isTrialEligible: true, attributes: { gender: "women", fabric: "georgette", occasion: "festive", sleeveLength: "three-quarter", pattern: "bandhej-gota" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 3, mrpMin: 155000, mrpMax: 220000 },
    { title: "Woven Kotpad Saree", description: "Tribal Kotpad weave saree from Odisha — organic dye, handloom craft", brand: "Local Weave", categoryKey: "wSarees", isTrialEligible: true, attributes: { gender: "women", fabric: "cotton-tribal", occasion: "cultural-casual", pattern: "kotpad-tribal" }, sizeSets: ["Free"], colorCount: 2, mrpMin: 240000, mrpMax: 320000 },
    { title: "Sustainable Linen Blazer — Men", description: "Stone-washed linen blazer — sustainable smart-casual from farm to form", brand: "Stitchcraft", categoryKey: "uJackets", isTrialEligible: true, attributes: { gender: "men", fabric: "stone-washed-linen", occasion: "smart-casual", pattern: "solid" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 3, mrpMin: 260000, mrpMax: 340000 },
    { title: "Slim Fit Dobby Trouser", description: "Dobby-texture slim-fit trouser — subtle pattern, clean silhouette", brand: "Trendz", categoryKey: "mTrousers", isTrialEligible: true, attributes: { gender: "men", fabric: "dobby-cotton", occasion: "office-smart", pattern: "dobby" }, sizeSets: ["30", "32", "34", "36"], colorCount: 3, mrpMin: 140000, mrpMax: 200000 },
    { title: "Waffle Knit Tee", description: "Textured waffle-knit tee in 220gsm cotton — understated, quality-forward", brand: "Urbane", categoryKey: "mTshirts", isTrialEligible: true, attributes: { gender: "men", fabric: "waffle-cotton", occasion: "casual", sleeveLength: "half", pattern: "textured-solid" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 4, mrpMin: 90000, mrpMax: 130000 },
    { title: "Hand-Embroidered Nehru Kurta", description: "Subtle hand-embroidered Nehru-collar kurta — precision craft on soft cotton", brand: "Stitchcraft", categoryKey: "mKurtas", isTrialEligible: true, attributes: { gender: "men", fabric: "cotton", occasion: "festive-casual", sleeveLength: "full", pattern: "embroidered" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 3, mrpMin: 160000, mrpMax: 230000 },
    { title: "Organic Cotton Formal Shirt", description: "GOTS-certified organic cotton formal shirt — white-collar with a green conscience", brand: "Stitchcraft", categoryKey: "mShirts", isTrialEligible: true, attributes: { gender: "men", fabric: "organic-cotton", occasion: "office-formal", sleeveLength: "full", pattern: "solid" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 3, mrpMin: 140000, mrpMax: 200000 },
    { title: "Windbreaker Jacket — Unisex", description: "Lightweight packable windbreaker — your travel companion in 100g", brand: "Urbane", categoryKey: "uJackets", isTrialEligible: true, attributes: { gender: "unisex", fabric: "nylon-ripstop", occasion: "travel-outdoor", pattern: "solid" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 3, mrpMin: 190000, mrpMax: 270000 },
    { title: "Beaded Statement Necklace", description: "Hand-strung semi-precious beaded necklace — tribal chic for every wardrobe", brand: "Local Weave", categoryKey: "uAccessories", isTrialEligible: true, attributes: { gender: "women", fabric: "semi-precious-beads", occasion: "festive-casual", pattern: "beaded" }, sizeSets: ["Free"], colorCount: 3, mrpMin: 90000, mrpMax: 145000 },
    { title: "Hemp Canvas Backpack", description: "Durable hemp-canvas backpack with laptop sleeve — conscious commuter essential", brand: "Stitchcraft", categoryKey: "uAccessories", isTrialEligible: true, attributes: { gender: "unisex", fabric: "hemp-canvas", occasion: "office-commute", pattern: "solid" }, sizeSets: ["Free"], colorCount: 2, mrpMin: 170000, mrpMax: 240000 },
    { title: "Modal Innerwear Boxers — 2-Pack", description: "Super-soft modal boxers — second-skin comfort for all-day wear", brand: "Urbane", categoryKey: "uInnerwear", isTrialEligible: false, attributes: { gender: "men", fabric: "modal", occasion: "daily", pattern: "solid" }, sizeSets: ["S", "M", "L", "XL"], colorCount: 2, mrpMin: 48000, mrpMax: 78000 },
  ];
  sgbProds.forEach((p) => templates.push({ ...p, storeIdx: 7 }));

  return templates;
}

// ─────────────────────────────────────────────────────────────────────────────
// Raw-SQL bulk helpers  (bypass per-row ORM overhead over remote DB)
// ─────────────────────────────────────────────────────────────────────────────

/** Generate a cuid-compatible random id (26-char alphanumeric) */
function cuid(): string {
  const ts = Date.now().toString(36);
  const rand = () => Math.random().toString(36).slice(2);
  return `c${ts}${rand()}${rand()}`.slice(0, 25);
}

/** Escape a string value for embedding in raw SQL literals */
function sqlStr(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

/** Serialise a string[] to a Postgres array literal: '{a,b,c}' */
function pgStrArray(arr: string[]): string {
  const inner = arr.map((s) => `"${s.replace(/"/g, '\\"')}"`).join(",");
  return `'{${inner}}'`;
}

async function seedProductsVariantsInventory(
  stores: (ReturnType<typeof Object.assign> & { id: string; shortcode: string })[],
  catMap: Record<string, string>
) {
  console.log("\n👗  Seeding products, variants, and inventory…");

  const templates = buildProductTemplates(catMap);
  let productCount = 0;
  let variantCount = 0;
  let inventoryCount = 0;

  // We'll collect all variant rows and all inventory rows, then batch-insert
  // them in chunks — one INSERT per product keeps parameter lists reasonable.

  for (const tmpl of templates) {
    const store = stores[tmpl.storeIdx]!;
    const categoryId = catMap[tmpl.categoryKey];
    if (!categoryId) {
      console.warn(`  ⚠️  Unknown categoryKey "${tmpl.categoryKey}" — skipping.`);
      continue;
    }

    // --- Product (one per template; ORM call is fine for 120 rows) ---
    const productId = cuid();
    const now = new Date().toISOString();
    await prisma.$executeRawUnsafe(`
      INSERT INTO "Product"
        (id, "storeId", "categoryId", title, description, brand,
         "isTrialEligible", "isActive", attributes, "createdAt", "updatedAt")
      VALUES (
        ${sqlStr(productId)},
        ${sqlStr(store.id)},
        ${sqlStr(categoryId)},
        ${sqlStr(tmpl.title)},
        ${sqlStr(tmpl.description ?? "")},
        ${sqlStr(tmpl.brand)},
        ${tmpl.isTrialEligible},
        true,
        ${sqlStr(JSON.stringify(tmpl.attributes))}::jsonb,
        '${now}'::timestamptz,
        '${now}'::timestamptz
      )
    `);
    productCount++;
    const pNum = productCount;

    // --- Variants + InventoryLedger (batch raw SQL per product) ---
    const sizes = tmpl.sizeSets;
    const colorPool = [...COLORS].sort(() => Math.random() - 0.5).slice(0, tmpl.colorCount);

    const variantRows: string[] = [];
    const inventoryRows: string[] = [];
    let vNum = 0;

    for (const size of sizes) {
      for (const color of colorPool) {
        vNum++;
        const variantId = cuid();
        const sku = `DRP-${store.shortcode}-${String(pNum).padStart(3, "0")}-${String(vNum).padStart(2, "0")}`;
        const mrp = rnd(tmpl.mrpMin, tmpl.mrpMax);
        const price = Math.floor(mrp * (0.60 + Math.random() * 0.35));

        const imgCount = rnd(1, 3);
        const images: string[] = [];
        for (let i = 0; i < imgCount; i++) images.push(pick(UNSPLASH_FASHION));

        variantRows.push(
          `(${sqlStr(variantId)}, ${sqlStr(productId)}, ${sqlStr(sku)}, ${sqlStr(size)}, ${sqlStr(color.name)}, ${sqlStr(color.hex)}, ${mrp}, ${price}, ${pgStrArray(images)}, ${rnd(200, 600)}, '${now}'::timestamptz)`
        );

        const qty = Math.random() < 0.1 ? 0 : rnd(1, 8);
        const invId = cuid();
        const invNow = new Date().toISOString();
        inventoryRows.push(
          `(${sqlStr(invId)}, ${sqlStr(variantId)}, ${sqlStr(store.id)}, ${qty}, 0, '${invNow}'::timestamptz)`
        );

        variantCount++;
        inventoryCount++;
      }
    }

    if (variantRows.length > 0) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO "Variant"
          (id, "productId", sku, size, color, "colorHex", "mrpPaise", "pricePaise", images, "weightGrams", "createdAt")
        VALUES ${variantRows.join(",\n")}
      `);
      await prisma.$executeRawUnsafe(`
        INSERT INTO "InventoryLedger"
          (id, "variantId", "storeId", qty, version, "updatedAt")
        VALUES ${inventoryRows.join(",\n")}
      `);
    }
  }

  console.log(`✅  Products: ${productCount} | Variants: ${variantCount} | InventoryLedger: ${inventoryCount}`);
  return { productCount, variantCount, inventoryCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Draply seed starting…\n");

  // a. Truncate
  await truncateAll();

  // b. Categories
  const cats = await seedCategories();

  // c. Users
  const { customers, merchantOwners, admin: _admin, riders: riderUsers } = await seedUsers();

  // d. Addresses
  await seedAddresses(customers);

  // e. Merchants
  const { trendz, stitchcraft } = await seedMerchants(merchantOwners);

  // f. Stores — return with shortcodes
  const storesRaw = await seedStores(trendz, stitchcraft);
  const stores = storesRaw as (typeof storesRaw[0] & { shortcode: string })[];

  // g. Riders
  await seedRiders(riderUsers as { id: string; name: string; phone: string }[]);

  // h/i/j. Products + Variants + Inventory
  const catMap: Record<string, string> = {
    wKurtas: cats.wKurtas.id,
    wSarees: cats.wSarees.id,
    wTops: cats.wTops.id,
    wDresses: cats.wDresses.id,
    wEthnicSets: cats.wEthnicSets.id,
    mShirts: cats.mShirts.id,
    mTshirts: cats.mTshirts.id,
    mTrousers: cats.mTrousers.id,
    mKurtas: cats.mKurtas.id,
    uJackets: cats.uJackets.id,
    uInnerwear: cats.uInnerwear.id,
    uAccessories: cats.uAccessories.id,
  };

  await seedProductsVariantsInventory(stores as any, catMap);

  console.log("\n✨  Seed complete!");
}

main()
  .then(() => {
    console.log("🏁  Exiting.");
    process.exit(0);
  })
  .catch((e) => {
    console.error("❌  Seed failed:", e);
    process.exit(1);
  });
