-- Idempotent seed for the local miniflare D1 database used by `next dev`.
--
-- Populates all five list-view surfaces (gates, killswitches, configs,
-- experiments, metrics) plus their supporting rows (universes, events,
-- user_attributes) for a single project.
--
-- Invoked through scripts/seed-local-d1.sh which substitutes __PROJECT_ID__
-- with the target project id and pipes the file into `sqlite3`.
--
-- Re-runnable: every statement is INSERT OR IGNORE (top-level rows keyed
-- by stable seed-* ids) or INSERT OR REPLACE (versioned config_values keyed
-- by (config_id, env, version)). No deletes.

BEGIN;

-- ── Universes ──────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO universes (id, project_id, name, unit_type, holdout_range, created_at)
VALUES
  ('seed-uni-default',     '__PROJECT_ID__', 'default',          'user_id', NULL, '2026-04-01T00:00:00.000Z'),
  ('seed-uni-loggedin',    '__PROJECT_ID__', 'logged_in_users',  'user_id', NULL, '2026-04-01T00:00:00.000Z'),
  ('seed-uni-checkout',    '__PROJECT_ID__', 'checkout_visitors','user_id', '[9000,10000]', '2026-04-01T00:00:00.000Z');

-- ── User attributes (drives gate rule editor) ──────────────────────────────
INSERT OR IGNORE INTO user_attributes (id, project_id, name, type, enum_values, required, description, sdk_path, created_at)
VALUES
  ('seed-attr-plan',       '__PROJECT_ID__', 'plan',       'enum',    '["free","pro","enterprise"]', 0, 'Billing plan',           'user.plan',       '2026-04-01T00:00:00.000Z'),
  ('seed-attr-country',    '__PROJECT_ID__', 'country',    'string',  NULL,                          0, 'ISO-2 country code',     'user.country',    '2026-04-01T00:00:00.000Z'),
  ('seed-attr-beta',       '__PROJECT_ID__', 'beta_user',  'boolean', NULL,                          0, 'Opted into beta program','user.beta_user',  '2026-04-01T00:00:00.000Z'),
  ('seed-attr-signupage',  '__PROJECT_ID__', 'signup_age_days', 'number', NULL,                      0, 'Days since signup',      'user.signup_age', '2026-04-01T00:00:00.000Z');

-- ── Gates ──────────────────────────────────────────────────────────────────
-- 1. premium_features — 50% rollout, plan=pro rule, enabled
INSERT OR IGNORE INTO gates (id, project_id, name, rules, rollout_pct, salt, enabled, title, description, folder, group_name, owner_email, stack, updated_at)
VALUES (
  'seed-gate-premium',
  '__PROJECT_ID__',
  'premium_features',
  '[{"attr":"user.plan","op":"in","value":["pro","enterprise"]}]',
  5000,
  'seed-salt-premium',
  1,
  'Premium feature gate',
  'Locks the new premium dashboard behind pro/enterprise + 50% rollout to those users.',
  'billing',
  'growth',
  'seed@shipeasy.local',
  '[{"id":"e1","type":"condition","name":"Pro tier only","pass":"all","rules":[{"attr":"user.plan","op":"in","value":["pro","enterprise"]}]},{"id":"e2","type":"rollout","rolloutPct":5000,"bucketBy":"user_id","salt":"public","locked":true}]',
  '2026-05-10T12:00:00.000Z'
);

-- 2. beta_dashboard — 10% rollout, no rule, enabled
INSERT OR IGNORE INTO gates (id, project_id, name, rules, rollout_pct, salt, enabled, title, description, folder, group_name, owner_email, stack, updated_at)
VALUES (
  'seed-gate-betadash',
  '__PROJECT_ID__',
  'beta_dashboard',
  '[]',
  1000,
  'seed-salt-betadash',
  1,
  'Beta dashboard',
  'Soft launch of the new admin dashboard layout.',
  'growth',
  'product',
  'seed@shipeasy.local',
  '[{"id":"e1","type":"rollout","rolloutPct":1000,"bucketBy":"user_id","salt":"public","locked":true}]',
  '2026-05-12T09:30:00.000Z'
);

