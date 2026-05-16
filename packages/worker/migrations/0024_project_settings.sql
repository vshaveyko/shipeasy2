ALTER TABLE `projects` ADD `slug` text;
--> statement-breakpoint
ALTER TABLE `projects` ADD `default_env` text DEFAULT 'staging' NOT NULL;
--> statement-breakpoint
ALTER TABLE `projects` ADD `timezone` text DEFAULT 'UTC' NOT NULL;
--> statement-breakpoint
ALTER TABLE `projects` ADD `stat_method` text DEFAULT 'sequential' NOT NULL;
--> statement-breakpoint
ALTER TABLE `projects` ADD `sig_threshold` text DEFAULT '0.05' NOT NULL;
--> statement-breakpoint
ALTER TABLE `projects` ADD `auto_rollback` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE `projects` ADD `min_sample_days` integer DEFAULT 14 NOT NULL;
--> statement-breakpoint
ALTER TABLE `projects` ADD `deleted_at` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_slug_uniq` ON `projects` (`slug`);
--> statement-breakpoint
CREATE TABLE `notification_prefs` (
  `project_id` text NOT NULL,
  `event` text NOT NULL,
  `email` integer DEFAULT 0 NOT NULL,
  `slack` integer DEFAULT 0 NOT NULL,
  `claude_dm` integer DEFAULT 0 NOT NULL,
  `updated_at` text NOT NULL,
  PRIMARY KEY (`project_id`, `event`),
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `integration_settings` (
  `project_id` text NOT NULL,
  `kind` text NOT NULL,
  `status` text DEFAULT 'available' NOT NULL,
  `config` text,
  `connected_at` text,
  `updated_at` text NOT NULL,
  PRIMARY KEY (`project_id`, `kind`),
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
