-- Migration: Add forfeit_robot_id to matches table
-- Date: 2026-03-09
-- Description: Track which robot caused the forfeit

ALTER TABLE matches
ADD COLUMN forfeit_robot_id INT UNSIGNED NULL
AFTER forfeit_reason;

ALTER TABLE matches
ADD CONSTRAINT fk_matches_forfeit_robot
FOREIGN KEY (forfeit_robot_id) REFERENCES robots(id) ON DELETE SET NULL;
