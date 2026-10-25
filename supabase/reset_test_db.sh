#!/bin/sh
# Rebuilds the local test database: Supabase emulation + all migrations + seed, each file in one transaction.
set -e
export PGHOST=${PGHOST:-/home/claude/pg} PGPORT=${PGPORT:-54329} PGUSER=${PGUSER:-postgres}
cd "$(dirname "$0")"
dropdb --if-exists af >/dev/null 2>&1 || true
createdb af
psql -q -1 -v ON_ERROR_STOP=1 -d af -f tests/00_supabase_emulation.sql
for f in migrations/*.sql; do psql -q -1 -v ON_ERROR_STOP=1 -d af -f "$f"; done
[ -f seed.sql ] && psql -q -1 -v ON_ERROR_STOP=1 -d af -f seed.sql
echo "db ready"
