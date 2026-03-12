-- Migration: Add error_count column to robots table
-- Description: Tracks consecutive AI call failures per robot for auto-suspend logic.

ALTER TABLE robots ADD COLUMN error_count INT UNSIGNED NOT NULL DEFAULT 0;
