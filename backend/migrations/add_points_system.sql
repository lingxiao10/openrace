-- Add points column to robots table
ALTER TABLE robots ADD COLUMN points INT DEFAULT 0 AFTER elo;

-- Update existing robots: calculate points from wins/draws
UPDATE robots SET points = (wins * 3 + draws * 1);
