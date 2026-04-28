PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`domain` text,
	`owner_email` text NOT NULL,
	`plan` text DEFAULT 'free' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`stripe_customer_id` text,
	`stripe_subscription_id` text,
	`stripe_item_id_base` text,
	`stripe_item_id_experiments` text,
	`stripe_item_id_gates` text,
	`stripe_item_id_configs` text,
	`subscription_status` text DEFAULT 'none' NOT NULL,
	`current_period_end` text,
	`trial_ends_at` text,
	`cancel_at_period_end` integer DEFAULT 0 NOT NULL,
	`billing_interval` text DEFAULT 'monthly' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_projects` SELECT * FROM `projects`;
--> statement-breakpoint
DROP TABLE `projects`;
--> statement-breakpoint
ALTER TABLE `__new_projects` RENAME TO `projects`;
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_stripe_customer_id_unique` ON `projects` (`stripe_customer_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_stripe_subscription_id_unique` ON `projects` (`stripe_subscription_id`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
