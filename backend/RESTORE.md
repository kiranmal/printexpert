# Database Backup & Restore — Print Expert

## Modes

| | Development (now) | Production |
|---|---|---|
| Automatic backups | **OFF** — `BACKUP_SCHEDULE=off`, no scheduled task | `BACKUP_SCHEDULE=on` (in-server) **or** OS scheduler |
| Manual backups | `node backupDb.js` — always works | same |
| DB account | `printexpert_app` (app), `root` (backup) | `printexpert_app` (app), `printexpert_backup` (backup — see `backup-grants.sql`) |

Backups never start merely because `NODE_ENV`/`APP_ENV` is `production` — `BACKUP_SCHEDULE=on` **and** configured credentials are both required.

## Layout

| Item | Value |
|---|---|
| Database | `printexpert` |
| Backup dir (local) | `BACKUP_DIR` env, default `%USERPROFILE%\printexpert-db-backups` (Windows) / `~/.printexpert-db-backups` fallback |
| Remote copy | `BACKUP_REMOTE_DIR` — any mounted path (SMB share `/mnt/backup-share`, cloud-synced folder, second disk). Copied **after** local validation; a remote failure keeps the local file and notifies |
| Format | `printexpert_YYYY-MM-DD_HHMMSS.sql.gz` — gzipped `mysqldump --single-transaction --routines --triggers` (all tables incl. `uploaded_files` bytes) |
| Logs | `backup.log` in the backup dir + `backup_runs` audit table |
| Concurrency | `backup.lock` prevents overlapping runs (stale after 2h) |
| Retention | last 14 daily + newest per ISO week for 8 weeks; older files deleted **only after the newest backup validates** |

## Environment variables

```ini
# .env — REQUIRED on the production server (placeholders!)

# master switch — OFF unless literally "on"
BACKUP_SCHEDULE=on

# backup DB account (see backup-grants.sql) — NOT root in prod
BACKUP_DB_USER=printexpert_backup
BACKUP_DB_PASS=strong-password-here

# optional paths
BACKUP_DIR=/var/backups/printexpert
BACKUP_REMOTE_DIR=/mnt/backup-share/printexpert

# optional failure email (SMTP_* must also be set)
BACKUP_NOTIFY_EMAIL=admin@yourdomain.com

# optional: non-standard mysql client location
# MYSQL_BIN_DIR=/usr/bin
```

## Scheduling — pick ONE

### Windows (XAMPP server)

```bat
schtasks /create /tn "PrintExpertDB-Backup" /sc daily /st 03:00 ^
  /tr "\"C:\path\to\backend\backup-daily.bat\"" /rl highest
```

Verify: `schtasks /query /tn PrintExpertDB-Backup` and `taskschd.msc`.

### Linux / VPS (cron)

```cron
0 3 * * * cd /var/www/printexpert/backend && /usr/bin/node backupDb.js >> /var/backups/printexpert/cron.log 2>&1
```

(`crontab -e` as the app user.) Or a systemd timer calling the same command.

### In-server fallback

`BACKUP_SCHEDULE=on` in the production `.env` makes the API itself run `backupDb.js` daily at ~03:00 and once at boot when no backup exists for the day. Use this **only if** no OS scheduler is configured — do not run both on the same schedule (the lock file prevents simultaneous runs, but you get redundant dumps).

## Verify backups are running

1. `node backupDb.js --list` — files appear daily
2. `tail backup.log` / `SELECT * FROM backup_runs ORDER BY id DESC` — `ok` entries
3. `node backupDb.js --verify` — full round-trip: dumps, restores into `printexpert_restore_test`, checks row counts, drops it

## Restore safely

**Never auto-restore over production.** Procedure:

1. `node backupDb.js --verify` on the candidate file (throwaway DB only)
2. Restore into a **staging** DB, point a test instance at it, confirm data:

```bat
node -e "fs=require('fs');z=require('zlib');fs.writeFileSync('restore.sql',z.gunzipSync(fs.readFileSync('BACKUPFILE.sql.gz')))"
:: edit restore.sql — replace printexpert with printexpert_staging
mysql -u root -p printexpert_staging < restore.sql
```

3. Only then restore production (dump drops + recreates tables):

```bat
mysql -u root -p printexpert < restore.sql
```

Restart the API afterwards.

## Critical: single MySQL server

This project previously "lost" data because **two mysqld installs competed for :3306**. On any host, ensure exactly one MySQL/MariaDB instance owns the port. The API startup log prints `@@datadir` — check it.

## Pre-launch checklist

- [ ] `backup-grants.sql` run on production MySQL → `printexpert_backup` created
- [ ] `.env` filled: `BACKUP_SCHEDULE=on`, `BACKUP_DB_USER/PASS`, `BACKUP_DIR`, `BACKUP_REMOTE_DIR`, `BACKUP_NOTIFY_EMAIL` + `SMTP_*`
- [ ] Scheduler registered (schtasks OR cron — not both on same schedule)
- [ ] `node backupDb.js --verify` passes on the production host
- [ ] Remote dir writable from the app user; test copy lands
- [ ] `APP_ENV=production`; `printexpert_app` has no DROP/TRUNCATE grants
- [ ] Test notification: temporarily break `DB_PORT` → run → confirm `backup FAILED` in log + email arrives → restore `DB_PORT`
- [ ] Off-site copy actually readable from a second machine
- [ ] `seed.js` requires `--force-prod` under `APP_ENV=production` ✓ (built in)

## Limitations

- Daily cadence — up to 24h of writes can be lost between dumps; schedule more often if needed
- `backup_runs` audit can't write when the DB itself is down — `backup.log` always captures failures
- Remote copy needs the destination mounted/available; failures are logged + notified but don't delete local copies
