-- Peace Bridge Database Migration
-- Run this in Supabase SQL Editor (paste all at once)

-- Step 1: Add columns to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS mode text DEFAULT 'mediation';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS scenario_id uuid;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ended_at timestamptz;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS roleplay_memory jsonb;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS conflict_trajectory jsonb DEFAULT '[]';

-- Step 2: Create scenarios table
CREATE TABLE IF NOT EXISTS scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  context text NOT NULL,
  difficulty text CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  role_type text,
  tags text[],
  system_prompt text NOT NULL,
  starter_message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Step 3: Add new columns to existing scenarios table (safe to re-run)
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS role_type text;
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS tags text[];

-- Step 4: Seed starter scenarios (safe to re-run)
INSERT INTO scenarios (title, context, difficulty, role_type, tags, system_prompt, starter_message)
SELECT
  'Roommate Conflict',
  'Your roommate keeps leaving dishes in the sink. You need to address this calmly.',
  'beginner',
  'peer',
  ARRAY['chores', 'boundaries', 'daily life'],
  'You are Jamie, a college student sharing an apartment. You are frustrated about chores but willing to talk. You tend to get defensive at first but can be reasoned with. Respond naturally, not perfectly. You may misunderstand or need clarification. Stay in character as Jamie throughout.',
  'Hey... look, I know you want to talk about the apartment stuff. I''m listening, but I want you to know I''ve been pretty stressed lately too.'
WHERE NOT EXISTS (SELECT 1 FROM scenarios WHERE title = 'Roommate Conflict');

INSERT INTO scenarios (title, context, difficulty, role_type, tags, system_prompt, starter_message)
SELECT
  'Workplace Tension',
  'A coworker took credit for your idea in a team meeting. You need to address it professionally.',
  'intermediate',
  'colleague',
  ARRAY['credit', 'professional', 'assertiveness'],
  'You are Alex, a coworker at a mid-size company. You genuinely did not realize you were taking someone else''s credit. You are slightly embarrassed when confronted but defensive. You are professional but proud. Stay in character as Alex. Do not apologize immediately.',
  'Oh, hey. You wanted to talk about the meeting this morning? Sure, I have a few minutes.'
WHERE NOT EXISTS (SELECT 1 FROM scenarios WHERE title = 'Workplace Tension');

INSERT INTO scenarios (title, context, difficulty, role_type, tags, system_prompt, starter_message)
SELECT
  'Family Disagreement',
  'A family member keeps making critical comments about your life choices. You need to set a boundary.',
  'advanced',
  'family',
  ARRAY['boundaries', 'family', 'values'],
  'You are a parent figure who believes you are being helpful and genuinely loves this person, but holds traditional views. You do not see your comments as criticism, you see them as guidance. You may push back or express hurt when confronted. Stay in character throughout. Do not change your position easily.',
  'I was wondering when we would get a chance to sit down. You know I only ever want what is best for you, right?'
WHERE NOT EXISTS (SELECT 1 FROM scenarios WHERE title = 'Family Disagreement');