-- 3. new_checkout — 0% (draft), disabled
INSERT OR IGNORE INTO gates (id, project_id, name, rules, rollout_pct, salt, enabled, title, description, folder, group_name, owner_email, stack, updated_at)
VALUES (
  'seed-gate-newcheckout',
  '__PROJECT_ID__',
  'new_checkout',
  '[{"attr":"user.country","op":"eq","value":"US"}]',
  0,
  'seed-salt-newcheckout',
  0,
  'New checkout flow',
  'US-only kill-disabled gate for the redesigned checkout. Flip on once QA signs off.',
  'checkout',
  'commerce',
  'seed@shipeasy.local',
  '[{"id":"e1","type":"condition","name":"US only","pass":"all","rules":[{"attr":"user.country","op":"eq","value":"US"}]},{"id":"e2","type":"rollout","rolloutPct":0,"bucketBy":"user_id","salt":"public","locked":true}]',
  '2026-05-14T15:15:00.000Z'
);

-- 4. holiday_promo — 100%, enabled
INSERT OR IGNORE INTO gates (id, project_id, name, rules, rollout_pct, salt, enabled, title, description, folder, group_name, owner_email, stack, updated_at)
VALUES (
  'seed-gate-holiday',
  '__PROJECT_ID__',
  'holiday_promo',
  '[]',
  10000,
  'seed-salt-holiday',
  1,
  'Holiday promo banner',
  'Site-wide 100% holiday banner.',
  'marketing',
  'marketing',
  'seed@shipeasy.local',
  '[{"id":"e1","type":"rollout","rolloutPct":10000,"bucketBy":"user_id","salt":"public","locked":true}]',
  '2026-05-15T18:00:00.000Z'
);

-- 5. high_risk_users — condition only, 100%, enabled
INSERT OR IGNORE INTO gates (id, project_id, name, rules, rollout_pct, salt, enabled, title, description, folder, group_name, owner_email, stack, updated_at)
VALUES (
  'seed-gate-highrisk',
  '__PROJECT_ID__',
  'high_risk_users',
  '[{"attr":"user.signup_age_days","op":"lt","value":7}]',
  10000,
  'seed-salt-highrisk',
  1,
  'High-risk users',
  'Newly-signed-up accounts (<7 days). Used by abuse review.',
  'safety',
  'trust-safety',
  'seed@shipeasy.local',
  '[{"id":"e1","type":"condition","name":"<7 day accounts","pass":"all","rules":[{"attr":"user.signup_age_days","op":"lt","value":7}]},{"id":"e2","type":"rollout","rolloutPct":10000,"bucketBy":"user_id","salt":"public","locked":true}]',
  '2026-05-15T18:00:00.000Z'
);

-- ── Configs (regular) ──────────────────────────────────────────────────────
-- pricing.tiers — live across all 3 envs
INSERT OR IGNORE INTO configs (id, project_id, name, description, kind, schema_json, updated_at)
VALUES (
  'seed-cfg-pricing',
  '__PROJECT_ID__',
  'pricing.tiers',
  'Per-tier price + included seats. Edited by growth weekly.',
  'config',
  '{"type":"object","properties":{"free_seats":{"type":"number"},"pro_price":{"type":"number"},"enterprise_price":{"type":"number"},"trial_days":{"type":"number"}},"required":["pro_price"],"additionalProperties":false}',
  '2026-05-10T12:00:00.000Z'
);

INSERT OR REPLACE INTO config_values (id, project_id, config_id, env, value_json, version, published_at, published_by) VALUES
  ('seed-cfg-pricing-v-dev',     '__PROJECT_ID__', 'seed-cfg-pricing', 'dev',     '{"free_seats":3,"pro_price":29,"enterprise_price":299,"trial_days":14}', 1, '2026-05-10T12:00:00.000Z', 'seed@shipeasy.local'),
  ('seed-cfg-pricing-v-staging', '__PROJECT_ID__', 'seed-cfg-pricing', 'staging', '{"free_seats":3,"pro_price":29,"enterprise_price":299,"trial_days":14}', 1, '2026-05-10T12:00:00.000Z', 'seed@shipeasy.local'),
  ('seed-cfg-pricing-v-prod',    '__PROJECT_ID__', 'seed-cfg-pricing', 'prod',    '{"free_seats":3,"pro_price":29,"enterprise_price":299,"trial_days":14}', 1, '2026-05-10T12:00:00.000Z', 'seed@shipeasy.local');

