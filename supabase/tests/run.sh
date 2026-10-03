#!/usr/bin/env bash
# Crée une base jetable, applique le shim + les migrations, lance les tests SQL.
set -euo pipefail
cd "$(dirname "$0")"
DB=${TEST_DB:-saas_mvp_test}
PSQL="psql -v ON_ERROR_STOP=1 -q ${PGURL:-}"
$PSQL -d postgres -c "drop database if exists $DB" -c "create database $DB"
$PSQL -d $DB -f supabase-shim.sql
for f in ../migrations/*.sql; do $PSQL -d $DB -f "$f"; done
for t in *.test.sql; do $PSQL -d $DB -f "$t"; done
