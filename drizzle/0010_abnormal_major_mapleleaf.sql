-- Defensive backfill for any straggler recurring rows that the 0009 backfill
-- skipped. 0009's WHERE clause required `recurring_days > 0`, so rows with
-- `is_recurring = 1` and a NULL or 0 `recurring_days` were left without the
-- new recurrence columns populated. Heal them as day/1/interval before the
-- column drop so `computeNextDueAt` keeps producing next occurrences.
UPDATE `reminders`
SET `recurrence_unit` = 'day',
    `recurrence_interval` = 1,
    `recurrence_anchor` = 'interval'
WHERE `is_recurring` = 1 AND `recurrence_unit` IS NULL;
--> statement-breakpoint
ALTER TABLE `reminders` DROP COLUMN `recurring_days`;
