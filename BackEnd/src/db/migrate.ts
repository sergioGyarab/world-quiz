import { pool } from './index.js';

const createUsersTable = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    display_name VARCHAR(100),
    avatar_url TEXT,
    nickname_set BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
  );
`;

const createIndexes = `
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
`;

const createScoresTable = `
  CREATE TABLE IF NOT EXISTS scores (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_mode VARCHAR(50) NOT NULL,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    time_taken INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

const createScoresIndex = `
  CREATE INDEX IF NOT EXISTS idx_scores_user_id ON scores(user_id);
  CREATE INDEX IF NOT EXISTS idx_scores_game_mode ON scores(game_mode);
`;

export async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Running database migrations...');
    
    await client.query('BEGIN');
    
    // Create users table
    await client.query(createUsersTable);
    console.log('✅ Users table created/verified');
    
    // Create indexes for users
    await client.query(createIndexes);
    console.log('✅ User indexes created/verified');
    
    // Create scores table
    await client.query(createScoresTable);
    console.log('✅ Scores table created/verified');
    
    // Create scores indexes
    await client.query(createScoresIndex);
    console.log('✅ Score indexes created/verified');
    
    // Add nickname_set column if it doesn't exist (for existing databases)
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='users' AND column_name='nickname_set'
        ) THEN
          ALTER TABLE users ADD COLUMN nickname_set BOOLEAN DEFAULT TRUE;
        END IF;
      END $$;
    `);
    console.log('✅ nickname_set column verified');
    
    await client.query('COMMIT');
    console.log('✅ All migrations completed successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}
