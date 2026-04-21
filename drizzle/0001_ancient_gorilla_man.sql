ALTER TABLE "blog_posts" ADD COLUMN "meta_seo" jsonb;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD COLUMN "schema_org" jsonb;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD COLUMN "toc_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cms_pages" ADD COLUMN "meta_seo" jsonb;--> statement-breakpoint
ALTER TABLE "cms_pages" ADD COLUMN "schema_org" jsonb;--> statement-breakpoint
ALTER TABLE "cms_pages" ADD COLUMN "toc_enabled" boolean DEFAULT false NOT NULL;