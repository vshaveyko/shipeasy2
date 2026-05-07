CREATE TABLE `connectors` (
    `id` text PRIMARY KEY NOT NULL,
    `project_id` text NOT NULL,
    `provider` text NOT NULL,
    `name` text NOT NULL,
    `enabled` integer DEFAULT 1 NOT NULL,
    `events` text NOT NULL,
    `config` text NOT NULL,
    `credentials_cipher` text,
    `account_label` text,
    `created_at` text NOT NULL,
    `updated_at` text NOT NULL,
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `connectors_project` ON `connectors` (`project_id`,`provider`);
