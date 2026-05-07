-- One project per (owner_email, domain): a single account can't accidentally
-- create two projects pointing at the same site. Multi-project per owner is
-- still allowed across different domains. SQLite treats each NULL as
-- distinct under UNIQUE, so projects with NULL domain (no configured site)
-- can still coexist for the same owner.
--
-- If this migration fails to apply, the database already contains duplicate
-- (owner_email, domain) pairs and the offenders need to be merged or
-- soft-deleted by hand before re-running.
CREATE UNIQUE INDEX `projects_owner_domain_uniq` ON `projects` (`owner_email`, `domain`);
