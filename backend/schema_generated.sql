-- ============================================================
-- schema_generated.sql — Full database structure
-- Database: game_ai
-- Generated: 2026-03-12T13:02:53.650Z
-- ============================================================

CREATE DATABASE IF NOT EXISTS `game_ai` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `game_ai`;

-- ------------------------------------------------------------
-- Table: balance_log
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `balance_log`;
CREATE TABLE `balance_log` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `match_id` int unsigned DEFAULT NULL,
  `delta` decimal(12,8) NOT NULL,
  `balance_after` decimal(12,8) NOT NULL,
  `reason` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `match_id` (`match_id`),
  CONSTRAINT `balance_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `balance_log_ibfk_2` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4224 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: leaderboard_snapshots
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `leaderboard_snapshots`;
CREATE TABLE `leaderboard_snapshots` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `season_id` int unsigned NOT NULL,
  `robot_id` int unsigned NOT NULL,
  `rank_position` int unsigned NOT NULL,
  `elo` int NOT NULL,
  `wins` int unsigned NOT NULL,
  `losses` int unsigned NOT NULL,
  `draws` int unsigned NOT NULL,
  `snapshotted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `season_id` (`season_id`),
  KEY `robot_id` (`robot_id`),
  CONSTRAINT `leaderboard_snapshots_ibfk_1` FOREIGN KEY (`season_id`) REFERENCES `seasons` (`id`),
  CONSTRAINT `leaderboard_snapshots_ibfk_2` FOREIGN KEY (`robot_id`) REFERENCES `robots` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: match_moves
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `match_moves`;
CREATE TABLE `match_moves` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `match_id` int unsigned NOT NULL,
  `move_number` int unsigned NOT NULL,
  `robot_id` int unsigned NOT NULL,
  `move_uci` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fen_after` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokens_used` int unsigned NOT NULL DEFAULT '0',
  `cost_usd` decimal(12,8) NOT NULL DEFAULT '0.00000000',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `match_id` (`match_id`),
  KEY `robot_id` (`robot_id`),
  CONSTRAINT `match_moves_ibfk_1` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `match_moves_ibfk_2` FOREIGN KEY (`robot_id`) REFERENCES `robots` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4209 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: matches
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `matches`;
CREATE TABLE `matches` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `season_id` int unsigned NOT NULL,
  `game_type` enum('chess','doudizhu') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'chess',
  `robot_white_id` int unsigned NOT NULL,
  `robot_black_id` int unsigned NOT NULL,
  `robot_third_id` int unsigned DEFAULT NULL,
  `robot_landlord_id` int unsigned DEFAULT NULL,
  `status` enum('pending','running','finished','forfeited') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `winner_id` int unsigned DEFAULT NULL,
  `forfeit_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `finished_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `season_id` (`season_id`),
  KEY `robot_white_id` (`robot_white_id`),
  KEY `robot_black_id` (`robot_black_id`),
  KEY `winner_id` (`winner_id`),
  KEY `fk_matches_robot_third` (`robot_third_id`),
  KEY `fk_matches_robot_landlord` (`robot_landlord_id`),
  KEY `idx_matches_game_type` (`game_type`,`status`),
  CONSTRAINT `fk_matches_robot_landlord` FOREIGN KEY (`robot_landlord_id`) REFERENCES `robots` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_matches_robot_third` FOREIGN KEY (`robot_third_id`) REFERENCES `robots` (`id`) ON DELETE SET NULL,
  CONSTRAINT `matches_ibfk_1` FOREIGN KEY (`season_id`) REFERENCES `seasons` (`id`),
  CONSTRAINT `matches_ibfk_2` FOREIGN KEY (`robot_white_id`) REFERENCES `robots` (`id`),
  CONSTRAINT `matches_ibfk_3` FOREIGN KEY (`robot_black_id`) REFERENCES `robots` (`id`),
  CONSTRAINT `matches_ibfk_4` FOREIGN KEY (`winner_id`) REFERENCES `robots` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=586 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: robots
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `robots`;
CREATE TABLE `robots` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `name` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `model` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'google/gemini-flash-1-5',
  `strategy` text COLLATE utf8mb4_unicode_ci,
  `game_type` enum('chess','doudizhu') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'chess',
  `status` enum('active','suspended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `wins` int unsigned NOT NULL DEFAULT '0',
  `losses` int unsigned NOT NULL DEFAULT '0',
  `draws` int unsigned NOT NULL DEFAULT '0',
  `elo` int NOT NULL DEFAULT '1200',
  `points` int DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `provider` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'AI provider (openrouter, openai, anthropic, etc.)',
  `api_key_encrypted` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Encrypted API key',
  `base_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `error_count` int unsigned NOT NULL DEFAULT '0' COMMENT 'Consecutive API error count',
  `removed` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_robots_game_type` (`game_type`,`status`),
  KEY `idx_robots_status_game_type` (`status`,`game_type`),
  KEY `idx_robots_error_count` (`error_count`),
  KEY `idx_robots_removed` (`removed`),
  CONSTRAINT `robots_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: seasons
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `seasons`;
CREATE TABLE `seasons` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `status` enum('active','waiting','ended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `started_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ended_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: user_settings
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `user_settings`;
CREATE TABLE `user_settings` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `user_settings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: users
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `balance` decimal(12,8) NOT NULL DEFAULT '0.10000000',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Table: verification_codes
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `verification_codes`;
CREATE TABLE `verification_codes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` int NOT NULL,
  `used` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
