CREATE TABLE "brand" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"voice" text DEFAULT '' NOT NULL,
	"tone" text DEFAULT '' NOT NULL,
	"primary_color" text DEFAULT '#6366f1' NOT NULL,
	"messaging_framework" text DEFAULT '' NOT NULL,
	"value_propositions" text[] DEFAULT '{}' NOT NULL,
	"target_market" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personas" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"age" text DEFAULT '' NOT NULL,
	"pain_points" text[] DEFAULT '{}' NOT NULL,
	"goals" text[] DEFAULT '{}' NOT NULL,
	"channels" text[] DEFAULT '{}' NOT NULL,
	"segment" text DEFAULT '' NOT NULL,
	"engagement_score" real DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"user_id" text NOT NULL,
	"page" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"triggered_action" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_decisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"trigger" text NOT NULL,
	"strategy" text NOT NULL,
	"messaging_angle" text NOT NULL,
	"channels" text[] DEFAULT '{}' NOT NULL,
	"confidence" real DEFAULT 0.8 NOT NULL,
	"reasoning" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"subject" text,
	"cta" text,
	"channel" text NOT NULL,
	"persona_id" integer,
	"decision_id" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"channel" text NOT NULL,
	"budget" real DEFAULT 0 NOT NULL,
	"spent" real DEFAULT 0 NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"conversions" integer DEFAULT 0 NOT NULL,
	"ctr" real DEFAULT 0 NOT NULL,
	"cvr" real DEFAULT 0 NOT NULL,
	"start_date" text,
	"end_date" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"last_sync" timestamp with time zone,
	"record_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taiwan_brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_en" text NOT NULL,
	"ticker" text,
	"industry" text NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"week_change" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'stable' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"website" text DEFAULT '' NOT NULL,
	"employees" text DEFAULT '' NOT NULL,
	"market_cap" text DEFAULT '' NOT NULL,
	"knowledge_graph" integer DEFAULT 0 NOT NULL,
	"ai_citation" integer DEFAULT 0 NOT NULL,
	"semantic_search" integer DEFAULT 0 NOT NULL,
	"multimodal" integer DEFAULT 0 NOT NULL,
	"claimed" boolean DEFAULT false NOT NULL,
	"claimed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
