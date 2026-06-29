import path from 'path';
import fs from 'fs';

// Use a writable path for production (Cloud Run) and local process.cwd() for development
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/tmp/database.json' 
  : path.resolve(process.cwd(), 'database.json');

// Interface defining our tables in the JSON structure
interface DatabaseSchema {
  players: Record<string, any>;
  player_archives_progress: Record<string, any>; // composite key: username + "::" + archive_url
  cached_games: Record<string, any>; // key: game_id
}

// In-memory data store acting as single source of truth
let data: DatabaseSchema = {
  players: {},
  player_archives_progress: {},
  cached_games: {}
};

// Queue for saving to prevent concurrent disk write issues
let isSaving = false;
let pendingSave = false;

// Dummy database handle for backward compatibility
export const db = {
  close: (callback?: (err: Error | null) => void) => {
    if (callback) callback(null);
  }
};

/**
 * Persists the in-memory state to disk atomically.
 */
function saveDb() {
  if (isSaving) {
    pendingSave = true;
    return;
  }
  isSaving = true;
  try {
    const tempPath = dbPath + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, dbPath);
  } catch (err) {
    console.error('Error saving JSON database:', err);
  } finally {
    isSaving = false;
    if (pendingSave) {
      pendingSave = false;
      saveDb();
    }
  }
}

/**
 * Loads the database state from disk.
 */
export function loadDb() {
  try {
    if (fs.existsSync(dbPath)) {
      const content = fs.readFileSync(dbPath, 'utf8');
      const parsed = JSON.parse(content);
      data = {
        players: parsed.players || {},
        player_archives_progress: parsed.player_archives_progress || {},
        cached_games: parsed.cached_games || {}
      };
      console.log('Successfully loaded JSON database from:', dbPath);
    } else {
      console.log('No database file found. Initializing fresh JSON storage at:', dbPath);
      data = {
        players: {},
        player_archives_progress: {},
        cached_games: {}
      };
      saveDb();
    }
  } catch (err) {
    console.error('Error loading JSON database, initializing empty store:', err);
    data = {
      players: {},
      player_archives_progress: {},
      cached_games: {}
    };
  }
}

// Ensure the database is loaded on startup
loadDb();

/**
 * Helper to run write queries (INSERT, UPDATE) with promise
 */
