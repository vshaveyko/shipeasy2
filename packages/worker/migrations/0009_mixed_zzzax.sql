PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`actor_email` text NOT NULL,
	`actor_type` text NOT NULL,
	`action` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text,
	`payload` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_audit_log`("id", "project_id", "actor_email", "actor_type", "action", "resource_type", "resource_id", "payload", "created_at") SELECT "id", "project_id", "actor_email", "actor_type", "action", "resource_type", "resource_id", "payload", "created_at" FROM `audit_log`;--> statement-breakpoint
DROP TABLE `audit_log`;--> statement-breakpoint
ALTER TABLE `__new_audit_log` RENAME TO `audit_log`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `audit_log_project` ON `audit_log` (`project_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_log_actor` ON `audit_log` (`actor_email`);--> statement-breakpoint
CREATE INDEX `audit_log_resource` ON `audit_log` (`resource_type`,`resource_id`);--> statement-breakpoint
CREATE TABLE `__new_cli_tokens` (
	`token_id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`user_email` text NOT NULL,
	`issued_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`last_used_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_cli_tokens`("token_id", "project_id", "user_email", "issued_at", "expires_at", "revoked_at", "last_used_at") SELECT "token_id", "project_id", "user_email", "issued_at", "expires_at", "revoked_at", "last_used_at" FROM `cli_tokens`;--> statement-breakpoint
DROP TABLE `cli_tokens`;--> statement-breakpoint
ALTER TABLE `__new_cli_tokens` RENAME TO `cli_tokens`;--> statement-breakpoint
CREATE INDEX `cli_tokens_project` ON `cli_tokens` (`project_id`);--> statement-breakpoint
CREATE INDEX `cli_tokens_expires` ON `cli_tokens` (`expires_at`);--> statement-breakpoint
DROP INDEX IF EXISTS `projects_stripe_subscription`;--> statement-breakpoint
DROP INDEX IF EXISTS `projects_stripe_customer`;--> statement-breakpoint
CREATE UNIQUE INDEX `projects_stripe_customer_id_unique` ON `projects` (`stripe_customer_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `projects_stripe_subscription_id_unique` ON `projects` (`stripe_subscription_id`);--> statement-breakpoint
CREATE TABLE `__new_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`value_type` text DEFAULT 'object' NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_configs`("id", "project_id", "name", "description", "value_type", "updated_at", "deleted_at") SELECT "id", "project_id", "name", "description", "value_type", "updated_at", "deleted_at" FROM `configs`;--> statement-breakpoint
DROP TABLE `configs`;--> statement-breakpoint
ALTER TABLE `__new_configs` RENAME TO `configs`;--> statement-breakpoint
CREATE UNIQUE INDEX `configs_project_name` ON `configs` (`project_id`,`name`) WHERE deleted_at is null;--> statement-breakpoint
CREATE TABLE `__new_events` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`properties` text DEFAULT '[]' NOT NULL,
	`pending` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_events`("id", "project_id", "name", "description", "properties", "pending", "created_at", "deleted_at") SELECT "id", "project_id", "name", "description", "properties", "pending", "created_at", "deleted_at" FROM `events`;--> statement-breakpoint
DROP TABLE `events`;--> statement-breakpoint
ALTER TABLE `__new_events` RENAME TO `events`;--> statement-breakpoint
CREATE INDEX `events_project` ON `events` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `events_project_name` ON `events` (`project_id`,`name`) WHERE deleted_at is null;--> statement-breakpoint
CREATE TABLE `__new_gates` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`rules` text NOT NULL,
	`rollout_pct` integer DEFAULT 0 NOT NULL,
	`salt` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`killswitch` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_gates`("id", "project_id", "name", "rules", "rollout_pct", "salt", "enabled", "killswitch", "updated_at", "deleted_at") SELECT "id", "project_id", "name", "rules", "rollout_pct", "salt", "enabled", "killswitch", "updated_at", "deleted_at" FROM `gates`;--> statement-breakpoint
