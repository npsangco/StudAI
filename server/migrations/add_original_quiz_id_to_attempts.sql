-- Add original_quiz_id column to quiz_attempts table for unified leaderboards
-- This allows tracking which original quiz an imported/shared quiz came from
-- Run this migration on the database

ALTER TABLE quiz_attempts 
ADD COLUMN original_quiz_id INT NULL AFTER quiz_id,
ADD CONSTRAINT fk_quiz_attempts_original_quiz
  FOREIGN KEY (original_quiz_id) 
  REFERENCES quizzes(quiz_id) 
  ON DELETE SET NULL;

-- Add index for better leaderboard query performance
CREATE INDEX idx_original_quiz_id ON quiz_attempts(original_quiz_id);

-- Optional: Update existing attempts to populate original_quiz_id from their quiz's original_quiz_id
UPDATE quiz_attempts qa
INNER JOIN quizzes q ON qa.quiz_id = q.quiz_id
SET qa.original_quiz_id = q.original_quiz_id
WHERE q.original_quiz_id IS NOT NULL;
