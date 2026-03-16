CREATE TABLE IF NOT EXISTS user_profiles (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER      UNIQUE NOT NULL,
  username   VARCHAR(50)  NOT NULL,
  email      VARCHAR(100) NOT NULL,
  bio        TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP    DEFAULT NOW(),
  updated_at TIMESTAMP    DEFAULT NOW()
);