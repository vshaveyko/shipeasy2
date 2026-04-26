-- Adds the project_members table — workspace members per project (1 owner + N members).
-- Owner is still tracked on `projects.owner_email`; this table holds the additional members.

CREATE TABLE `project_members` (
  `id` text PRIMARY KEY NOT NULL,
  `project_id` text NOT NULL,
  `email` text NOT NULL,
  `role` text DEFAULT 'editor' NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `invited_by_email` text NOT NULL,
  `invited_at` text NOT NULL,
  `accepted_at` text,
  `removed_at` text,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `project_members_project` ON `project_members` (`project_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_members_project_email` ON `project_members` (`project_id`,`email`);
