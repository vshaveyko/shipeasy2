-- Bug reports + feature requests filed via the in-page devtools nub,
-- plus attachments (screenshots, screen recordings, uploaded files) stored in R2.

CREATE TABLE `bug_reports` (
  `id` text PRIMARY KEY NOT NULL,
  `project_id` text NOT NULL,
  `title` text NOT NULL,
  `steps_to_reproduce` text DEFAULT '' NOT NULL,
  `actual_result` text DEFAULT '' NOT NULL,
  `expected_result` text DEFAULT '' NOT NULL,
  `status` text DEFAULT 'open' NOT NULL,
  `reporter_email` text,
  `page_url` text,
  `user_agent` text,
  `viewport` text,
  `context` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `bug_reports_project` ON `bug_reports` (`project_id`,`status`);--> statement-breakpoint
CREATE INDEX `bug_reports_created` ON `bug_reports` (`project_id`,`created_at`);--> statement-breakpoint

CREATE TABLE `feature_requests` (
  `id` text PRIMARY KEY NOT NULL,
  `project_id` text NOT NULL,
  `title` text NOT NULL,
  `description` text DEFAULT '' NOT NULL,
  `use_case` text DEFAULT '' NOT NULL,
  `importance` text DEFAULT 'nice_to_have' NOT NULL,
  `status` text DEFAULT 'open' NOT NULL,
  `reporter_email` text,
  `page_url` text,
  `user_agent` text,
  `context` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `feature_requests_project` ON `feature_requests` (`project_id`,`status`);--> statement-breakpoint
CREATE INDEX `feature_requests_created` ON `feature_requests` (`project_id`,`created_at`);--> statement-breakpoint

CREATE TABLE `report_attachments` (
  `id` text PRIMARY KEY NOT NULL,
  `project_id` text NOT NULL,
  `report_kind` text NOT NULL,
  `report_id` text NOT NULL,
  `kind` text NOT NULL,
  `filename` text NOT NULL,
  `mime_type` text NOT NULL,
  `size_bytes` integer NOT NULL,
  `r2_key` text NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `report_attachments_report` ON `report_attachments` (`project_id`,`report_kind`,`report_id`);
