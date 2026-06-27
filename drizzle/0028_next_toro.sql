PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`password_hash` text,
	`calendar_feed_token` text,
	`role` text DEFAULT 'admin' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_login_at` integer,
	`theme` text DEFAULT 'system' NOT NULL,
	`locale` text DEFAULT 'en' NOT NULL,
	`email` text,
	`phone` text,
	`oidc_subject` text,
	`oidc_issuer` text,
	`reminder_undo_seconds` integer,
	`default_recurrence_unit` text,
	`notify_reminder_email` integer DEFAULT false NOT NULL,
	`notify_shift_email` integer DEFAULT false NOT NULL,
	`ntfy_topic` text,
	`avatar_path` text,
	`avatar_provider` text,
	`avatar_storage_key` text,
	`totp_secret` text,
	`totp_enabled_at` integer,
	`totp_last_step` integer
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "username", "display_name", "password_hash", "calendar_feed_token", "role", "is_active", "created_at", "last_login_at", "theme", "locale", "email", "phone", "oidc_subject", "oidc_issuer", "reminder_undo_seconds", "default_recurrence_unit", "notify_reminder_email", "notify_shift_email", "ntfy_topic", "avatar_path", "avatar_provider", "avatar_storage_key", "totp_secret", "totp_enabled_at", "totp_last_step") SELECT "id", "username", "display_name", "password_hash", "calendar_feed_token", "role", "is_active", "created_at", "last_login_at", "theme", "locale", "email", "phone", "oidc_subject", "oidc_issuer", "reminder_undo_seconds", "default_recurrence_unit", "notify_reminder_email", "notify_shift_email", "ntfy_topic", "avatar_path", "avatar_provider", "avatar_storage_key", "totp_secret", "totp_enabled_at", "totp_last_step" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_oidc_idx` ON `users` (`oidc_issuer`,`oidc_subject`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_calendar_feed_token_idx` ON `users` (`calendar_feed_token`);