DROP TABLE `gates`;--> statement-breakpoint
ALTER TABLE `__new_gates` RENAME TO `gates`;--> statement-breakpoint
CREATE INDEX `gates_project` ON `gates` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `gates_project_name` ON `gates` (`project_id`,`name`) WHERE deleted_at is null;--> statement-breakpoint
CREATE TABLE `__new_label_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`default_chunk_id` text,
	`created_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_label_profiles`("id", "project_id", "name", "default_chunk_id", "created_at", "deleted_at") SELECT "id", "project_id", "name", "default_chunk_id", "created_at", "deleted_at" FROM `label_profiles`;--> statement-breakpoint
DROP TABLE `label_profiles`;--> statement-breakpoint
ALTER TABLE `__new_label_profiles` RENAME TO `label_profiles`;--> statement-breakpoint
CREATE INDEX `label_profiles_project` ON `label_profiles` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `label_profiles_project_name` ON `label_profiles` (`project_id`,`name`) WHERE deleted_at is null;--> statement-breakpoint
CREATE TABLE `__new_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`event_name` text NOT NULL,
	`value_path` text,
	`aggregation` text DEFAULT 'count_users' NOT NULL,
	`winsorize_pct` integer DEFAULT 99 NOT NULL,
	`min_detectable_effect` real,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_metrics`("id", "project_id", "name", "event_name", "value_path", "aggregation", "winsorize_pct", "min_detectable_effect", "updated_at", "deleted_at") SELECT "id", "project_id", "name", "event_name", "value_path", "aggregation", "winsorize_pct", "min_detectable_effect", "updated_at", "deleted_at" FROM `metrics`;--> statement-breakpoint
DROP TABLE `metrics`;--> statement-breakpoint
ALTER TABLE `__new_metrics` RENAME TO `metrics`;--> statement-breakpoint
CREATE UNIQUE INDEX `metrics_project_name` ON `metrics` (`project_id`,`name`) WHERE deleted_at is null;--> statement-breakpoint
CREATE TABLE `__new_universes` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`unit_type` text DEFAULT 'user_id' NOT NULL,
	`holdout_range` text,
	`created_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_universes`("id", "project_id", "name", "unit_type", "holdout_range", "created_at", "deleted_at") SELECT "id", "project_id", "name", "unit_type", "holdout_range", "created_at", "deleted_at" FROM `universes`;--> statement-breakpoint
DROP TABLE `universes`;--> statement-breakpoint
ALTER TABLE `__new_universes` RENAME TO `universes`;--> statement-breakpoint
CREATE INDEX `universes_project` ON `universes` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `universes_project_name` ON `universes` (`project_id`,`name`) WHERE deleted_at is null;--> statement-breakpoint
CREATE TABLE `__new_user_attributes` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`enum_values` text,
	`required` integer DEFAULT 0 NOT NULL,
	`description` text,
	`sdk_path` text,
	`created_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_user_attributes`("id", "project_id", "name", "type", "enum_values", "required", "description", "sdk_path", "created_at", "deleted_at") SELECT "id", "project_id", "name", "type", "enum_values", "required", "description", "sdk_path", "created_at", "deleted_at" FROM `user_attributes`;--> statement-breakpoint
DROP TABLE `user_attributes`;--> statement-breakpoint
ALTER TABLE `__new_user_attributes` RENAME TO `user_attributes`;--> statement-breakpoint
CREATE INDEX `user_attributes_project` ON `user_attributes` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_attributes_project_name` ON `user_attributes` (`project_id`,`name`) WHERE deleted_at is null;--> statement-breakpoint
CREATE TABLE `__new_experiments` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`universe` text NOT NULL,
	`targeting_gate` text,
	`allocation_pct` integer DEFAULT 0 NOT NULL,
	`salt` text NOT NULL,
	`params` text NOT NULL,
	`groups` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`started_at` text,
	`stopped_at` text,
	`significance_threshold` real DEFAULT 0.05 NOT NULL,
	`min_runtime_days` integer DEFAULT 0 NOT NULL,
	`min_sample_size` integer DEFAULT 100 NOT NULL,
	`cuped_frozen_at` text,
	`sequential_testing` integer DEFAULT false NOT NULL,
	`hash_version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_experiments`("id", "project_id", "name", "universe", "targeting_gate", "allocation_pct", "salt", "params", "groups", "status", "started_at", "stopped_at", "significance_threshold", "min_runtime_days", "min_sample_size", "cuped_frozen_at", "sequential_testing", "hash_version", "updated_at") SELECT "id", "project_id", "name", "universe", "targeting_gate", "allocation_pct", "salt", "params", "groups", "status", "started_at", "stopped_at", "significance_threshold", "min_runtime_days", "min_sample_size", "cuped_frozen_at", "sequential_testing", "hash_version", "updated_at" FROM `experiments`;--> statement-breakpoint
DROP TABLE `experiments`;--> statement-breakpoint
ALTER TABLE `__new_experiments` RENAME TO `experiments`;--> statement-breakpoint
CREATE INDEX `experiments_project` ON `experiments` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `experiments_project_name` ON `experiments` (`project_id`,`name`);