-- nav.menu — partial (dev + staging only)
INSERT OR IGNORE INTO configs (id, project_id, name, description, kind, schema_json, updated_at)
VALUES (
  'seed-cfg-navmenu',
  '__PROJECT_ID__',
  'nav.menu',
  'Top-level navigation items. Order matters.',
  'config',
  '{"type":"object","properties":{"items":{"type":"array","items":{"type":"object","properties":{"label":{"type":"string"},"href":{"type":"string"}}}}},"required":["items"]}',
  '2026-05-13T10:00:00.000Z'
);

INSERT OR REPLACE INTO config_values (id, project_id, config_id, env, value_json, version, published_at, published_by) VALUES
  ('seed-cfg-navmenu-v-dev',     '__PROJECT_ID__', 'seed-cfg-navmenu', 'dev',     '{"items":[{"label":"Home","href":"/"},{"label":"Docs","href":"/docs"},{"label":"Pricing","href":"/pricing"}]}', 1, '2026-05-13T10:00:00.000Z', 'seed@shipeasy.local'),
  ('seed-cfg-navmenu-v-staging', '__PROJECT_ID__', 'seed-cfg-navmenu', 'staging', '{"items":[{"label":"Home","href":"/"},{"label":"Docs","href":"/docs"},{"label":"Pricing","href":"/pricing"}]}', 1, '2026-05-13T10:00:00.000Z', 'seed@shipeasy.local');

-- home.hero — empty (no envs published)
INSERT OR IGNORE INTO configs (id, project_id, name, description, kind, schema_json, updated_at)
VALUES (
  'seed-cfg-hero',
  '__PROJECT_ID__',
  'home.hero',
  'Homepage hero copy + CTA. Draft only.',
  'config',
  '{"type":"object","properties":{"headline":{"type":"string"},"sub":{"type":"string"},"cta_label":{"type":"string"},"cta_href":{"type":"string"}},"required":["headline","cta_label"]}',
  '2026-05-15T11:00:00.000Z'
);

-- search.weights — live across all envs
INSERT OR IGNORE INTO configs (id, project_id, name, description, kind, schema_json, updated_at)
VALUES (
  'seed-cfg-search',
  '__PROJECT_ID__',
  'search.weights',
  'Ranking weights for the in-app search bar.',
  'config',
  '{"type":"object","properties":{"title":{"type":"number"},"body":{"type":"number"},"recency":{"type":"number"}},"required":["title","body"]}',
  '2026-05-08T09:00:00.000Z'
);

INSERT OR REPLACE INTO config_values (id, project_id, config_id, env, value_json, version, published_at, published_by) VALUES
  ('seed-cfg-search-v-dev',     '__PROJECT_ID__', 'seed-cfg-search', 'dev',     '{"title":3,"body":1,"recency":0.5}',  1, '2026-05-08T09:00:00.000Z', 'seed@shipeasy.local'),
  ('seed-cfg-search-v-staging', '__PROJECT_ID__', 'seed-cfg-search', 'staging', '{"title":3,"body":1,"recency":0.5}',  1, '2026-05-08T09:00:00.000Z', 'seed@shipeasy.local'),
  ('seed-cfg-search-v-prod',    '__PROJECT_ID__', 'seed-cfg-search', 'prod',    '{"title":2,"body":1,"recency":1.0}',  1, '2026-05-08T09:00:00.000Z', 'seed@shipeasy.local');

-- ── Killswitches (configs with kind='killswitch') ──────────────────────────
-- checkout.payments_off — OFF default, no switches
INSERT OR IGNORE INTO configs (id, project_id, name, description, kind, schema_json, updated_at)
VALUES (
  'seed-ks-payments',
  '__PROJECT_ID__',
  'checkout.payments_off',
  'Master switch for the checkout payments page. Flip to true to short-circuit to the error fallback.',
  'killswitch',
  '{"type":"object","properties":{"value":{"type":"boolean"},"switches":{"type":"object","additionalProperties":{"type":"boolean"}}},"required":["value"],"additionalProperties":false}',
  '2026-05-09T14:00:00.000Z'
);

