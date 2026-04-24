CREATE TABLE `configured_models` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`provider` text NOT NULL,
	`provider_config_encrypted` text NOT NULL,
	`assigned_features_json` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`last_validated_at` text,
	`is_valid` integer
);
--> statement-breakpoint
CREATE TABLE `settings_kv` (
	`key` text PRIMARY KEY NOT NULL,
	`value_json` text NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
