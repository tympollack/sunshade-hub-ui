INSERT INTO chess.achievements (id, name, description, reward_points) VALUES
  ('FIRST_BLOOD', 'First Blood', 'Capture a piece in your first 5 moves.', 50),
  ('CASTLE_CRASHER', 'Castle Crasher', 'Deliver checkmate while your king is castled.', 100),
  ('QUEEN_SAC', 'Botez Gambit', 'Sacrifice your queen and win the match.', 500),
  ('FISCHER_MASTER', 'Fischer Master', 'Win 10 Chess960 matches in a row.', 1000)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  description = EXCLUDED.description, 
  reward_points = EXCLUDED.reward_points;

INSERT INTO public.hub_achievements (id, name, description, reward_tokens) VALUES
  ('EARLY_ADOPTER', 'Early Adopter', 'Create an account during the Beta phase.', 2000),
  ('7_DAY_STREAK', 'Week Warrior', 'Log into the SunShade Hub for 7 consecutive days.', 500),
  ('GOVERNANCE_VOTER', 'Civic Duty', 'Cast your first vote in a Community Poll.', 100)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  description = EXCLUDED.description, 
  reward_tokens = EXCLUDED.reward_tokens;
