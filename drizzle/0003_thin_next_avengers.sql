CREATE TABLE "dashboard_widgets" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"type" text NOT NULL,
	"size" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_storage_config" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"type" text DEFAULT 'local' NOT NULL,
	"config" jsonb DEFAULT '{}' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "widgets" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"config" jsonb DEFAULT '{}' NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "widgets_site_name_unique" UNIQUE("site_id","name")
);
--> statement-breakpoint
CREATE INDEX "dashboard_widgets_site_id_idx" ON "dashboard_widgets" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "widgets_site_id_idx" ON "widgets" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "widgets_site_type_idx" ON "widgets" USING btree ("site_id","type");