ALTER TABLE `projects` ADD `module_translations` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE `projects` ADD `module_configs` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE `projects` ADD `module_gates` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE `projects` ADD `module_experiments` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE `projects` ADD `module_feedback` integer DEFAULT 1 NOT NULL;
