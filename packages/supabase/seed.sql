INSERT INTO achievements (id, name, description, reward_points) VALUES
  ('FIRST_BLOOD', 'First Blood', 'Capture a piece in your first 5 moves.', 50),
  ('CASTLE_CRASHER', 'Castle Crasher', 'Deliver checkmate while your king is castled.', 100),
  ('QUEEN_SAC', 'Botez Gambit', 'Sacrifice your queen and win the match.', 500),
  ('FISCHER_MASTER', 'Fischer Master', 'Win 10 Chess960 matches in a row.', 1000)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  description = EXCLUDED.description, 
  reward_points = EXCLUDED.reward_points;
