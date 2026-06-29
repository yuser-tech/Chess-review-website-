import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

// Use a writable path for production (Cloud Run) and local process.cwd() for development
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/tmp/database.sqlite' 
  : path.resolve(process.cwd(), 'database.sqlite');

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

// Helper to run query with promise
export function dbRun(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// Helper to get single row
export function dbGet<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T | undefined);
    });
  });
}

// Helper to get all rows
export function dbAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

// Initialize database schema
export async function initDb(): Promise<void> {
  console.log('Initializing database tables...');

  // 1. Players Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS players (
      username TEXT PRIMARY KEY,
      last_fetched INTEGER,
      current_rating INTEGER,
      highest_rating INTEGER,
      total_games INTEGER,
      total_wins INTEGER,
      total_losses INTEGER,
      total_draws INTEGER,
      years_active INTEGER,
      total_moves INTEGER,
      avg_accuracy REAL,
      brilliant_count INTEGER,
      great_count INTEGER,
      best_count INTEGER,
      excellent_count INTEGER,
      good_count INTEGER,
      inaccuracy_count INTEGER,
      mistake_count INTEGER,
      blunder_count INTEGER,
      favorite_opening TEXT,
      best_opening TEXT,
      dna_report TEXT,
      ai_insights TEXT,
      opening_intel TEXT
    )
  `);

  // 2. Archives Progress Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS player_archives_progress (
      username TEXT,
      archive_url TEXT,
      status TEXT, -- 'pending', 'fetching', 'analyzed', 'failed'
      games_count INTEGER DEFAULT 0,
      processed_games INTEGER DEFAULT 0,
      PRIMARY KEY (username, archive_url)
    )
  `);

  // 3. Cached Games Table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS cached_games (
      game_id TEXT PRIMARY KEY,
      username TEXT,
      white_username TEXT,
      black_username TEXT,
      white_rating INTEGER,
      black_rating INTEGER,
      white_result TEXT,
      black_result TEXT,
      date TEXT,
      time_class TEXT, -- 'rapid', 'blitz', 'bullet', 'daily'
      time_control TEXT,
      color TEXT, -- 'white' or 'black'
      result TEXT, -- 'win', 'loss', 'draw'
      pgn TEXT,
      opening TEXT,
      white_accuracy REAL,
      black_accuracy REAL,
      is_detailed_analyzed INTEGER DEFAULT 0,
      analysis_json TEXT
    )
  `);

  console.log('Database tables initialized successfully.');
}
