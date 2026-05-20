# Folders — design spec

Date: 2026-05-19
Status: Draft, pre-implementation

## Summary

Introduce a flat **folder** concept on every flag-platform entity (gates, configs, experiments, killswitches, universes, metrics, events). Folder becomes part of the SDK lookup key (`folder/name`) and groups items in admin list views with collapsible headers. Replaces the existing `experiments.tag` column.

## Goals

- Single per-entity grouping primitive across the flag platform.
- Folder participates in SDK lookup (`folder/name` namespace) — not just admin metadata.
- Admin list views render collapsible folder groups with item counts.
- Admin create/edit forms pick or free-type folder via a combobox.
- Replace `experiments.tag` end-to-end.

## Non-goals

- Nested folders / hierarchical paths. Flat strings only.
- Folder rename or bulk-move operations. Folder names are treated as immutable lookup keys (same contract as entity names).
- Separate `folders` table or folder-level permissions. Distinct folder list is derived from existing rows.
- Folder support on i18n keys, bugs, feature-requests (different UX models).

## Semantics

- `folder` is a nullable string per entity row.
- Max length 256. Allowed characters: `[a-zA-Z0-9_-]+` (no `/`, since `/` is the folder/name separator in lookup keys). Lowercase recommended (not enforced).
- `NULL` (or empty string at boundary) = "root" / "no folder".
- Uniqueness: `name` is unique within `(project_id, folder)` per entity kind, with `NULL` coalesced to `''`. Two gates can share `name = 'enabled'` if in different folders.
- Folder list per entity kind per project is discovered by `SELECT DISTINCT folder FROM <kind> WHERE project_id = ? AND deleted_at IS NULL`.

## Schema

### Columns

Add to each table — `gates`, `configs`, `experiments`, `killswitches`, `universes`, `metrics`, `events`:

```sql
ALTER TABLE <table> ADD COLUMN folder text
  CHECK (folder IS NULL OR length(folder) <= 256);
```

SQLite has no native `varchar(N)`; a `CHECK` constraint enforces length at the DB.

### Experiments: drop `tag`

```sql
ALTER TABLE experiments ADD COLUMN folder text
  CHECK (folder IS NULL OR length(folder) <= 256);
UPDATE experiments SET folder = tag WHERE tag IS NOT NULL;
ALTER TABLE experiments DROP COLUMN tag;
```

If the deployed D1/SQLite version does not support `DROP COLUMN`, fallback: leave `tag` column in place, mark it deprecated, stop reading/writing it. Decide at migration-author time by checking SQLite version on the target.

### Indexes

Drop the existing `(project_id, name)` unique index per table and recreate as:

```sql
CREATE UNIQUE INDEX <table>_project_folder_name
  ON <table> (project_id, coalesce(folder, ''), name)
  WHERE deleted_at IS NULL;  -- only for tables that soft-delete
```

Plus a non-unique grouping index per table for `GROUP BY folder` / folder-filter queries:

```sql
CREATE INDEX <table>_project_folder ON <table> (project_id, folder);
```

The plan must enumerate each table's existing index name + soft-delete usage before writing the migration.

### Drizzle

Mirror the columns + indexes in `packages/core/src/db/schema.ts`. Drop `experiments.tag` from the TS definition.

### Deploy

Per `CLAUDE.md` hard rule: ship via `wrangler d1 migrations apply`, never `d1 execute --remote`. CF Build wires migration apply into each Worker's build command.

## KV blob + SDK contract

### KV writers (`packages/core/src/kv/rebuild.ts`)

Every entity payload gains a `folder` field (`string | null`). Lookup map keys change from bare `name` to `folder/name`, with root entries keyed as `/name` for unambiguous parsing.

```ts
// gates blob
{ "checkout/new-cart": { name, folder: "checkout", rules, rolloutPct, ... },
  "/legacy-banner":     { name, folder: null,       rules, rolloutPct, ... } }

// experiments + configs same shape
```

