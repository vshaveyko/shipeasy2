-- Track which human minted each admin SDK key so we can authorize
-- cross-project --project overrides by joining project_members.
ALTER TABLE `sdk_keys` ADD COLUMN `created_by_email` text;