INSERT OR REPLACE INTO config_values (id, project_id, config_id, env, value_json, version, published_at, published_by) VALUES
  ('seed-ks-payments-v-dev',     '__PROJECT_ID__', 'seed-ks-payments', 'dev',     '{"value":false}', 1, '2026-05-09T14:00:00.000Z', 'seed@shipeasy.local'),
  ('seed-ks-payments-v-staging', '__PROJECT_ID__', 'seed-ks-payments', 'staging', '{"value":false}', 1, '2026-05-09T14:00:00.000Z', 'seed@shipeasy.local'),
  ('seed-ks-payments-v-prod',    '__PROJECT_ID__', 'seed-ks-payments', 'prod',    '{"value":false}', 1, '2026-05-09T14:00:00.000Z', 'seed@shipeasy.local');

-- search.legacy — OFF default with per-region switches
INSERT OR IGNORE INTO configs (id, project_id, name, description, kind, schema_json, updated_at)
VALUES (
  'seed-ks-legacysearch',
  '__PROJECT_ID__',
  'search.legacy',
  'Force the legacy search backend per region. Default OFF (new backend live).',
  'killswitch',
  '{"type":"object","properties":{"value":{"type":"boolean"},"switches":{"type":"object","additionalProperties":{"type":"boolean"}}},"required":["value"],"additionalProperties":false}',
  '2026-05-11T10:30:00.000Z'
);

INSERT OR REPLACE INTO config_values (id, project_id, config_id, env, value_json, version, published_at, published_by) VALUES
  ('seed-ks-legacysearch-v-dev',     '__PROJECT_ID__', 'seed-ks-legacysearch', 'dev',     '{"value":false,"switches":{"us":false,"eu":false,"apac":false}}', 1, '2026-05-11T10:30:00.000Z', 'seed@shipeasy.local'),
  ('seed-ks-legacysearch-v-staging', '__PROJECT_ID__', 'seed-ks-legacysearch', 'staging', '{"value":false,"switches":{"us":false,"eu":false,"apac":false}}', 1, '2026-05-11T10:30:00.000Z', 'seed@shipeasy.local'),
  ('seed-ks-legacysearch-v-prod',    '__PROJECT_ID__', 'seed-ks-legacysearch', 'prod',    '{"value":false,"switches":{"us":false,"eu":true,"apac":false}}',  1, '2026-05-11T10:30:00.000Z', 'seed@shipeasy.local');

-- api.rate_limit_emergency — currently ON in prod, OFF elsewhere
INSERT OR IGNORE INTO configs (id, project_id, name, description, kind, schema_json, updated_at)
VALUES (
  'seed-ks-ratelimit',
  '__PROJECT_ID__',
  'api.rate_limit_emergency',
  'Tighter rate limits during an outage. Currently ON in prod after the May 14 incident.',
  'killswitch',
  '{"type":"object","properties":{"value":{"type":"boolean"},"switches":{"type":"object","additionalProperties":{"type":"boolean"}}},"required":["value"],"additionalProperties":false}',
  '2026-05-14T22:00:00.000Z'
);

INSERT OR REPLACE INTO config_values (id, project_id, config_id, env, value_json, version, published_at, published_by) VALUES
  ('seed-ks-ratelimit-v-dev',     '__PROJECT_ID__', 'seed-ks-ratelimit', 'dev',     '{"value":false}', 1, '2026-05-14T22:00:00.000Z', 'seed@shipeasy.local'),
  ('seed-ks-ratelimit-v-staging', '__PROJECT_ID__', 'seed-ks-ratelimit', 'staging', '{"value":false}', 1, '2026-05-14T22:00:00.000Z', 'seed@shipeasy.local'),
  ('seed-ks-ratelimit-v-prod',    '__PROJECT_ID__', 'seed-ks-ratelimit', 'prod',    '{"value":true}',  1, '2026-05-14T22:00:00.000Z', 'seed@shipeasy.local');

