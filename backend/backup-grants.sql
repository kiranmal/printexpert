-- ============================================================
--  backup-grants.sql — dedicated backup account (PRODUCTION)
--
--  Run ONCE on the production MySQL server as root:
--    mysql -u root -p < backup-grants.sql
--
--  Then set BACKUP_DB_USER=printexpert_backup + BACKUP_DB_PASS
--  in the production .env. Replace CHANGE_ME first!
-- ============================================================

CREATE USER IF NOT EXISTS 'printexpert_backup'@'localhost'
  IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';

-- mysqldump --single-transaction needs: SELECT, LOCK TABLES
-- (non-InnoDB fallback), SHOW VIEW, TRIGGER, EVENT.
-- NO DROP / DELETE / INSERT / CREATE on the live schema.
GRANT SELECT, LOCK TABLES, SHOW VIEW, TRIGGER, EVENT
  ON `printexpert`.* TO 'printexpert_backup'@'localhost';

-- Restore-VERIFICATION (--verify) writes to a throwaway DB
-- only — never the live schema.
GRANT CREATE, DROP, INSERT, UPDATE, DELETE, ALTER, INDEX, REFERENCES
  ON `printexpert_restore_test`.* TO 'printexpert_backup'@'localhost';

FLUSH PRIVILEGES;