### Worker SDK routes (`packages/worker/src/sdk/{flags,experiments,evaluate}.ts`)

Read new blob shape. Route lookups by `folder/name`. Backward-compat: if the blob is in old shape (no `folder` field on entries), treat all entries as root (`folder = null`).

### TS SDK (`packages/ts-sdk/src/{server,client}/index.ts`)

Public signatures unchanged: `checkGate(name)`, `getConfig(name)`, `getExperiment(name)`.

Resolution rule inside the SDK:

- Split `name` on the first `/`.
- If split yields two parts → `[folder, key]`. Look up `folder/key` in the blob.
- If no `/` → folder = root. Look up `/key` (or fall back to bare `key` for legacy blobs).

```ts
// Examples
flags.checkGate("checkout/new-cart"); // folder=checkout, name=new-cart
flags.checkGate("legacy-banner"); // folder='', name=legacy-banner
```

Existing consumers calling `getConfig("foo")` keep working since current rows migrate with `folder = NULL` and resolve to root.

## Admin backend

### Zod schemas

Add to create/update inputs for each entity kind:

```ts
folder: z.string()
  .max(256)
  .regex(/^[a-zA-Z0-9_-]+$/)
  .nullable()
  .optional();
```

### Handlers (`apps/ui/src/lib/handlers/{experiments,gates,configs,...}.ts`)

- Accept `folder` on create + update payloads.
- Persist as-is. Coerce empty string → `null` at the boundary.
- Rename of `name` does not touch folder.
- KV rebuild trigger unchanged (already fires on entity mutation).

### Folder list endpoint

Either a route handler `/api/<kind>/folders` or a server action per kind that returns:

```ts
SELECT DISTINCT folder
FROM <kind>
WHERE project_id = ? AND deleted_at IS NULL AND folder IS NOT NULL
ORDER BY folder ASC;
```

Cached lightly in the client (`SWR`-style) for combobox autocomplete.

### List query

Each list query adds `folder` to its select and orders rows pre-grouped:

```sql
ORDER BY coalesce(folder, '') ASC, name ASC
```

### Experiments cleanup

Remove `tag` from:

- `packages/core/src/db/schema.ts` (experiments table def).
- Zod schemas + handlers (`apps/ui/src/lib/handlers/experiments.ts`).
- Action payloads (`apps/ui/src/app/dashboard/[projectId]/experiments/actions.ts`).
- Page payloads (`.../experiments/[id]/page.tsx`, `results-client.tsx`).
- Wizards / new-experiment forms (`new-experiment-client.tsx`, `new-experiment-wizard.tsx`).
- List filter logic (`experiments-content.tsx`).

## Admin UI — list view

The shared list shell unified in commit `fc67b7f` is the host. Folder grouping is rendered between the table header and rows.

### Folder header row

- Full-width row spanning all columns.
- Left: chevron (▾ expanded / ▸ collapsed) + folder icon + folder name + `(<count>)` badge.
- Root bucket label: italic, muted, "No folder".
- Click anywhere on header toggles expanded state.
- Not selectable; not part of row checkbox state.

### Expansion state

- Per `(projectId, entityKind)`, persisted in `localStorage`.
- Key: `shipeasy.folders.<kind>.<projectId>`.
- Value: `{ collapsed: string[] }` (folder names currently collapsed; `''` for root).
- Default: all expanded.

### Grouping logic

Server returns rows already ordered by folder. Client groups in-memory:

```ts
const groups = groupBy(rows, (r) => r.folder ?? "");
```

Render `<FolderHeader>` then mapped `<Row>`s inside `<tbody>` (or virtualized list shell).

### Search behavior

Existing search box matches `name + folder + description`. When the search query is non-empty, render flat (no folder headers). On clear, restore grouping + persisted collapse state.

### Stat trio at top

Counts unchanged. Folder count is not surfaced as a stat in v1.

