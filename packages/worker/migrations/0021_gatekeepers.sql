-- Promote `gates` to gatekeepers: an ordered stack of sub-gates (condition or
-- rollout) replaces the single rules+rolloutPct evaluation. The legacy columns
-- stay populated as a fallback so old SDKs that read `rules`+`rolloutPct` from
-- the KV blob keep working until they upgrade.
ALTER TABLE `gates` ADD `title` text;
--> statement-breakpoint
ALTER TABLE `gates` ADD `description` text;
--> statement-breakpoint
ALTER TABLE `gates` ADD `folder` text;
--> statement-breakpoint
ALTER TABLE `gates` ADD `group_name` text;
--> statement-breakpoint
ALTER TABLE `gates` ADD `owner_email` text;
--> statement-breakpoint
ALTER TABLE `gates` ADD `stack` text;
