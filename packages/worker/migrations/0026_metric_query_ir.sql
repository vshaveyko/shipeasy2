-- Metric event-aggregation DSL: store typed IR alongside the legacy enum/value_path.
-- See packages/query-dsl/ for the IR shape and experiment-platform/event-aggregation.md
-- for the design. The IR is authoritative; the legacy columns stay for the existing
-- worker analyzer until it's switched over (next PR).

ALTER TABLE `metrics` ADD `query_ir` text;
--> statement-breakpoint

-- Backfill: derive an IR from the legacy aggregation + value_path so every existing
-- metric has a query_ir on disk. count_users / count_events have no value column;
-- sum / avg take value_path as the IR's valueLabel. retention_Nd is parameterised as n=7
-- (the documented default — older rows never persisted n, so 7d is the safe choice).
UPDATE `metrics`
   SET `query_ir` = json_object(
         'agg', json_object('kind', `aggregation`),
         'metric', `event_name`,
         'filters', json_array()
       )
 WHERE `aggregation` IN ('count_users', 'count_events')
   AND `query_ir` IS NULL;
--> statement-breakpoint

UPDATE `metrics`
   SET `query_ir` = json_object(
         'agg', json_object('kind', `aggregation`),
         'metric', `event_name`,
         'valueLabel', coalesce(`value_path`, 'value'),
         'filters', json_array()
       )
 WHERE `aggregation` IN ('sum', 'avg')
   AND `query_ir` IS NULL;
--> statement-breakpoint

UPDATE `metrics`
   SET `query_ir` = json_object(
         'agg', json_object('kind', 'retention_Nd', 'n', 7),
         'metric', `event_name`,
         'filters', json_array()
       )
 WHERE `aggregation` = 'retention_Nd'
   AND `query_ir` IS NULL;
