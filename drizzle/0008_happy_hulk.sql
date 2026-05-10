ALTER TABLE `daily_events` ADD `event_group_id` text;--> statement-breakpoint
CREATE INDEX `daily_event_group_idx` ON `daily_events` (`event_group_id`);