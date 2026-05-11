ALTER TABLE `reminders` ADD `recurrence_unit` text;--> statement-breakpoint
ALTER TABLE `reminders` ADD `recurrence_interval` integer;--> statement-breakpoint
ALTER TABLE `reminders` ADD `recurrence_anchor` text;--> statement-breakpoint
ALTER TABLE `reminders` ADD `recurrence_anchor_value` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `default_recurrence_unit` text;--> statement-breakpoint
UPDATE `reminders`
SET `recurrence_unit` = 'day',
    `recurrence_interval` = `recurring_days`,
    `recurrence_anchor` = 'interval'
WHERE `is_recurring` = 1 AND `recurring_days` IS NOT NULL AND `recurring_days` > 0;