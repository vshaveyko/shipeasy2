-- Billing: simplify plan enum to free/paid, add Stripe subscription columns,
-- add billing_events table for idempotent webhook handling.

-- Migrate existing plan values: pro/premium/enterprise → paid
UPDATE projects SET plan = 'paid' WHERE plan IN ('pro', 'premium', 'enterprise');

-- Add Stripe subscription columns to projects
-- NOTE: SQLite does not allow UNIQUE on ALTER TABLE ADD COLUMN; indexes are added below.
ALTER TABLE projects ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE projects ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE projects ADD COLUMN stripe_item_id_base TEXT;
ALTER TABLE projects ADD COLUMN stripe_item_id_experiments TEXT;
ALTER TABLE projects ADD COLUMN stripe_item_id_gates TEXT;
ALTER TABLE projects ADD COLUMN stripe_item_id_configs TEXT;
ALTER TABLE projects ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE projects ADD COLUMN current_period_end TEXT;
ALTER TABLE projects ADD COLUMN trial_ends_at TEXT;
ALTER TABLE projects ADD COLUMN cancel_at_period_end INTEGER NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN billing_interval TEXT NOT NULL DEFAULT 'monthly';

-- billing_events — keyed on Stripe event ID for INSERT OR IGNORE idempotency
CREATE TABLE `billing_events` (
  `id` TEXT PRIMARY KEY,
  `project_id` TEXT REFERENCES `projects`(`id`) ON DELETE SET NULL,
  `type` TEXT NOT NULL,
  `payload` TEXT NOT NULL,
  `received_at` TEXT NOT NULL
);

CREATE INDEX `billing_events_project` ON `billing_events` (`project_id`);

CREATE UNIQUE INDEX `projects_stripe_customer` ON `projects` (`stripe_customer_id`) WHERE `stripe_customer_id` IS NOT NULL;
CREATE UNIQUE INDEX `projects_stripe_subscription` ON `projects` (`stripe_subscription_id`) WHERE `stripe_subscription_id` IS NOT NULL;
