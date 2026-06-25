CREATE TABLE "viseed_role_permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"role_slug" text NOT NULL,
	"permission" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "viseed_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "viseed_roles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "viseed_users" ADD COLUMN "is_owner" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "viseed_role_permissions" ADD CONSTRAINT "viseed_role_permissions_role_slug_viseed_roles_slug_fk" FOREIGN KEY ("role_slug") REFERENCES "public"."viseed_roles"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "viseed_role_permissions_role_slug_permission_unique" ON "viseed_role_permissions" USING btree ("role_slug","permission");--> statement-breakpoint
CREATE UNIQUE INDEX "viseed_users_single_owner_unique" ON "viseed_users" USING btree ("is_owner") WHERE "viseed_users"."is_owner" = true;