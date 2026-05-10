-- Per-user account state. Tracks terms-of-service acceptance and onboarding
-- completion so first-login users can be routed through `/onboarding/*`.
-- Keyed by normalized lowercase email to align with projects.owner_email and
-- project_members.email.
CREATE TABLE `users` (
	`email` text PRIMARY KEY NOT NULL,
	`terms_accepted_at` text,
	`terms_version` text,
	`onboarding_completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
-- Grandfather every email that already exists in the system: owners of any
-- project plus anyone listed on project_members. They've effectively accepted
-- terms by using the product, so we mark them with a sentinel version
-- ('grandfathered') — a later bump of CURRENT_TERMS_VERSION will re-prompt
-- them, but today's deploy doesn't gate them at the door.
INSERT OR IGNORE INTO `users` (`email`, `terms_accepted_at`, `terms_version`, `onboarding_completed_at`, `created_at`, `updated_at`)
SELECT
	`email`,
	strftime('%Y-%m-%dT%H:%M:%fZ', 'now') AS terms_accepted_at,
	'grandfathered' AS terms_version,
	strftime('%Y-%m-%dT%H:%M:%fZ', 'now') AS onboarding_completed_at,
	strftime('%Y-%m-%dT%H:%M:%fZ', 'now') AS created_at,
	strftime('%Y-%m-%dT%H:%M:%fZ', 'now') AS updated_at
FROM (
	SELECT DISTINCT lower(`owner_email`) AS `email` FROM `projects` WHERE `owner_email` IS NOT NULL
	UNION
	SELECT DISTINCT lower(`email`) AS `email` FROM `project_members` WHERE `email` IS NOT NULL
);