-- ── Events (declared events catalog) ───────────────────────────────────────
INSERT OR IGNORE INTO events (id, project_id, name, description, properties, pending, created_at)
VALUES
  ('seed-evt-pageview',  '__PROJECT_ID__', 'page_view',
   'Page rendered to the user.',
   '[{"name":"path","type":"string","required":true,"description":"Route path"},{"name":"referrer","type":"string","required":false,"description":"document.referrer"}]',
   0, '2026-04-15T00:00:00.000Z'),
  ('seed-evt-signup',    '__PROJECT_ID__', 'signup_completed',
   'User finished the signup flow (post email verification).',
   '[{"name":"plan","type":"string","required":true,"description":"Selected plan at signup"},{"name":"source","type":"string","required":false,"description":"utm_source"}]',
   0, '2026-04-15T00:00:00.000Z'),
  ('seed-evt-checkout',  '__PROJECT_ID__', 'checkout_completed',
   'Order placed successfully.',
   '[{"name":"order_value","type":"number","required":true,"description":"USD"},{"name":"items","type":"number","required":true,"description":"Item count"}]',
   0, '2026-04-15T00:00:00.000Z'),
  ('seed-evt-abandon',   '__PROJECT_ID__', 'cart_abandoned',
   'User left checkout without completing the purchase.',
   '[{"name":"cart_value","type":"number","required":true,"description":"USD"},{"name":"items","type":"number","required":true,"description":"Item count"}]',
   0, '2026-04-15T00:00:00.000Z'),
  ('seed-evt-error',     '__PROJECT_ID__', 'client_error',
   'Caught exception bubbled up from the SDK error boundary.',
   '[{"name":"message","type":"string","required":true,"description":"Error message"}]',
   0, '2026-04-15T00:00:00.000Z');

-- ── Metrics ────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO metrics (id, project_id, name, event_name, value_path, aggregation, winsorize_pct, min_detectable_effect, updated_at)
VALUES
  ('seed-met-signups',   '__PROJECT_ID__', 'signups_per_user',           'signup_completed',   NULL,           'count_users',  99, 0.02,  '2026-05-01T00:00:00.000Z'),
  ('seed-met-checkout',  '__PROJECT_ID__', 'checkout_conversion',        'checkout_completed', NULL,           'count_users',  99, 0.01,  '2026-05-01T00:00:00.000Z'),
  ('seed-met-revenue',   '__PROJECT_ID__', 'revenue_per_user',           'checkout_completed', 'order_value',  'sum',          99, 0.05,  '2026-05-01T00:00:00.000Z'),
  ('seed-met-pv',        '__PROJECT_ID__', 'page_views_per_session',     'page_view',          NULL,           'count_events', 99, NULL,  '2026-05-01T00:00:00.000Z'),
  ('seed-met-abandon',   '__PROJECT_ID__', 'cart_abandon_rate',          'cart_abandoned',     NULL,           'count_users',  99, 0.05,  '2026-05-01T00:00:00.000Z');

-- ── Experiments ────────────────────────────────────────────────────────────
-- 1. checkout_v3 — running, 50% allocation, 2 variants
INSERT OR IGNORE INTO experiments (id, project_id, name, description, tag, universe, targeting_gate, allocation_pct, salt, params, groups, status, started_at, stopped_at, significance_threshold, min_runtime_days, min_sample_size, sequential_testing, hash_version, updated_at)
VALUES (
  'seed-exp-checkout',
  '__PROJECT_ID__',
  'checkout_v3',
  'Redesigned checkout single-page flow vs. legacy two-step.',
  'commerce',
  'default',
  'new_checkout',
  5000,
  'seed-salt-checkout',
  '{}',
  '[{"name":"control","weight":5000,"params":{"layout":"legacy"}},{"name":"treatment","weight":5000,"params":{"layout":"single_page"}}]',
  'running',
  '2026-05-01T00:00:00.000Z', NULL,
  0.05, 7, 1000, 1, 1,
  '2026-05-01T00:00:00.000Z'
);

-- 2. pricing_test — draft, 0% allocation
INSERT OR IGNORE INTO experiments (id, project_id, name, description, tag, universe, targeting_gate, allocation_pct, salt, params, groups, status, started_at, stopped_at, significance_threshold, min_runtime_days, min_sample_size, sequential_testing, hash_version, updated_at)
VALUES (
  'seed-exp-pricing',
  '__PROJECT_ID__',
  'pricing_page_v2',
  'Test new pricing page layout with 3 tier options vs 2.',
  'growth',
  'default',
  NULL,
  0,
  'seed-salt-pricing',
  '{}',
  '[{"name":"control","weight":5000,"params":{"tiers":2}},{"name":"treatment","weight":5000,"params":{"tiers":3}}]',
  'draft',
  NULL, NULL,
  0.05, 14, 500, 0, 1,
  '2026-05-14T11:00:00.000Z'
);

