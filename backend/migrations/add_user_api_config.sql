-- ============================================================
-- Migration: Add user API configuration to robots table
-- ============================================================

USE game_ai;

-- Add provider, encrypted API key, and error tracking to robots table
ALTER TABLE robots
  ADD COLUMN provider VARCHAR(50) DEFAULT NULL COMMENT 'AI provider (openrouter, openai, anthropic, etc.)',
  ADD COLUMN api_key_encrypted VARCHAR(512) DEFAULT NULL COMMENT 'Encrypted API key',
  ADD COLUMN error_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Consecutive API error count',
  ADD COLUMN game_type ENUM('chess','doudizhu') NOT NULL DEFAULT 'chess' COMMENT 'Game type',
  ADD COLUMN points INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Season points (win=3, draw=1, loss=0)';

-- Remove openrouter_key from user_settings (no longer needed)
ALTER TABLE user_settings DROP COLUMN IF EXISTS openrouter_key;

-- Add index for faster queries
CREATE INDEX idx_robots_status_game_type ON robots(status, game_type);
CREATE INDEX idx_robots_error_count ON robots(error_count);
