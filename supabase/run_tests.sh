#!/bin/sh
# Rebuilds the test DB and runs the security suite. Exit code 1 if any test fails.
cd "$(dirname "$0")"
./reset_test_db.sh >/dev/null 2>&1 || { echo "migration failed"; ./reset_test_db.sh; exit 1; }
OUT=$(psql -h ${PGHOST:-/home/claude/pg} -p ${PGPORT:-54329} -U postgres -d af -v ON_ERROR_STOP=1 -f tests/10_security_tests.sql 2>&1 | sed -n 's/^psql:[^ ]* NOTICE:  //p; s/^NOTICE:  //p; /^---/p; /ERROR/p')
echo "$OUT"
P=$(echo "$OUT" | grep -c '^PASS'); F=$(echo "$OUT" | grep -c -E '^FAIL|ERROR')
echo "======== $P passed, $F failed"
[ "$F" = "0" ]