export function dbRun(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve) => {
    const normalizedSql = sql.replace(/\s+/g, ' ').trim();

    // 1. CREATE TABLE (Ignored as schema is handled by JS collections)
    if (normalizedSql.toUpperCase().startsWith('CREATE TABLE')) {
      resolve({ lastID: 0, changes: 0 });
      return;
    }

    // 2. INSERT OR IGNORE INTO player_archives_progress
    if (normalizedSql.includes('player_archives_progress') && (normalizedSql.includes('INSERT OR IGNORE') || normalizedSql.includes('INSERT INTO'))) {
      const [username, archive_url] = params;
      if (username && archive_url) {
        const key = `${username.toLowerCase()}::${archive_url}`;
        if (!data.player_archives_progress[key]) {
          data.player_archives_progress[key] = {
            username: username.toLowerCase(),
            archive_url: archive_url,
            status: 'pending',
            games_count: 0,
            processed_games: 0
          };
          saveDb();
        }
      }
      resolve({ lastID: 1, changes: 1 });
      return;
    }

    // 3. UPDATE player_archives_progress SET status = 'fetching' (or similar with status param)
    if (normalizedSql.includes('UPDATE player_archives_progress') && normalizedSql.includes('status = ?')) {
      const [status, username, archive_url] = params;
      const key = `${username.toLowerCase()}::${archive_url}`;
      if (data.player_archives_progress[key]) {
        data.player_archives_progress[key].status = status;
        saveDb();
      }
      resolve({ lastID: 0, changes: 1 });
      return;
    } else if (normalizedSql.includes('UPDATE player_archives_progress') && normalizedSql.includes("status = 'fetching'")) {
      const [username, archive_url] = params;
      const key = `${username.toLowerCase()}::${archive_url}`;
      if (data.player_archives_progress[key]) {
        data.player_archives_progress[key].status = 'fetching';
        saveDb();
      }
      resolve({ lastID: 0, changes: 1 });
      return;
    }

    // 4. UPDATE player_archives_progress SET games_count = ?
    if (normalizedSql.includes('UPDATE player_archives_progress') && normalizedSql.includes('games_count = ?')) {
      const [games_count, username, archive_url] = params;
      const key = `${username.toLowerCase()}::${archive_url}`;
      if (data.player_archives_progress[key]) {
        data.player_archives_progress[key].games_count = Number(games_count);
        saveDb();
      }
      resolve({ lastID: 0, changes: 1 });
      return;
    }

    // 5. UPDATE player_archives_progress SET processed_games = ?
    if (normalizedSql.includes('UPDATE player_archives_progress') && normalizedSql.includes('processed_games = ?')) {
      const [processed_games, username, archive_url] = params;
      const key = `${username.toLowerCase()}::${archive_url}`;
      if (data.player_archives_progress[key]) {
        data.player_archives_progress[key].processed_games = Number(processed_games);
        saveDb();
      }
      resolve({ lastID: 0, changes: 1 });
      return;
    }

    // 6. UPDATE player_archives_progress SET status = 'analyzed'
    if (normalizedSql.includes('UPDATE player_archives_progress') && normalizedSql.includes("status = 'analyzed'")) {
      const [username, archive_url] = params;
      const key = `${username.toLowerCase()}::${archive_url}`;
      if (data.player_archives_progress[key]) {
        data.player_archives_progress[key].status = 'analyzed';
        saveDb();
      }
      resolve({ lastID: 0, changes: 1 });
      return;
    }

    // 7. UPDATE player_archives_progress SET status = 'failed'
    if (normalizedSql.includes('UPDATE player_archives_progress') && normalizedSql.includes("status = 'failed'")) {
      const [username, archive_url] = params;
      const key = `${username.toLowerCase()}::${archive_url}`;
      if (data.player_archives_progress[key]) {
        data.player_archives_progress[key].status = 'failed';
        saveDb();
      }
      resolve({ lastID: 0, changes: 1 });
      return;
    }

    // 8. INSERT OR REPLACE INTO cached_games
    if (normalizedSql.includes('cached_games') && (normalizedSql.includes('INSERT OR REPLACE') || normalizedSql.includes('INSERT INTO'))) {
      const [
        game_id, username, white_username, black_username,
        white_rating, black_rating, white_result, black_result,
        date, time_class, time_control, color, result, pgn, opening,
        white_accuracy, black_accuracy, analysis_json
      ] = params;

      data.cached_games[game_id] = {
        game_id,
        username: username.toLowerCase(),
        white_username,
        black_username,
        white_rating: Number(white_rating),
        black_rating: Number(black_rating),
        white_result,
        black_result,
        date,
        time_class,
        time_control,
        color,
        result,
        pgn,
        opening,
        white_accuracy: Number(white_accuracy),
        black_accuracy: Number(black_accuracy),
        is_detailed_analyzed: 0,
        analysis_json
      };
      saveDb();
      resolve({ lastID: 1, changes: 1 });
      return;
    }

    // 9. UPDATE cached_games SET is_detailed_analyzed = 1
    if (normalizedSql.includes('UPDATE cached_games') && normalizedSql.includes('is_detailed_analyzed = 1')) {
      const [analysis_json, game_id] = params;
      if (data.cached_games[game_id]) {
        data.cached_games[game_id].is_detailed_analyzed = 1;
        data.cached_games[game_id].analysis_json = analysis_json;
        saveDb();
      }
      resolve({ lastID: 0, changes: 1 });
      return;
    }

    // 10. INSERT OR REPLACE INTO players
    if (normalizedSql.includes('players') && (normalizedSql.includes('INSERT OR REPLACE') || normalizedSql.includes('INSERT INTO'))) {
      const [
        username, last_fetched, current_rating, highest_rating, total_games,
        total_wins, total_losses, total_draws, years_active, total_moves, avg_accuracy,
        brilliant_count, great_count, best_count, excellent_count, good_count,
        inaccuracy_count, mistake_count, blunder_count, favorite_opening, best_opening,
        opening_intel
      ] = params;

      const key = username.toLowerCase();
      data.players[key] = {
        username: key,
        last_fetched: Number(last_fetched),
        current_rating: Number(current_rating),
        highest_rating: Number(highest_rating),
        total_games: Number(total_games),
        total_wins: Number(total_wins),
        total_losses: Number(total_losses),
        total_draws: Number(total_draws),
        years_active: Number(years_active),
        total_moves: Number(total_moves),
        avg_accuracy: Number(avg_accuracy),
        brilliant_count: Number(brilliant_count),
        great_count: Number(great_count),
        best_count: Number(best_count),
        excellent_count: Number(excellent_count),
        good_count: Number(good_count),
        inaccuracy_count: Number(inaccuracy_count),
        mistake_count: Number(mistake_count),
        blunder_count: Number(blunder_count),
        favorite_opening,
        best_opening,
        opening_intel,
        dna_report: data.players[key]?.dna_report || null,
        ai_insights: data.players[key]?.ai_insights || null
      };
      saveDb();
      resolve({ lastID: 1, changes: 1 });
      return;
    }

    // 11. UPDATE players SET dna_report = ?, ai_insights = ?
    if (normalizedSql.includes('UPDATE players') && normalizedSql.includes('dna_report = ?')) {
      const [dna_report, ai_insights, username] = params;
      const key = username.toLowerCase();
      if (data.players[key]) {
        data.players[key].dna_report = dna_report;
        data.players[key].ai_insights = ai_insights;
        saveDb();
      }
      resolve({ lastID: 0, changes: 1 });
      return;
    }

    // Log unknown operations just in case
    console.warn('Unhandled SQL Write operation:', normalizedSql, params);
    resolve({ lastID: 0, changes: 0 });
  });
}

