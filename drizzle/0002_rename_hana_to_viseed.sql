-- Migration: rename all hana_ tables/indexes/constraints to viseed_
-- Safe to run on databases that were created before this rename.
-- All renames are atomic renames — no data is moved or dropped.

-- ── 1. Rename tables ────────────────────────────────────────────────────────
ALTER TABLE "hana_installed_plugins"  RENAME TO "viseed_installed_plugins";--> statement-breakpoint
ALTER TABLE "hana_installed_themes"   RENAME TO "viseed_installed_themes";--> statement-breakpoint
ALTER TABLE "hana_sessions"           RENAME TO "viseed_sessions";--> statement-breakpoint
ALTER TABLE "hana_site_domains"       RENAME TO "viseed_site_domains";--> statement-breakpoint
ALTER TABLE "hana_sites"              RENAME TO "viseed_sites";--> statement-breakpoint
ALTER TABLE "hana_theme_state"        RENAME TO "viseed_theme_state";--> statement-breakpoint
ALTER TABLE "hana_user_site_roles"    RENAME TO "viseed_user_site_roles";--> statement-breakpoint
ALTER TABLE "hana_users"              RENAME TO "viseed_users";--> statement-breakpoint

-- ── 2. Rename unique constraints (using new table names) ─────────────────────
ALTER TABLE "viseed_users"
  RENAME CONSTRAINT "hana_users_email_unique"
  TO "viseed_users_email_unique";--> statement-breakpoint

ALTER TABLE "viseed_installed_plugins"
  RENAME CONSTRAINT "hana_installed_plugins_site_id_hana_sites_id_fk"
  TO "viseed_installed_plugins_site_id_viseed_sites_id_fk";--> statement-breakpoint

ALTER TABLE "viseed_installed_themes"
  RENAME CONSTRAINT "hana_installed_themes_site_id_hana_sites_id_fk"
  TO "viseed_installed_themes_site_id_viseed_sites_id_fk";--> statement-breakpoint

ALTER TABLE "viseed_sessions"
  RENAME CONSTRAINT "hana_sessions_site_id_hana_sites_id_fk"
  TO "viseed_sessions_site_id_viseed_sites_id_fk";--> statement-breakpoint

ALTER TABLE "viseed_sessions"
  RENAME CONSTRAINT "hana_sessions_user_id_hana_users_id_fk"
  TO "viseed_sessions_user_id_viseed_users_id_fk";--> statement-breakpoint

ALTER TABLE "viseed_site_domains"
  RENAME CONSTRAINT "hana_site_domains_site_id_hana_sites_id_fk"
  TO "viseed_site_domains_site_id_viseed_sites_id_fk";--> statement-breakpoint

ALTER TABLE "viseed_theme_state"
  RENAME CONSTRAINT "hana_theme_state_site_id_hana_sites_id_fk"
  TO "viseed_theme_state_site_id_viseed_sites_id_fk";--> statement-breakpoint

ALTER TABLE "viseed_user_site_roles"
  RENAME CONSTRAINT "hana_user_site_roles_user_id_hana_users_id_fk"
  TO "viseed_user_site_roles_user_id_viseed_users_id_fk";--> statement-breakpoint

ALTER TABLE "viseed_user_site_roles"
  RENAME CONSTRAINT "hana_user_site_roles_site_id_hana_sites_id_fk"
  TO "viseed_user_site_roles_site_id_viseed_sites_id_fk";--> statement-breakpoint

-- ── 3. Rename unique indexes ─────────────────────────────────────────────────
ALTER INDEX "hana_installed_plugins_site_name_unique"
  RENAME TO "viseed_installed_plugins_site_name_unique";--> statement-breakpoint

ALTER INDEX "hana_installed_themes_site_name_unique"
  RENAME TO "viseed_installed_themes_site_name_unique";--> statement-breakpoint

ALTER INDEX "hana_sessions_site_token_unique"
  RENAME TO "viseed_sessions_site_token_unique";--> statement-breakpoint

ALTER INDEX "hana_site_domains_domain_unique"
  RENAME TO "viseed_site_domains_domain_unique";--> statement-breakpoint

ALTER INDEX "hana_site_domains_site_domain_unique"
  RENAME TO "viseed_site_domains_site_domain_unique";--> statement-breakpoint

ALTER INDEX "hana_sites_slug_unique"
  RENAME TO "viseed_sites_slug_unique";--> statement-breakpoint

ALTER INDEX "hana_theme_state_site_unique"
  RENAME TO "viseed_theme_state_site_unique";--> statement-breakpoint

ALTER INDEX "hana_theme_state_site_theme_unique"
  RENAME TO "viseed_theme_state_site_theme_unique";--> statement-breakpoint

ALTER INDEX "hana_user_site_roles_user_site_unique"
  RENAME TO "viseed_user_site_roles_user_site_unique";
