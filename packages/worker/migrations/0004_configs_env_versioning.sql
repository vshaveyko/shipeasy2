-- Configs redesign: per-env published versions + drafts.
-- Pre-release change — drops existing config data rather than migrating it.

DELETE FROM `configs`;--> statement-breakpoint

ALTER TABLE `configs` DROP COLUMN `value_json`;--> statement-breakpoint
ALTER TABLE `configs` ADD `description` text;--> statement-breakpoint
ALTER TABLE `configs` ADD `value_type` text DEFAULT 'object' NOT NULL;--> statement-breakpoint

CREATE TABLE `config_values` (
  `id` text PRIMARY KEY NOT NULL,
  `project_id` text NOT NULL,
  `config_id` text NOT NULL,
  `env` text NOT NULL,
  `value_json` text NOT NULL,
  `version` integer NOT NULL,
  `published_at` text NOT NULL,
  `published_by` text NOT NULL,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`config_id`) REFERENCES `configs`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `config_values_project` ON `config_values` (`project_id`);--> statement-breakpoint
CREATE INDEX `config_values_config_env` ON `config_values` (`config_id`,`env`,`version`);--> statement-breakpoint
CREATE UNIQUE INDEX `config_values_config_env_version` ON `config_values` (`config_id`,`env`,`version`);--> statement-breakpoint

CREATE TABLE `config_drafts` (
  `id` text PRIMARY KEY NOT NULL,
  `project_id` text NOT NULL,
  `config_id` text NOT NULL,
  `env` text NOT NULL,
  `value_json` text NOT NULL,
  `base_version` integer NOT NULL,
  `author_email` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`config_id`) REFERENCES `configs`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `config_drafts_project` ON `config_drafts` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `config_drafts_config_env` ON `config_drafts` (`config_id`,`env`);
