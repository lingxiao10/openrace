-- Migration: Add soft delete support for robots
-- Description: Adds 'removed' column to robots table and indexes it.

ALTER TABLE robots ADD COLUMN removed TINYINT(1) NOT NULL DEFAULT 0;
CREATE INDEX idx_robots_removed ON robots(removed);
