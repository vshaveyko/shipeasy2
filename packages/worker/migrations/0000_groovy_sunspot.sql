CREATE TABLE `analysis_failures` (
	`project_id` text PRIMARY KEY NOT NULL,
	`failed_at` text NOT NULL,
	`retry_count` integer DEFAULT 3 NOT NULL,
	`message_body` text,
	`resolved_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`actor_email` text NOT NULL,
	`actor_type` text NOT NULL,
	`action` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text,
	`payload` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `audit_log_project` ON `audit_log` (`project_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_log_actor` ON `audit_log` (`actor_email`);--> statement-breakpoint
CREATE INDEX `audit_log_resource` ON `audit_log` (`resource_type`,`resource_id`);--> statement-breakpoint
CREATE TABLE `cli_auth_sessions` (
	`state` text PRIMARY KEY NOT NULL,
	`code_challenge` text NOT NULL,
	`project_id` text,
	`token_hash` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `cli_auth_sessions_expires` ON `cli_auth_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `cli_tokens` (
	`token_id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`user_email` text NOT NULL,
	`issued_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`last_used_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `cli_tokens_project` ON `cli_tokens` (`project_id`);--> statement-breakpoint
CREATE INDEX `cli_tokens_expires` ON `cli_tokens` (`expires_at`);--> statement-breakpoint
CREATE TABLE `configs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`value_json` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `configs_project_name` ON `configs` (`project_id`,`name`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`properties` text DEFAULT '[]' NOT NULL,
	`pending` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_project` ON `events` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `events_project_name` ON `events` (`project_id`,`name`);--> statement-breakpoint
CREATE TABLE `experiment_metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`experiment_id` text NOT NULL,
	`metric_id` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`experiment_id`) REFERENCES `experiments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`metric_id`) REFERENCES `metrics`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exp_metrics_uniq` ON `experiment_metrics` (`experiment_id`,`metric_id`);--> statement-breakpoint
CREATE TABLE `experiment_results` (
	`project_id` text NOT NULL,
	`experiment` text NOT NULL,
	`metric` text NOT NULL,
	`group_name` text NOT NULL,
	`ds` text NOT NULL,
	`n` integer,
	`mean` real,
	`variance` real,
	`delta` real,
	`delta_pct` real,
	`ci_95_low` real,
	`ci_95_high` real,
	`ci_99_low` real,
	`ci_99_high` real,
	`p_value` real,
	`expected_n` integer,
	`srm_p_value` real,
	`srm_detected` integer DEFAULT 0 NOT NULL,
	`msprt_lambda` real,
	`msprt_significant` integer,
	`is_final` integer DEFAULT 0 NOT NULL,
	`peek_warning` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`project_id`, `experiment`, `metric`, `group_name`, `ds`)
);
--> statement-breakpoint
CREATE INDEX `experiment_results_ds` ON `experiment_results` (`project_id`,`ds`);--> statement-breakpoint
CREATE TABLE `experiments` (
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
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `experiments_project` ON `experiments` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `experiments_project_name` ON `experiments` (`project_id`,`name`);--> statement-breakpoint
CREATE TABLE `gates` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`rules` text NOT NULL,
	`rollout_pct` integer DEFAULT 0 NOT NULL,
	`salt` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`killswitch` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `gates_project` ON `gates` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `gates_project_name` ON `gates` (`project_id`,`name`);--> statement-breakpoint
CREATE TABLE `metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`event_name` text NOT NULL,
	`value_path` text,
	`aggregation` text DEFAULT 'count_users' NOT NULL,
	`winsorize_pct` integer DEFAULT 99 NOT NULL,
	`min_detectable_effect` real,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `metrics_project_name` ON `metrics` (`project_id`,`name`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner_email` text NOT NULL,
	`plan` text DEFAULT 'free' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_owner_email_unique` ON `projects` (`owner_email`);--> statement-breakpoint
CREATE TABLE `sdk_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`key_hash` text NOT NULL,
	`type` text NOT NULL,
	`created_at` text NOT NULL,
	`revoked_at` text,
	`expires_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sdk_keys_key_hash_unique` ON `sdk_keys` (`key_hash`);--> statement-breakpoint
CREATE INDEX `sdk_keys_hash` ON `sdk_keys` (`key_hash`);--> statement-breakpoint
CREATE TABLE `system_health` (
	`key` text PRIMARY KEY NOT NULL,
	`last_fired_at` text NOT NULL,
	`projects_enqueued` integer
);
--> statement-breakpoint
CREATE TABLE `universes` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`unit_type` text DEFAULT 'user_id' NOT NULL,
	`holdout_range` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `universes_project` ON `universes` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `universes_project_name` ON `universes` (`project_id`,`name`);--> statement-breakpoint
CREATE TABLE `user_aliases` (
	`project_id` text NOT NULL,
	`anonymous_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`project_id`, `anonymous_id`)
);
--> statement-breakpoint
CREATE INDEX `user_aliases_user` ON `user_aliases` (`project_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `user_attributes` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`enum_values` text,
	`required` integer DEFAULT 0 NOT NULL,
	`description` text,
	`sdk_path` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `user_attributes_project` ON `user_attributes` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_attributes_project_name` ON `user_attributes` (`project_id`,`name`);--> statement-breakpoint
CREATE TABLE `user_metric_baseline` (
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`metric_name` text NOT NULL,
	`avg_value` real NOT NULL,
	`updated_ds` text NOT NULL,
	PRIMARY KEY(`project_id`, `user_id`, `metric_name`)
);
