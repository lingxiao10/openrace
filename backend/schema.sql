-- ============================================================
-- schema.sql — Run once to initialize the database
-- ============================================================

CREATE DATABASE IF NOT EXISTS game_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE game_ai;

CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)   NOT NULL UNIQUE,
  email         VARCHAR(120)  NOT NULL UNIQUE,
  password_hash VARCHAR(128)  NOT NULL,
  role          VARCHAR(20)   NOT NULL DEFAULT 'user',
  balance       DECIMAL(12,8) NOT NULL DEFAULT 0.10000000,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_settings (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NOT NULL UNIQUE,
  openrouter_key  VARCHAR(512) DEFAULT NULL,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS robots (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id            INT UNSIGNED NOT NULL,
  name               VARCHAR(80)  NOT NULL,
  model              VARCHAR(120) NOT NULL DEFAULT 'google/gemini-flash-1-5',
  strategy           TEXT         DEFAULT NULL,
  game_type          ENUM('chess','doudizhu') NOT NULL DEFAULT 'chess',
  provider           VARCHAR(50)  NOT NULL DEFAULT 'openrouter',
  api_key_encrypted  TEXT         NOT NULL,
  base_url           VARCHAR(255) DEFAULT NULL,
  status             ENUM('active','suspended') NOT NULL DEFAULT 'active',
  wins               INT UNSIGNED NOT NULL DEFAULT 0,
  losses             INT UNSIGNED NOT NULL DEFAULT 0,
  draws              INT UNSIGNED NOT NULL DEFAULT 0,
  elo                INT          NOT NULL DEFAULT 1200,
  removed            TINYINT(1)   NOT NULL DEFAULT 0,
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_robots_removed (removed)
);

CREATE TABLE IF NOT EXISTS seasons (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  status      ENUM('active','waiting','ended') NOT NULL DEFAULT 'active',
  started_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at    DATETIME DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS matches (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  season_id       INT UNSIGNED NOT NULL,
  robot_white_id  INT UNSIGNED NOT NULL,
  robot_black_id  INT UNSIGNED NOT NULL,
  status          ENUM('pending','running','finished','forfeited') NOT NULL DEFAULT 'pending',
  winner_id       INT UNSIGNED DEFAULT NULL,
  forfeit_reason  VARCHAR(255) DEFAULT NULL,
  started_at      DATETIME DEFAULT NULL,
  finished_at     DATETIME DEFAULT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (season_id)      REFERENCES seasons(id),
  FOREIGN KEY (robot_white_id) REFERENCES robots(id),
  FOREIGN KEY (robot_black_id) REFERENCES robots(id),
  FOREIGN KEY (winner_id)      REFERENCES robots(id)
);

CREATE TABLE IF NOT EXISTS match_moves (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  match_id    INT UNSIGNED NOT NULL,
  move_number INT UNSIGNED NOT NULL,
  robot_id    INT UNSIGNED NOT NULL,
  move_uci    VARCHAR(10)  NOT NULL,
  fen_after   VARCHAR(120) NOT NULL,
  tokens_used INT UNSIGNED NOT NULL DEFAULT 0,
  cost_usd    DECIMAL(12,8) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (robot_id) REFERENCES robots(id)
);

CREATE TABLE IF NOT EXISTS balance_log (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  match_id      INT UNSIGNED DEFAULT NULL,
  delta         DECIMAL(12,8) NOT NULL,
  balance_after DECIMAL(12,8) NOT NULL,
  reason        VARCHAR(120) NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)  REFERENCES users(id),
  FOREIGN KEY (match_id) REFERENCES matches(id)
);

CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  season_id      INT UNSIGNED NOT NULL,
  robot_id       INT UNSIGNED NOT NULL,
  rank_position  INT UNSIGNED NOT NULL,
  elo            INT          NOT NULL,
  wins           INT UNSIGNED NOT NULL,
  losses         INT UNSIGNED NOT NULL,
  draws          INT UNSIGNED NOT NULL,
  snapshotted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (season_id) REFERENCES seasons(id),
  FOREIGN KEY (robot_id)  REFERENCES robots(id)
);

-- Seed first season
INSERT INTO seasons (status) VALUES ('active');
