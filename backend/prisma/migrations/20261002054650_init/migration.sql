-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'MERCHANT', 'ADMIN');

-- CreateEnum
CREATE TYPE "ChannelStatus" AS ENUM ('PENDING', 'OPEN', 'DISPUTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'SUBMITTED', 'MINED', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED', 'DEAD_LETTER');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wallet_address" VARCHAR(42) NOT NULL,
    "username" VARCHAR(100),
    "email" VARCHAR(255),
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wallet_address" VARCHAR(42) NOT NULL,
    "business_name" VARCHAR(100) NOT NULL,
    "api_key_hash" VARCHAR(64) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "merchants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_channels" (
    "channel_id" VARCHAR(66) NOT NULL,
    "payer_address" VARCHAR(42) NOT NULL,
    "recipient_address" VARCHAR(42) NOT NULL,
    "token_address" VARCHAR(42) NOT NULL,
    "total_deposit" DECIMAL(78,0) NOT NULL,
    "settled_amount" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "reserved_amount" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "expiration_timestamp" BIGINT NOT NULL,
    "dispute_period_seconds" BIGINT NOT NULL DEFAULT 86400,
    "status" "ChannelStatus" NOT NULL DEFAULT 'PENDING',
    "open_tx_hash" VARCHAR(66),
    "open_block_number" BIGINT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "payment_channels_pkey" PRIMARY KEY ("channel_id")
);

-- CreateTable
CREATE TABLE "vouchers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "channel_id" VARCHAR(66) NOT NULL,
    "nonce" BIGINT NOT NULL,
    "cumulative_amount" DECIMAL(78,0) NOT NULL,
    "signature" VARCHAR(132) NOT NULL,
    "valid_until" BIGINT NOT NULL,
    "is_settled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "channel_id" VARCHAR(66) NOT NULL,
    "voucher_id" UUID NOT NULL,
    "claimed_amount" DECIMAL(78,0) NOT NULL,
    "net_payout" DECIMAL(78,0) NOT NULL,
    "relayer_gas_fee" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "protocol_fee" DECIMAL(78,0) NOT NULL DEFAULT 0,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "tx_hash" VARCHAR(66),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalized_at" TIMESTAMPTZ,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement_receipts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "settlement_id" UUID NOT NULL,
    "tx_hash" VARCHAR(66) NOT NULL,
    "block_number" BIGINT NOT NULL,
    "gas_used" BIGINT NOT NULL,
    "effective_gas_price" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blockchain_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_name" VARCHAR(50) NOT NULL,
    "channel_id" VARCHAR(66) NOT NULL,
    "tx_hash" VARCHAR(66) NOT NULL,
    "block_number" BIGINT NOT NULL,
    "log_index" INTEGER NOT NULL,
    "raw_data" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blockchain_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "channel_id" VARCHAR(66) NOT NULL,
    "initiated_by" VARCHAR(42) NOT NULL,
    "dispute_expires_at" BIGINT NOT NULL,
    "counter_settled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "merchant_id" UUID NOT NULL,
    "url" VARCHAR(255) NOT NULL,
    "hmac_secret" VARCHAR(64) NOT NULL,
    "subscribed_events" TEXT[],
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "webhook_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_outbox" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "merchant_id" UUID NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "payload" JSONB NOT NULL,
    "target_url" VARCHAR(255) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "delivery_status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "last_error" TEXT,
    "next_retry_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_evaluations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "channel_id" VARCHAR(66),
    "evaluation_type" VARCHAR(50) NOT NULL,
    "risk_score" INTEGER NOT NULL,
    "reasoning_tags" JSONB NOT NULL,
    "raw_advisory_payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_address" VARCHAR(42) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "details" JSONB NOT NULL,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_wallet_address_key" ON "users"("wallet_address");

-- CreateIndex
CREATE INDEX "idx_users_wallet" ON "users"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "merchants_wallet_address_key" ON "merchants"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "merchants_api_key_hash_key" ON "merchants"("api_key_hash");

-- CreateIndex
CREATE INDEX "idx_merchants_wallet" ON "merchants"("wallet_address");

-- CreateIndex
CREATE INDEX "idx_merchants_api_key_hash" ON "merchants"("api_key_hash");

-- CreateIndex
CREATE INDEX "idx_channels_payer" ON "payment_channels"("payer_address");

-- CreateIndex
CREATE INDEX "idx_channels_recipient" ON "payment_channels"("recipient_address");

-- CreateIndex
CREATE INDEX "idx_channels_status" ON "payment_channels"("status");

-- CreateIndex
CREATE INDEX "idx_vouchers_channel_nonce_desc" ON "vouchers"("channel_id", "nonce" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_channel_id_nonce_key" ON "vouchers"("channel_id", "nonce");

-- CreateIndex
CREATE INDEX "idx_settlements_channel" ON "settlements"("channel_id");

-- CreateIndex
CREATE INDEX "idx_settlements_status" ON "settlements"("status");

-- CreateIndex
CREATE UNIQUE INDEX "settlement_receipts_settlement_id_key" ON "settlement_receipts"("settlement_id");

-- CreateIndex
CREATE UNIQUE INDEX "settlement_receipts_tx_hash_key" ON "settlement_receipts"("tx_hash");

-- CreateIndex
CREATE INDEX "idx_receipts_tx_hash" ON "settlement_receipts"("tx_hash");

-- CreateIndex
CREATE INDEX "idx_receipts_block" ON "settlement_receipts"("block_number");

-- CreateIndex
CREATE UNIQUE INDEX "blockchain_events_tx_hash_log_index_key" ON "blockchain_events"("tx_hash", "log_index");

-- CreateIndex
CREATE UNIQUE INDEX "disputes_channel_id_key" ON "disputes"("channel_id");

-- CreateIndex
CREATE INDEX "idx_disputes_expiry" ON "disputes"("dispute_expires_at");

-- CreateIndex
CREATE INDEX "idx_webhook_merchant" ON "webhook_configs"("merchant_id");

-- CreateIndex
CREATE INDEX "idx_outbox_queue" ON "notification_outbox"("delivery_status", "next_retry_at");

-- CreateIndex
CREATE INDEX "idx_audit_actor" ON "audit_logs"("actor_address");

-- CreateIndex
CREATE INDEX "idx_audit_action" ON "audit_logs"("action");

-- AddForeignKey
ALTER TABLE "payment_channels" ADD CONSTRAINT "payment_channels_payer_address_fkey" FOREIGN KEY ("payer_address") REFERENCES "users"("wallet_address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_channels" ADD CONSTRAINT "payment_channels_recipient_address_fkey" FOREIGN KEY ("recipient_address") REFERENCES "merchants"("wallet_address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "payment_channels"("channel_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "payment_channels"("channel_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement_receipts" ADD CONSTRAINT "settlement_receipts_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "settlements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockchain_events" ADD CONSTRAINT "blockchain_events_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "payment_channels"("channel_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "payment_channels"("channel_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_configs" ADD CONSTRAINT "webhook_configs_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_outbox" ADD CONSTRAINT "notification_outbox_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_evaluations" ADD CONSTRAINT "ai_evaluations_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "payment_channels"("channel_id") ON DELETE SET NULL ON UPDATE CASCADE;
