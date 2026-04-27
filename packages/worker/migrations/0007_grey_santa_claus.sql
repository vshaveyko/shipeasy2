-- Partial unique indexes: exclude soft-deleted rows from the uniqueness constraint
-- so a name can be reused after a resource is deleted.

DROP INDEX IF EXISTS `gates_project_name`;
CREATE UNIQUE INDEX `gates_project_name` ON `gates` (`project_id`, `name`) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS `configs_project_name`;
CREATE UNIQUE INDEX `configs_project_name` ON `configs` (`project_id`, `name`) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS `universes_project_name`;
CREATE UNIQUE INDEX `universes_project_name` ON `universes` (`project_id`, `name`) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS `events_project_name`;
CREATE UNIQUE INDEX `events_project_name` ON `events` (`project_id`, `name`) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS `metrics_project_name`;
CREATE UNIQUE INDEX `metrics_project_name` ON `metrics` (`project_id`, `name`) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS `user_attributes_project_name`;
CREATE UNIQUE INDEX `user_attributes_project_name` ON `user_attributes` (`project_id`, `name`) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS `label_profiles_project_name`;
CREATE UNIQUE INDEX `label_profiles_project_name` ON `label_profiles` (`project_id`, `name`) WHERE deleted_at IS NULL;
