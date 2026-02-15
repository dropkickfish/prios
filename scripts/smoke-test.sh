#!/usr/bin/env bash
# API smoke test. Run with server on http://localhost:3000
set -e
BASE="${BASE_URL:-http://0.0.0.0:3000}"
echo "Smoke testing $BASE ..."
curl -sf "$BASE/health" | grep -q '"status":"ok"' || (echo "FAIL: /health"; exit 1)
echo "  /health OK"
curl -sf "$BASE/api/boards" | grep -q '"id"' || (echo "FAIL: /api/boards"; exit 1)
echo "  /api/boards OK"
curl -sf "$BASE/api/stats" | grep -q 'currentStreak' || (echo "FAIL: /api/stats"; exit 1)
echo "  /api/stats OK"
echo "All smoke tests passed."
