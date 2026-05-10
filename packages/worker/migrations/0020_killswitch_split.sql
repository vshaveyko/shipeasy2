-- Split killswitches out of gates: drop the legacy column on `gates` and
-- introduce a `kind` discriminator on `configs` so killswitches ride the
-- existing config delivery infra (one KV blob, one publish path).
ALTER TABLE `gates` DROP COLUMN `killswitch`;
--> statement-breakpoint
ALTER TABLE `configs` ADD `kind` text DEFAULT 'config' NOT NULL;
--> statement-breakpoint
-- Enforce folder.name everywhere by normalising legacy names.
-- Single-segment names get an explicit `_default.` folder.
UPDATE `configs`
  SET `name` = '_default.' || `name`
  WHERE `name` NOT LIKE '%.%' AND `deleted_at` IS NULL;
--> statement-breakpoint
-- Names with 3+ segments collapse trailing dots into `_` so we end up with
-- exactly one separator (folder.name). e.g. `a.b.c` → `a.b_c`.
UPDATE `configs`
  SET `name` = substr(`name`, 1, instr(`name`, '.'))
            || replace(substr(`name`, instr(`name`, '.') + 1), '.', '_')
  WHERE `name` LIKE '%.%.%' AND `deleted_at` IS NULL;