-- 3. banner_color — stopped, 3 variants
INSERT OR IGNORE INTO experiments (id, project_id, name, description, tag, universe, targeting_gate, allocation_pct, salt, params, groups, status, started_at, stopped_at, significance_threshold, min_runtime_days, min_sample_size, sequential_testing, hash_version, updated_at)
VALUES (
  'seed-exp-banner',
  '__PROJECT_ID__',
  'banner_color',
  'CTA banner colour test. Stopped after orange won at p=0.02.',
  'marketing',
  'default',
  NULL,
  10000,
  'seed-salt-banner',
  '{}',
  '[{"name":"control","weight":3333,"params":{"color":"blue"}},{"name":"orange","weight":3333,"params":{"color":"orange"}},{"name":"green","weight":3334,"params":{"color":"green"}}]',
  'stopped',
  '2026-04-01T00:00:00.000Z', '2026-04-22T00:00:00.000Z',
  0.05, 14, 1000, 1, 1,
  '2026-04-22T00:00:00.000Z'
);

-- 4. onboarding_flow — running, 100% allocation
INSERT OR IGNORE INTO experiments (id, project_id, name, description, tag, universe, targeting_gate, allocation_pct, salt, params, groups, status, started_at, stopped_at, significance_threshold, min_runtime_days, min_sample_size, sequential_testing, hash_version, updated_at)
VALUES (
  'seed-exp-onboarding',
  '__PROJECT_ID__',
  'onboarding_flow',
  'Streamlined 3-step onboarding vs current 5-step.',
  'growth',
  'logged_in_users',
  NULL,
  10000,
  'seed-salt-onboarding',
  '{}',
  '[{"name":"control","weight":5000,"params":{"steps":5}},{"name":"treatment","weight":5000,"params":{"steps":3}}]',
  'running',
  '2026-05-05T00:00:00.000Z', NULL,
  0.05, 7, 500, 1, 1,
  '2026-05-05T00:00:00.000Z'
);

-- 5. search_relevance — archived
INSERT OR IGNORE INTO experiments (id, project_id, name, description, tag, universe, targeting_gate, allocation_pct, salt, params, groups, status, started_at, stopped_at, significance_threshold, min_runtime_days, min_sample_size, sequential_testing, hash_version, updated_at)
VALUES (
  'seed-exp-search',
  '__PROJECT_ID__',
  'search_relevance_bm25',
  'Switched ranker from TF-IDF to BM25. Shipped, archived.',
  'search',
  'default',
  NULL,
  10000,
  'seed-salt-search',
  '{}',
  '[{"name":"control","weight":5000,"params":{"ranker":"tfidf"}},{"name":"treatment","weight":5000,"params":{"ranker":"bm25"}}]',
  'archived',
  '2026-03-01T00:00:00.000Z', '2026-03-21T00:00:00.000Z',
  0.05, 14, 1000, 0, 1,
  '2026-03-21T00:00:00.000Z'
);

-- ── Experiment ↔ metric wiring ─────────────────────────────────────────────
INSERT OR IGNORE INTO experiment_metrics (id, experiment_id, metric_id, role, created_at) VALUES
  ('seed-em-checkout-goal',      'seed-exp-checkout',    'seed-met-checkout', 'goal',      1746057600),
  ('seed-em-checkout-rev',       'seed-exp-checkout',    'seed-met-revenue',  'secondary', 1746057600),
  ('seed-em-checkout-abandon',   'seed-exp-checkout',    'seed-met-abandon',  'guardrail', 1746057600),
  ('seed-em-onboarding-goal',    'seed-exp-onboarding',  'seed-met-signups',  'goal',      1746489600),
  ('seed-em-banner-goal',        'seed-exp-banner',      'seed-met-checkout', 'goal',      1743465600),
  ('seed-em-search-goal',        'seed-exp-search',      'seed-met-pv',       'goal',      1740787200);

COMMIT;