/**
 * Helper to get single row (SELECT ... LIMIT 1 or match-by-key)
 */
export function dbGet<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve) => {
    const normalizedSql = sql.replace(/\s+/g, ' ').trim().toLowerCase();

    // 1. SELECT * FROM cached_games WHERE game_id = ?
    if (normalizedSql.includes('from cached_games') && normalizedSql.includes('game_id = ?')) {
      const [gameId] = params;
      const game = data.cached_games[gameId];
      resolve(game as T | undefined);
      return;
    }

    // 2. SELECT * FROM players WHERE username = ?
    if (normalizedSql.includes('from players') && normalizedSql.includes('username = ?')) {
      const [username] = params;
      if (username) {
        const key = username.toLowerCase();
        const player = data.players[key];
        resolve(player as T | undefined);
      } else {
        resolve(undefined);
      }
      return;
    }

    console.warn('Unhandled SQL Get operation:', normalizedSql, params);
    resolve(undefined);
  });
}

/**
 * Helper to get all rows (SELECT with multiple matches)
 */
export function dbAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve) => {
    const normalizedSql = sql.replace(/\s+/g, ' ').trim().toLowerCase();

    // 1. SELECT * FROM cached_games WHERE username = ?
    if (normalizedSql.includes('from cached_games') && normalizedSql.includes('username = ?')) {
      const [username] = params;
      if (!username) {
        resolve([]);
        return;
      }
      const filterUser = username.toLowerCase();
      let results = Object.values(data.cached_games).filter(
        (g: any) => g.username === filterUser
      );
      
      // Handle Sorting
      if (normalizedSql.includes('order by date asc')) {
        results.sort((a: any, b: any) => a.date.localeCompare(b.date));
      } else {
        // Default DESC
        results.sort((a: any, b: any) => b.date.localeCompare(a.date));
      }

      // Handle Limit
      if (normalizedSql.includes('limit 20')) {
        results = results.slice(0, 20);
      }

      resolve(results as T[]);
      return;
    }

    // 2. SELECT status, games_count, processed_games FROM player_archives_progress WHERE username = ?
    if (normalizedSql.includes('from player_archives_progress') && normalizedSql.includes('username = ?')) {
      const [username] = params;
      if (!username) {
        resolve([]);
        return;
      }
      const filterUser = username.toLowerCase();
      const results = Object.values(data.player_archives_progress)
        .filter((p: any) => p.username === filterUser)
        .map((p: any) => ({
          status: p.status,
          games_count: p.games_count,
          processed_games: p.processed_games
        }));
      resolve(results as T[]);
      return;
    }

    console.warn('Unhandled SQL All operation:', normalizedSql, params);
    resolve([]);
  });
}

/**
 * Mock database initialization (automatic schema setup)
 */
export async function initDb(): Promise<void> {
  console.log('JSON Database Engine initialized successfully.');
}
