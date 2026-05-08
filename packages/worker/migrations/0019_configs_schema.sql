ALTER TABLE `configs` ADD `schema_json` text DEFAULT '{"type":"object","properties":{},"additionalProperties":true}' NOT NULL;
--> statement-breakpoint
UPDATE `config_values` SET `value_json` = json_object('value', json(`value_json`)) WHERE json_type(`value_json`) != 'object';
--> statement-breakpoint
UPDATE `config_drafts` SET `value_json` = json_object('value', json(`value_json`)) WHERE json_type(`value_json`) != 'object';
--> statement-breakpoint
ALTER TABLE `configs` DROP COLUMN `value_type`;