## Admin UI — create / edit input

### `FolderPicker` component

New shared component at `apps/ui/src/components/folder-picker.tsx`.

- Built on shadcn `Combobox` (`Popover` + `Command`).
- Props: `entityKind`, `projectId`, `value: string | null`, `onChange(value: string | null)`.
- Trigger: button-like input with placeholder "No folder".
- Dropdown options: distinct folders for that `(project, kind)`, fetched on open or pre-passed from a server component.
- Free-type creates a new folder on commit — option list shows a "Create '<typed>'" row when the typed value does not match an existing folder.
- Clear button (×) to reset to no folder (`null`).
- Client-side validation: max 256, regex `[a-zA-Z0-9_-]+`. Inline error if invalid; commit blocked.

### Wiring

- Each entity wizard / edit form gains a `<FolderPicker>` field.
- Slot location: alongside `name` and `description` in step 1 of each wizard.
- For experiments: replace existing tag input with the picker in the same slot.

### Server action

Form submissions include `folder`. Server coerces `''` → `null`.

## Testing

### Playwright e2e (`apps/ui/e2e/`)

Per CLAUDE.md "every workflow ships with e2e", add `folders.spec.ts` (parameterised across entity kinds) covering:

- Create item with folder → appears under folder header in list.
- Create item without folder → appears under "No folder".
- Two items, same `name`, different folders → both persist; uniqueness scoped.
- Collapse folder → rows hidden; reload page → collapse state restored.
- Search → flat view; clear → grouped restored.
- Experiments: old tag flow deleted, new folder flow asserted.

### Vitest (`packages/core` + `packages/worker`)

- KV rebuild emits `folder` field per entity for each kind.
- Worker SDK route resolves `folder/name` and bare `name` keys correctly.
- Drizzle uniqueness: insert duplicate `(project, folder, name)` rejected; same `name` in different folder accepted.
- Legacy KV blob (no folder field) still resolved via fallback path.

### TS SDK (`packages/ts-sdk/src/__tests__/sdk.test.ts`)

- `checkGate("a/b")` splits to folder=`a`, name=`b`.
- `checkGate("x")` resolves root folder.
- Unknown folder returns default.
- Backward-compat: lookup against an old-shape blob still works.

## Rollout

Single PR. Order of file changes inside the PR:

1. Drizzle migration (column + indexes) per entity table.
2. `packages/core/src/db/schema.ts` mirror.
3. Zod schemas + admin handlers + list queries.
4. `packages/core/src/kv/rebuild.ts` payload shape.
5. `packages/worker/src/sdk/*.ts` routes.
6. `packages/ts-sdk/src/{server,client}/index.ts` resolver.
7. `apps/ui/src/components/folder-picker.tsx`.
8. List view grouping in shared shell + each entity list page.
9. Wizard / edit form wiring per entity kind.
10. Remove `experiments.tag` from all call sites enumerated above.
11. E2E spec + vitest specs + SDK tests.

Deploy is automatic via CF Build (`wrangler d1 migrations apply` runs in build).

## Backward compatibility

- Existing rows have `folder = NULL` and render under "No folder".
- Existing SDK consumers calling `checkGate("foo")` continue to resolve to the root entry.
- Old KV blobs (pre-rebuild) lacking `folder` field are read via a fallback path in the worker SDK routes; KV is rebuilt on the next entity mutation per project, so the migration is effectively self-healing without a forced rebuild.

## Open items for the plan

- Confirm `killswitches` table name + presence in current schema.
- Enumerate exact existing unique index names per entity table (some use `WHERE deleted_at IS NULL`, some don't).
- Confirm deployed D1 SQLite version supports `ALTER TABLE ... DROP COLUMN`. If not, pick the deprecate-in-place fallback for `experiments.tag`.
- Pick whether folder list comes from a route handler or a server action per kind (consistency with existing patterns).
