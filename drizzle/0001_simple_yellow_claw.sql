CREATE TABLE `devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`deviceId` varchar(255) NOT NULL,
	`searchCount` int NOT NULL DEFAULT 0,
	`isPremium` boolean NOT NULL DEFAULT false,
	`firstSeen` timestamp NOT NULL DEFAULT (now()),
	`lastSeen` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `devices_id` PRIMARY KEY(`id`),
	CONSTRAINT `devices_deviceId_unique` UNIQUE(`deviceId`)
);
