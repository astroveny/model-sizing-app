CREATE TABLE `gpus` (
	`id` text PRIMARY KEY NOT NULL,
	`vendor` text,
	`family` text,
	`model` text,
	`vram_gb` real,
	`memory_type` text,
	`memory_bandwidth_gbps` real,
	`fp16_tflops` real,
	`bf16_tflops` real,
	`fp8_tflops` real,
	`int8_tops` real,
	`int4_tops` real,
	`tdp_watts` integer,
	`interconnect_json` text,
	`supported_features_json` text,
	`list_price_usd` real,
	`availability` text,
	`notes` text,
	`sources_json` text,
	`is_deprecated` integer DEFAULT 0,
	`origin` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `llm_models` (
	`id` text PRIMARY KEY NOT NULL,
	`family` text,
	`name` text,
	`params_b` real,
	`architecture` text,
	`active_params_b` real,
	`layers` integer,
	`hidden_size` integer,
	`num_kv_heads` integer,
	`head_dim` integer,
	`context_length_max` integer,
	`quantizations_supported_json` text,
	`release_date` text,
	`huggingface_id` text,
	`notes` text,
	`is_deprecated` integer DEFAULT 0,
	`origin` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `server_gpu_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`server_id` text NOT NULL,
	`gpu_id` text NOT NULL,
	`gpu_count` integer NOT NULL,
	`interconnect` text,
	`list_price_usd` real,
	`is_default` integer DEFAULT 0,
	FOREIGN KEY (`server_id`) REFERENCES `servers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `servers` (
	`id` text PRIMARY KEY NOT NULL,
	`vendor` text,
	`model` text,
	`cpu` text,
	`memory_gb` real,
	`storage` text,
	`network` text,
	`tdp_watts` integer,
	`rack_units` integer,
	`release_year` integer,
	`spec_sheet_url` text,
	`notes` text,
	`is_deprecated` integer DEFAULT 0,
	`origin` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workload_references` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text,
	`url` text,
	`description` text,
	`sort_order` integer,
	`is_deprecated` integer DEFAULT 0,
	`origin` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
