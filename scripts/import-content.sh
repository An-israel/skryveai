#!/usr/bin/env bash
# ============================================================
#  Skryve — bulk-import exported CSVs into the NEW Supabase project
# ------------------------------------------------------------
#  Imports your Lovable CSV exports (semicolon-delimited) into the new
#  project, in dependency order (parents before children), skipping files
#  that aren't present so you can re-run as you export more tables.
#
#  WHAT IT IMPORTS (content only — no user/account tables, so there are
#  no broken links to login accounts that weren't migrated):
#     learning_paths -> learning_modules -> learning_lessons ->
#     learning_assignments -> lesson_video_status -> quizzes ->
#     quiz_questions -> blog_posts -> events -> app_config
#
#  PREREQUISITES (one time):
#     1. Postgres client (psql):   scoop install postgresql
#     2. The NEW project's DB URL:  Supabase Dashboard -> your new project
#        -> Settings -> Database -> Connection string -> URI
#        (replace [YOUR-PASSWORD] with the project's database password)
#
#  USAGE (run from Git Bash):
#     ./scripts/import-content.sh "<NEW_DB_URL>" "<folder-with-your-csvs>"
#
#  Re-run safely with --fresh to wipe + reload each table first:
#     ./scripts/import-content.sh "<NEW_DB_URL>" "<folder>" --fresh
# ============================================================
set -uo pipefail

NEW_DB_URL="${1:?Provide the NEW project DB connection URI as arg 1}"
CSV_DIR="${2:?Provide the folder containing your exported CSVs as arg 2}"
FRESH="${3:-}"

# Tables in safe import order (parents first). Files are matched by name,
# so any export named "<something>tablenameexport<timestamp>.csv" is found.
TABLES=(
  learning_paths
  learning_modules
  learning_lessons
  learning_assignments
  lesson_video_status
  quizzes
  quiz_questions
  blog_posts
  events
  app_config
)

command -v psql >/dev/null 2>&1 || { echo "ERROR: psql not found. Install it:  scoop install postgresql"; exit 1; }

for table in "${TABLES[@]}"; do
  # Find a CSV whose filename contains the exact table name (Lovable exports
  # look like "<hash>-<table>export<timestamp>.csv").
  file=$(ls "$CSV_DIR"/*"${table}"export*.csv 2>/dev/null | head -1)
  if [ -z "$file" ]; then
    echo "·  skip   $table  (no CSV found)"
    continue
  fi

  # Build the column list from the file's header (semicolon-separated),
  # stripping any trailing carriage return and quoting each column name.
  header=$(head -1 "$file" | tr -d '\r')
  cols=$(echo "$header" | tr ';' '\n' | sed 's/^/"/; s/$/"/' | paste -sd, -)

  if [ "$FRESH" = "--fresh" ]; then
    echo "⌫  reset  $table"
    psql "$NEW_DB_URL" -q -c "TRUNCATE public.\"$table\" CASCADE;" 2>/dev/null \
      || echo "   (truncate skipped — table may not exist yet)"
  fi

  echo "↑  import $table  <- $(basename "$file")"
  psql "$NEW_DB_URL" -v ON_ERROR_STOP=1 \
    -c "\copy public.\"$table\"($cols) FROM '$file' WITH (FORMAT csv, HEADER true, DELIMITER ';')" \
    && echo "   ✓ done" \
    || echo "   ✗ FAILED for $table (see message above) — continuing"
done

# ── Fix the stale app_config value that points at the OLD project ───────────
echo "→  fixing app_config.supabase_functions_url to the new project..."
psql "$NEW_DB_URL" -q -c \
  "UPDATE public.app_config SET value='https://uwwmwerdfpyekgshkrft.supabase.co/functions/v1' WHERE key='supabase_functions_url';" \
  2>/dev/null && echo "   ✓ done" || echo "   (app_config not present — skipped)"

echo
echo "============================================================"
echo " ✅ Import finished."
echo " Check your new project's Table Editor to confirm the rows landed."
echo "============================================================"
