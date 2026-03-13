-- ============================================================
-- schema.sql — Complete database schema (safe to re-run)
-- All statements use IF NOT EXISTS — will not overwrite data.
-- ============================================================

CREATE DATABASE IF NOT EXISTS `openrace` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id`            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `username`      VARCHAR(50)   NOT NULL,
  `email`         VARCHAR(120)  NOT NULL,
  `password_hash` VARCHAR(128)  NOT NULL,
  `role`          VARCHAR(20)   NOT NULL DEFAULT 'user',
  `balance`       DECIMAL(12,8) NOT NULL DEFAULT 0.10000000,
  `created_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_settings` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED NOT NULL,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `user_settings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `seasons` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `status`     ENUM('active','waiting','ended') NOT NULL DEFAULT 'active',
  `started_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ended_at`   DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `robots` (
  `id`                INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `user_id`           INT UNSIGNED  NOT NULL,
  `name`              VARCHAR(80)   NOT NULL,
  `model`             VARCHAR(120)  NOT NULL DEFAULT 'deepseek-v3-2-251201',
  `strategy`          TEXT          DEFAULT NULL,
  `game_type`         ENUM('chess','doudizhu') NOT NULL DEFAULT 'chess',
  `provider`          VARCHAR(50)   DEFAULT NULL,
  `api_key_encrypted` VARCHAR(512)  DEFAULT NULL,
  `base_url`          VARCHAR(255)  DEFAULT NULL,
  `status`            ENUM('active','suspended') NOT NULL DEFAULT 'active',
  `wins`              INT UNSIGNED  NOT NULL DEFAULT 0,
  `losses`            INT UNSIGNED  NOT NULL DEFAULT 0,
  `draws`             INT UNSIGNED  NOT NULL DEFAULT 0,
  `elo`               INT           NOT NULL DEFAULT 1200,
  `points`            INT           NOT NULL DEFAULT 0,
  `error_count`       INT UNSIGNED  NOT NULL DEFAULT 0,
  `removed`           TINYINT(1)    NOT NULL DEFAULT 0,
  `created_at`        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_robots_game_type` (`game_type`,`status`),
  KEY `idx_robots_removed` (`removed`),
  CONSTRAINT `robots_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `matches` (
  `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `season_id`        INT UNSIGNED NOT NULL,
  `game_type`        ENUM('chess','doudizhu') NOT NULL DEFAULT 'chess',
  `robot_white_id`   INT UNSIGNED NOT NULL,
  `robot_black_id`   INT UNSIGNED NOT NULL,
  `robot_third_id`   INT UNSIGNED DEFAULT NULL,
  `robot_landlord_id` INT UNSIGNED DEFAULT NULL,
  `status`           ENUM('pending','running','finished','forfeited') NOT NULL DEFAULT 'pending',
  `winner_id`        INT UNSIGNED DEFAULT NULL,
  `forfeit_reason`   VARCHAR(255) DEFAULT NULL,
  `forfeit_robot_id` INT UNSIGNED DEFAULT NULL,
  `started_at`       DATETIME DEFAULT NULL,
  `finished_at`      DATETIME DEFAULT NULL,
  `created_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `season_id` (`season_id`),
  KEY `robot_white_id` (`robot_white_id`),
  KEY `robot_black_id` (`robot_black_id`),
  KEY `winner_id` (`winner_id`),
  KEY `fk_matches_robot_third` (`robot_third_id`),
  KEY `fk_matches_robot_landlord` (`robot_landlord_id`),
  KEY `idx_matches_game_type` (`game_type`,`status`),
  CONSTRAINT `matches_ibfk_1` FOREIGN KEY (`season_id`) REFERENCES `seasons` (`id`),
  CONSTRAINT `matches_ibfk_2` FOREIGN KEY (`robot_white_id`) REFERENCES `robots` (`id`),
  CONSTRAINT `matches_ibfk_3` FOREIGN KEY (`robot_black_id`) REFERENCES `robots` (`id`),
  CONSTRAINT `matches_ibfk_4` FOREIGN KEY (`winner_id`) REFERENCES `robots` (`id`),
  CONSTRAINT `fk_matches_robot_third` FOREIGN KEY (`robot_third_id`) REFERENCES `robots` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_matches_robot_landlord` FOREIGN KEY (`robot_landlord_id`) REFERENCES `robots` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `match_moves` (
  `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `match_id`    INT UNSIGNED  NOT NULL,
  `move_number` INT UNSIGNED  NOT NULL,
  `robot_id`    INT UNSIGNED  NOT NULL,
  `move_uci`    VARCHAR(255)  NOT NULL,
  `fen_after`   TEXT          NOT NULL,
  `tokens_used` INT UNSIGNED  NOT NULL DEFAULT 0,
  `cost_usd`    DECIMAL(12,8) NOT NULL DEFAULT 0,
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `match_id` (`match_id`),
  KEY `robot_id` (`robot_id`),
  CONSTRAINT `match_moves_ibfk_1` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `match_moves_ibfk_2` FOREIGN KEY (`robot_id`) REFERENCES `robots` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `balance_log` (
  `id`           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `user_id`      INT UNSIGNED  NOT NULL,
  `match_id`     INT UNSIGNED  DEFAULT NULL,
  `delta`        DECIMAL(12,8) NOT NULL,
  `balance_after` DECIMAL(12,8) NOT NULL,
  `reason`       VARCHAR(120)  NOT NULL,
  `created_at`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `match_id` (`match_id`),
  CONSTRAINT `balance_log_ibfk_1` FOREIGN KEY (`user_id`)  REFERENCES `users` (`id`),
  CONSTRAINT `balance_log_ibfk_2` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `leaderboard_snapshots` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `season_id`     INT UNSIGNED NOT NULL,
  `robot_id`      INT UNSIGNED NOT NULL,
  `rank_position` INT UNSIGNED NOT NULL,
  `elo`           INT          NOT NULL,
  `wins`          INT UNSIGNED NOT NULL,
  `losses`        INT UNSIGNED NOT NULL,
  `draws`         INT UNSIGNED NOT NULL,
  `snapshotted_at` DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `season_id` (`season_id`),
  KEY `robot_id` (`robot_id`),
  CONSTRAINT `leaderboard_snapshots_ibfk_1` FOREIGN KEY (`season_id`) REFERENCES `seasons` (`id`),
  CONSTRAINT `leaderboard_snapshots_ibfk_2` FOREIGN KEY (`robot_id`)  REFERENCES `robots` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `verification_codes` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `email`      VARCHAR(255) NOT NULL,
  `code`       VARCHAR(10)  NOT NULL,
  `created_at` INT          NOT NULL,
  `used`       TINYINT(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed first season if none exists
INSERT INTO seasons (status) SELECT 'active' FROM dual WHERE NOT EXISTS (SELECT 1 FROM seasons LIMIT 1);
