# Data retention & purge runbook

This runbook describes how IP and proctoring data are retained and purged.

Environment

- `IP_RETENTION_DAYS` (default: 90) — number of days after which IP/proctoring IP fields will be pseudonymized or deleted.
- `PSEUDONYMIZE=true|false` — when true, script will replace IP fields with a one-way hash instead of deleting rows.
- `PSEUDONYMIZE_SALT` — secret used when generating pseudonymized hashes; must be stored in secret manager.

Script

The repository contains `backend/scripts/purge-ip-data.ts` — run it manually or schedule via cron/systemd/CI to enforce retention.

Example cron (daily at 02:00):

```cron
0 2 * * * cd /srv/examtrust/backend && /usr/bin/env NODE_ENV=production IP_RETENTION_DAYS=90 PSEUDONYMIZE=true PSEUDONYMIZE_SALT=xxx /usr/bin/node ./node_modules/.bin/ts-node ./scripts/purge-ip-data.ts >> /var/log/examtrust/purge.log 2>&1
```

Recommended process

1. Ensure a recent backup exists before running deletion (snapshot or DB backup).
2. Prefer `PSEUDONYMIZE=true` in most jurisdictions to retain analytics while removing direct identifiers.
3. Validate a dry-run by setting `DRY_RUN=true` (the script supports dry-run mode). Verify affected counts.
4. Once confirmed, run with `DRY_RUN=false` and monitor logs.

What the script does

- Finds `exam_link_usages` and `proctoring_sessions` records older than cutoff date.
- If `PSEUDONYMIZE=true`, replaces IPs with a stable hash (sha256 of ip + salt). Otherwise deletes or nulls IP fields depending on configuration.
- Writes a brief summary at the end (counts changed).

Audit & compliance

- Keep an audit trail for purges (log files stored on a central logging system). Do not store secret salts in logs.
- Provide a mechanism for users to request deletion (see `PRIVACY.md`) — deletion of associated identifiers should follow policy and may require manual review.
