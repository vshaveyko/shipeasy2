-- Multi-project support: a single owner email may now own many projects, so
-- the `projects_owner_email_unique` index from migration 0000 has to go.
-- Without this drop, `INSERT INTO projects` from /dashboard/projects/new
-- fails with `UNIQUE constraint failed: projects.owner_email` whenever the
-- signed-in user already has the JWT-auto-created project.
DROP INDEX IF EXISTS `projects_owner_email_unique`;
