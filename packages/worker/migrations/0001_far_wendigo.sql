CREATE TABLE `i18n_usage_daily` (
	`project_id` text NOT NULL,
	`sdk_key_id` text NOT NULL,
	`date` text NOT NULL,
	`request_count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`project_id`, `sdk_key_id`, `date`)
);
--> statement-breakpoint
CREATE INDEX `i18n_usage_daily_project_date` ON `i18n_usage_daily` (`project_id`,`date`);--> statement-breakpoint
CREATE TABLE `label_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`profile_id` text NOT NULL,
	`name` text NOT NULL,
	`is_index` integer DEFAULT 0 NOT NULL,
	`published_url` text,
	`published_hash` text,
	`published_at` text,
	`etag` text,
	FOREIGN KEY (`profile_id`) REFERENCES `label_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `label_chunks_project` ON `label_chunks` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `label_chunks_profile_name` ON `label_chunks` (`profile_id`,`name`);--> statement-breakpoint
CREATE TABLE `label_draft_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`draft_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`updated_by` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`draft_id`) REFERENCES `label_drafts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `label_draft_keys_draft_key` ON `label_draft_keys` (`draft_id`,`key`);--> statement-breakpoint
CREATE INDEX `label_draft_keys_project` ON `label_draft_keys` (`project_id`);--> statement-breakpoint
CREATE TABLE `label_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`profile_id` text NOT NULL,
	`name` text NOT NULL,
	`source_profile_id` text,
	`created_by` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text NOT NULL,
	`published_at` text,
	FOREIGN KEY (`profile_id`) REFERENCES `label_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_profile_id`) REFERENCES `label_profiles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `label_drafts_project` ON `label_drafts` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `label_drafts_project_name` ON `label_drafts` (`project_id`,`name`);--> statement-breakpoint
CREATE TABLE `label_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`profile_id` text NOT NULL,
	`chunk_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`updated_at` text NOT NULL,
	`updated_by` text NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `label_profiles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chunk_id`) REFERENCES `label_chunks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `label_keys_project` ON `label_keys` (`project_id`);--> statement-breakpoint
CREATE INDEX `label_keys_chunk` ON `label_keys` (`chunk_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `label_keys_profile_key` ON `label_keys` (`profile_id`,`key`);--> statement-breakpoint
CREATE TABLE `label_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`default_chunk_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `label_profiles_project` ON `label_profiles` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `label_profiles_project_name` ON `label_profiles` (`project_id`,`name`);--> statement-breakpoint
ALTER TABLE `sdk_keys` ADD `scope` text DEFAULT 'experiments' NOT NULL;