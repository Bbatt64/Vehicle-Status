# Memphis Fleet Vehicle Dashboard - environment configuration
# Copy this file to `.env` and fill in real values, OR set these
# variables in your hosting provider's environment settings.

# ---- REQUIRED -------------------------------------------------------------

# Airtable Personal Access Token (https://airtable.com/create/tokens)
# Required scopes:
#   - data.records:read
#   - data.records:write
# Required access: the "Memphis Vehicle Post Log" base.
AIRTABLE_TOKEN=patXXXXXXXXXXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# ---- DEFAULTS (override only if you change Airtable IDs) ------------------

AIRTABLE_BASE_ID=appf7SJsAl6DzYcV7
AIRTABLE_TOTAL_CARS_TABLE_ID=tbl5N50qREGA00mm1
AIRTABLE_POST_LOG_TABLE_ID=tblO05lgOSbZkPWsI

# ---- OPTIONAL -------------------------------------------------------------

# Port the server binds to (default 5000)
PORT=5000

# Path to the SQLite database file (default ./data.db).
# Use an absolute path on a persistent volume in production:
#   DB_PATH=/var/lib/vehicle-dashboard/data.db
DB_PATH=data.db

# How often to refresh vehicles from Airtable, in minutes.
# Set to 0 to disable the in-process scheduler (e.g. if you call /api/sync from
# an external cron).
SYNC_INTERVAL_MINUTES=60
