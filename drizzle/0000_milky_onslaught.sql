CREATE TABLE "hana_installed_plugins" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"name" text NOT NULL,
	"version" text NOT NULL,
	"type" text NOT NULL,
	"bundle_url" text,
	"integrity" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"config" jsonb,
	"installed_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hana_installed_themes" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"name" text NOT NULL,
	"version" text NOT NULL,
	"description" text,
	"author" text,
	"bundle_url" text NOT NULL,
	"integrity" text NOT NULL,
	"required_layouts" jsonb NOT NULL,
	"screenshots" jsonb,
	"homepage" text,
	"repository" text,
	"tags" jsonb,
	"min_cms_version" text,
	"required_plugins" jsonb,
	"compatible_plugins" jsonb,
	"enabled" boolean DEFAULT true NOT NULL,
	"installed_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_files" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"filename" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"path" text NOT NULL,
	"slug" text,
	"alt" text,
	"uploaded_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hana_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hana_site_domains" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"domain" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hana_sites" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hana_theme_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"active_theme_name" text NOT NULL,
	"settings" jsonb,
	"preview_theme_name" text,
	"preview_theme_path" text,
	"preview_token" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hana_user_site_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"site_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hana_users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'site_content_writer' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hana_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "blog_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"body" text,
	"excerpt" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"author_id" text,
	"category_id" text,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" text PRIMARY KEY NOT NULL,
	"menu_id" text NOT NULL,
	"parent_id" text,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"target" text DEFAULT '_self',
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menus" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"name" text NOT NULL,
	"zone" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_pages" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text DEFAULT 'default' NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"body" text,
	"excerpt" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"author_id" text,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hana_installed_plugins" ADD CONSTRAINT "hana_installed_plugins_site_id_hana_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hana_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hana_installed_themes" ADD CONSTRAINT "hana_installed_themes_site_id_hana_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hana_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hana_sessions" ADD CONSTRAINT "hana_sessions_site_id_hana_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hana_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hana_sessions" ADD CONSTRAINT "hana_sessions_user_id_hana_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."hana_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hana_site_domains" ADD CONSTRAINT "hana_site_domains_site_id_hana_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hana_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hana_theme_state" ADD CONSTRAINT "hana_theme_state_site_id_hana_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hana_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hana_user_site_roles" ADD CONSTRAINT "hana_user_site_roles_user_id_hana_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."hana_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hana_user_site_roles" ADD CONSTRAINT "hana_user_site_roles_site_id_hana_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."hana_sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hana_installed_plugins_site_name_unique" ON "hana_installed_plugins" USING btree ("site_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "hana_installed_themes_site_name_unique" ON "hana_installed_themes" USING btree ("site_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "hana_sessions_site_token_unique" ON "hana_sessions" USING btree ("site_id","token");--> statement-breakpoint
CREATE UNIQUE INDEX "hana_site_domains_domain_unique" ON "hana_site_domains" USING btree ("domain");--> statement-breakpoint
CREATE UNIQUE INDEX "hana_site_domains_site_domain_unique" ON "hana_site_domains" USING btree ("site_id","domain");--> statement-breakpoint
CREATE UNIQUE INDEX "hana_sites_slug_unique" ON "hana_sites" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "hana_theme_state_site_unique" ON "hana_theme_state" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hana_theme_state_site_theme_unique" ON "hana_theme_state" USING btree ("site_id","active_theme_name");--> statement-breakpoint
CREATE UNIQUE INDEX "hana_user_site_roles_user_site_unique" ON "hana_user_site_roles" USING btree ("user_id","site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "blog_categories_site_slug_unique" ON "blog_categories" USING btree ("site_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "blog_posts_site_slug_unique" ON "blog_posts" USING btree ("site_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "menus_site_zone_unique" ON "menus" USING btree ("site_id","zone");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_pages_site_slug_unique" ON "cms_pages" USING btree ("site_id","slug");