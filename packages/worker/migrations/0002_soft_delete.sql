ALTER TABLE `gates` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `configs` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `universes` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `events` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `metrics` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `user_attributes` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `label_profiles` ADD `deleted_at` text;
