ALTER TABLE `companions` ADD `public_slug` text;--> statement-breakpoint
ALTER TABLE `companions` ADD `public_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `companion_public_slug_idx` ON `companions` (`public_slug`);
