-- Migration: Add Doudizhu Support
-- Date: 2026-03-09
-- Description: Extends database schema to support 3-player Doudizhu game alongside Chess

-- 1. Add game_type to robots table (skip if exists)
ALTER TABLE robots
ADD COLUMN IF NOT EXISTS game_type ENUM('chess', 'doudizhu') NOT NULL DEFAULT 'chess'
AFTER strategy;

-- 2. Extend matches table for 3-player games
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS game_type ENUM('chess', 'doudizhu') NOT NULL DEFAULT 'chess'
AFTER season_id;

ALTER TABLE matches
ADD COLUMN IF NOT EXISTS robot_third_id INT UNSIGNED NULL
AFTER robot_black_id;

ALTER TABLE matches
ADD COLUMN IF NOT EXISTS robot_landlord_id INT UNSIGNED NULL
AFTER robot_third_id;

-- Add foreign keys (skip if exists)
ALTER TABLE matches
ADD CONSTRAINT IF NOT EXISTS fk_matches_robot_third
FOREIGN KEY (robot_third_id) REFERENCES robots(id) ON DELETE SET NULL;

ALTER TABLE matches
ADD CONSTRAINT IF NOT EXISTS fk_matches_robot_landlord
FOREIGN KEY (robot_landlord_id) REFERENCES robots(id) ON DELETE SET NULL;

-- 3. Extend match_moves table for card sequences
ALTER TABLE match_moves
MODIFY COLUMN move_uci VARCHAR(255) NOT NULL;

ALTER TABLE match_moves
MODIFY COLUMN fen_after TEXT NOT NULL;

-- Add indexes for game_type queries (use status instead of is_active)
CREATE INDEX IF NOT EXISTS idx_robots_game_type ON robots(game_type, status);
CREATE INDEX IF NOT EXISTS idx_matches_game_type ON matches(game_type, status);
