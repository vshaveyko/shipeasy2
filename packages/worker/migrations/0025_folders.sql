-- Folders: flat per-entity grouping primitive across the flag platform.
-- Each entity gains a nullable `folder` text column. The (project_id, name)
-- unique index becomes (project_id, coalesce(folder,''), name) so the same
-- name can live in different folders. A non-unique (project_id, folder)
-- index supports list grouping + folder-distinct queries.
--
-- For experiments: `tag` is replaced by `folder`. Existing tag values are
-- migrated row-wise into folder, then the tag column is dropped.
--
-- Gates already has `folder` (added in 0021_gatekeepers.sql); only its
-- unique index is rebuilt here.

-- ─── Add folder columns ──────────────────────────────────────────────
ALTER TABLE `configs` ADD `folder` text;
--> statement-breakpoint
ALTER TABLE `universes` ADD `folder` text;
--> statement-breakpoint
ALTER TABLE `experiments` ADD `folder` text;
--> statement-breakpoint
ALTER TABLE `metrics` ADD `folder` text;
--> statement-breakpoint
ALTER TABLE `events` ADD `folder` text;
--> statement-breakpoint

-- ─── Migrate experiments.tag → folder, drop tag ──────────────────────
UPDATE `experiments` SET `folder` = `tag` WHERE `tag` IS NOT NULL AND `folder` IS NULL;
--> statement-breakpoint
ALTER TABLE `experiments` DROP COLUMN `tag`;
--> statement-breakpoint

-- ─── Rebuild unique indexes to include folder ────────────────────────
DROP INDEX IF EXISTS `gates_project_name`;
--> statement-breakpoint
CREATE UNIQUE INDEX `gates_project_folder_name`
  ON `gates` (`project_id`, coalesce(`folder`, ''), `name`)
  WHERE `deleted_at` IS NULL;
--> statement-breakpoint

DROP INDEX IF EXISTS `configs_project_name`;
--> statement-breakpoint
CREATE UNIQUE INDEX `configs_project_folder_name`
  ON `configs` (`project_id`, coalesce(`folder`, ''), `name`)
  WHERE `deleted_at` IS NULL;
--> statement-breakpoint

-- Universes keep (project_id, name) uniqueness — folder is metadata only,
-- since experiment.universe references universe by bare name.

DROP INDEX IF EXISTS `experiments_project_name`;
--> statement-breakpoint
CREATE UNIQUE INDEX `experiments_project_folder_name`
  ON `experiments` (`project_id`, coalesce(`folder`, ''), `name`);
--> statement-breakpoint

DROP INDEX IF EXISTS `metrics_project_name`;
--> statement-breakpoint
CREATE UNIQUE INDEX `metrics_project_folder_name`
  ON `metrics` (`project_id`, coalesce(`folder`, ''), `name`)
  WHERE `deleted_at` IS NULL;
--> statement-breakpoint

DROP INDEX IF EXISTS `events_project_name`;
--> statement-breakpoint
CREATE UNIQUE INDEX `events_project_folder_name`
  ON `events` (`project_id`, coalesce(`folder`, ''), `name`)
  WHERE `deleted_at` IS NULL;
--> statement-breakpoint

-- ─── Non-unique grouping indexes ─────────────────────────────────────
CREATE INDEX `gates_project_folder`       ON `gates`       (`project_id`, `folder`);
--> statement-breakpoint
CREATE INDEX `configs_project_folder`     ON `configs`     (`project_id`, `folder`);
--> statement-breakpoint
CREATE INDEX `universes_project_folder`   ON `universes`   (`project_id`, `folder`);
--> statement-breakpoint
CREATE INDEX `experiments_project_folder` ON `experiments` (`project_id`, `folder`);
--> statement-breakpoint
CREATE INDEX `metrics_project_folder`     ON `metrics`     (`project_id`, `folder`);
--> statement-breakpoint
CREATE INDEX `events_project_folder`      ON `events`      (`project_id`, `folder`);
