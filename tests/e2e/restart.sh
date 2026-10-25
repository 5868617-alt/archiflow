#!/bin/sh
# rebuild the test site, reset the test DB, put test files in place (gateway keeps running)
cd "$(dirname "$0")/../.."
node build.mjs --live --test >/dev/null && supabase/reset_test_db.sh >/dev/null 2>&1 && rm -rf tests/e2e/.storage && node tests/e2e/setup.mjs
