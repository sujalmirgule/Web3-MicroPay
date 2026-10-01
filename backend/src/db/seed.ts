/**
 * Database seeder: creates test accounts for local development.
 * Hardhat test accounts #0, #1, #2.
 * Run: npx ts-node --esm src/db/seed.ts (or via npm run db:seed)
 */
import "dotenv/config";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const HARDHAT_RELAYER  = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
const HARDHAT_ALICE    = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";
const HARDHAT_BOB_MERCHANT = "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc";

async function seed(): Promise<void> {
  console.log("🌱  Seeding database for local development...");

  // Create test payer (Alice)
  const alice = await prisma.user.upsert({
    where:  { wallet_address: HARDHAT_ALICE },
    create: { wallet_address: HARDHAT_ALICE, username: "alice", role: "USER" },
    update: {},
  });
  console.log("✅  User Alice:", alice.id);

  // Create test admin / relayer
  const admin = await prisma.user.upsert({
    where:  { wallet_address: HARDHAT_RELAYER },
    create: { wallet_address: HARDHAT_RELAYER, username: "relayer", role: "ADMIN" },
    update: {},
  });
  console.log("✅  Admin/Relayer:", admin.id);

  // Create test merchant (Bob)
  const rawApiKey     = "mp_test_" + crypto.randomBytes(16).toString("hex");
  const apiKeyHash    = crypto.createHash("sha256").update(rawApiKey).digest("hex");

  const merchant = await prisma.merchant.upsert({
    where:  { wallet_address: HARDHAT_BOB_MERCHANT },
    create: {
      wallet_address: HARDHAT_BOB_MERCHANT,
      business_name:  "Bob Publisher",
      api_key_hash:   apiKeyHash,
      is_active:      true,
    },
    update: {},
  });
  console.log("✅  Merchant Bob:", merchant.id);
  console.log("   API Key (save this — shown once):", rawApiKey);

  // Create a mock OPEN payment channel
  const MOCK_CHANNEL_ID = "0x" + "1".repeat(64);
  const MOCK_TOKEN      = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512"; // MockUSDC local

  const channel = await prisma.paymentChannel.upsert({
    where:  { channel_id: MOCK_CHANNEL_ID },
    create: {
      channel_id:             MOCK_CHANNEL_ID,
      payer_address:          HARDHAT_ALICE,
      recipient_address:      HARDHAT_BOB_MERCHANT,
      token_address:          MOCK_TOKEN,
      total_deposit:          "1000000000", // 1000 USDC (6 decimals) — Prisma Decimal accepts string
      expiration_timestamp:   BigInt(Math.floor(Date.now() / 1000) + 86400 * 30),
      dispute_period_seconds: BigInt(86400),
      status:                 "OPEN",
      open_tx_hash:           "0x" + "a".repeat(64),
      open_block_number:      1,
    },
    update: {},
  });
  console.log("✅  Mock channel:", channel.channel_id);

  // Webhook config for Bob
  const hmacSecret = "whsec_" + crypto.randomBytes(16).toString("hex");
  const webhook = await prisma.webhookConfig.upsert({
    where:  { id: merchant.id + "_webhook" },
    create: {
      id:               merchant.id + "_webhook",
      merchant_id:      merchant.id,
      url:              "http://localhost:9999/webhook",
      hmac_secret:      hmacSecret,
      subscribed_events: ["payment.authorized", "settlement.confirmed"],
    },
    update: {},
  }).catch(() => null); // ignore if already exists
  console.log("✅  Webhook config created");

  console.log("\n🎉  Seed complete! Local environment ready.");
  console.log("   Alice wallet:    ", HARDHAT_ALICE);
  console.log("   Bob merchant:    ", HARDHAT_BOB_MERCHANT);
  console.log("   Mock channel:    ", MOCK_CHANNEL_ID);
}

seed()
  .catch((err) => { console.error("Seed failed:", err); process.exit(1); })
  .finally(() => prisma.$disconnect());
