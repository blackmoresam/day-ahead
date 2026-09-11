CREATE TABLE `plans` (
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`user_id`, `date`)
);
