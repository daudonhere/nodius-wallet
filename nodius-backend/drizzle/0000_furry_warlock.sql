CREATE TYPE "public"."alert_direction" AS ENUM('above', 'below');--> statement-breakpoint
CREATE TYPE "public"."chain_type" AS ENUM('evm', 'solana', 'ton');--> statement-breakpoint
CREATE TYPE "public"."gas_pool_status" AS ENUM('healthy', 'low', 'empty');--> statement-breakpoint
CREATE TYPE "public"."network_mode" AS ENUM('devnet', 'testnet', 'mainnet');--> statement-breakpoint
CREATE TYPE "public"."relayer_purpose" AS ENUM('evm_meta_tx', 'solana_fee_payer', 'ton_sponsor');--> statement-breakpoint
CREATE TYPE "public"."tx_status" AS ENUM('pending', 'submitted', 'confirmed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."tx_type" AS ENUM('transfer', 'swap', 'bridge', 'meta_tx');--> statement-breakpoint
CREATE TABLE "address_book" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid,
	"label" text NOT NULL,
	"address" text NOT NULL,
	"chain_type" "chain_type" NOT NULL,
	"chain_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract_deployments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"network_mode" "network_mode" NOT NULL,
	"chain_type" "chain_type" NOT NULL,
	"chain_id" text NOT NULL,
	"contract_name" text NOT NULL,
	"contract_address" text NOT NULL,
	"deployment_tx_hash" text,
	"abi" jsonb,
	"deployed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contract_deployments_network_mode_chain_type_chain_id_contract_name_unique" UNIQUE("network_mode","chain_type","chain_id","contract_name")
);
--> statement-breakpoint
CREATE TABLE "gas_pool" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"network_mode" "network_mode" NOT NULL,
	"chain_type" "chain_type" NOT NULL,
	"chain_id" text NOT NULL,
	"relayer_address" text NOT NULL,
	"native_symbol" text NOT NULL,
	"balance" numeric(36, 18) DEFAULT '0' NOT NULL,
	"threshold" numeric(36, 18) DEFAULT '0' NOT NULL,
	"status" "gas_pool_status" DEFAULT 'healthy' NOT NULL,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gas_pool_network_mode_chain_type_chain_id_relayer_address_unique" UNIQUE("network_mode","chain_type","chain_id","relayer_address")
);
--> statement-breakpoint
CREATE TABLE "nonce_tracker" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"network_mode" "network_mode" NOT NULL,
	"chain_id" text NOT NULL,
	"user_address" text NOT NULL,
	"nonce" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nonce_tracker_network_mode_chain_id_user_address_unique" UNIQUE("network_mode","chain_id","user_address")
);
--> statement-breakpoint
CREATE TABLE "price_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid,
	"symbol" text NOT NULL,
	"target_price" numeric(36, 18) NOT NULL,
	"direction" "alert_direction" NOT NULL,
	"triggered" boolean DEFAULT false NOT NULL,
	"last_price" numeric(36, 18),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"privy_user_id" text,
	"primary_address" text,
	"display_name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_privy_user_id_unique" UNIQUE("privy_user_id")
);
--> statement-breakpoint
CREATE TABLE "relay_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"network_mode" "network_mode" NOT NULL,
	"chain_type" "chain_type" NOT NULL,
	"chain_id" text NOT NULL,
	"user_address" text,
	"from_address" text,
	"to_address" text,
	"tx_type" "tx_type" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tx_hash" text,
	"status" "tx_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relayer_wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"network_mode" "network_mode" NOT NULL,
	"chain_type" "chain_type" NOT NULL,
	"chain_id" text NOT NULL,
	"address" text NOT NULL,
	"purpose" "relayer_purpose" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "relayer_wallets_network_mode_chain_type_chain_id_purpose_address_unique" UNIQUE("network_mode","chain_type","chain_id","purpose","address")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"network_mode" "network_mode" NOT NULL,
	"user_address" text NOT NULL,
	"chain_type" "chain_type" NOT NULL,
	"chain_id" text NOT NULL,
	"tx_hash" text,
	"tx_type" "tx_type" NOT NULL,
	"status" "tx_status" DEFAULT 'pending' NOT NULL,
	"from_token" text,
	"to_token" text,
	"from_amount" numeric(36, 18),
	"to_amount" numeric(36, 18),
	"from_chain_id" text,
	"to_chain_id" text,
	"route_provider" text,
	"explorer_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid,
	"network_mode" "network_mode" DEFAULT 'testnet' NOT NULL,
	"local_currency" text DEFAULT 'usd' NOT NULL,
	"default_network" text DEFAULT 'Ethereum' NOT NULL,
	"gas_abstraction_enabled" boolean DEFAULT true NOT NULL,
	"gas_speed" text DEFAULT 'normal' NOT NULL,
	"push_notifications" boolean DEFAULT false NOT NULL,
	"ton_wallet_contract_addr" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
ALTER TABLE "address_book" ADD CONSTRAINT "address_book_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;