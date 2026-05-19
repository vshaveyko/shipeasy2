#!/usr/bin/env bash
# Apply scripts/seed-local-d1.sql to the local miniflare D1 database used by
# `next dev` / `pnpm --filter @shipeasy/ui dev`.
#
# Usage:
#   scripts/seed-local-d1.sh                    # autodetect project (first non-e2e)
#   scripts/seed-local-d1.sh <project-id>       # explicit target
#   scripts/seed-local-d1.sh --list             # list projects in the local D1
#
# The SQL is fully idempotent (INSERT OR IGNORE / OR REPLACE) so re-running is
# safe. Stable seed-* primary keys make it easy to remove the fixture later
# via `DELETE FROM <table> WHERE id LIKE 'seed-%'`.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
D1_DIR="${ROOT_DIR}/apps/ui/.wrangler/state/v3/d1/miniflare-D1DatabaseObject"
SQL_FILE="${ROOT_DIR}/scripts/seed-local-d1.sql"

if [[ ! -d "${D1_DIR}" ]]; then
  echo "error: local D1 not found at ${D1_DIR}" >&2
  echo "       run \`pnpm --filter @shipeasy/ui dev\` once to create it." >&2
  exit 1
fi

DB_FILE="$(find "${D1_DIR}" -maxdepth 1 -name '*.sqlite' ! -name 'metadata*' | head -n1)"
if [[ -z "${DB_FILE}" ]]; then
  echo "error: no D1 sqlite file under ${D1_DIR}" >&2
  exit 1
fi

if [[ "${1:-}" == "--list" ]]; then
  sqlite3 -header -column "${DB_FILE}" "SELECT id, name, owner_email, plan FROM projects;"
  exit 0
fi

PROJECT_ID="${1:-}"
if [[ -z "${PROJECT_ID}" ]]; then
  PROJECT_ID="$(sqlite3 "${DB_FILE}" "SELECT id FROM projects WHERE id != 'e2e-project-id' ORDER BY created_at LIMIT 1;")"
fi

if [[ -z "${PROJECT_ID}" ]]; then
  echo "error: no project found in local D1. Create one via the dashboard first," >&2
  echo "       or pass a project id explicitly: scripts/seed-local-d1.sh <id>" >&2
  exit 1
fi

if ! sqlite3 "${DB_FILE}" "SELECT 1 FROM projects WHERE id = '${PROJECT_ID//\'/\'\'}' LIMIT 1;" | grep -q 1; then
  echo "error: project '${PROJECT_ID}' not found in local D1" >&2
  echo "       run \`scripts/seed-local-d1.sh --list\` to see available projects." >&2
  exit 1
fi

echo "→ seeding project ${PROJECT_ID}"
echo "  db:  ${DB_FILE}"
echo "  sql: ${SQL_FILE}"

sed "s/__PROJECT_ID__/${PROJECT_ID}/g" "${SQL_FILE}" | sqlite3 "${DB_FILE}"

echo "✓ seed applied. row counts:"
for t in gates configs config_values universes experiments events metrics user_attributes; do
  count="$(sqlite3 "${DB_FILE}" "SELECT COUNT(*) FROM ${t} WHERE project_id = '${PROJECT_ID//\'/\'\'}';")"
  printf "    %-20s %s\n" "${t}" "${count}"
done
em_count="$(sqlite3 "${DB_FILE}" "SELECT COUNT(*) FROM experiment_metrics em JOIN experiments e ON e.id = em.experiment_id WHERE e.project_id = '${PROJECT_ID//\'/\'\'}';")"
printf "    %-20s %s\n" "experiment_metrics" "${em_count}"
