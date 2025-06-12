-- Add missing available_hints column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS available_hints INTEGER DEFAULT 5 CHECK (available_hints >= 0);

-- Update existing profiles to have default hints
UPDATE user_profiles 
SET available_hints = 5 
WHERE available_hints IS NULL;

-- Update the trigger function to include skill_level and available_hints
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, name, skill_level, available_hints)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'skill_level', 'Beginner'),
    5
  );
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Recreate the trigger (just to be safe)
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
CREATE TRIGGER create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile(); 