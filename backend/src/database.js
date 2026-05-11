const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');

const dbPath = process.env.DB_PATH || './database/laikipia_lost_found.db';

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ Database connected successfully');
});

// Promisify database methods
const dbAll = promisify(db.all.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbRun = promisify(db.run.bind(db));

// Test connection on startup
async function testConnection() {
  try {
    await dbGet('SELECT 1');
    console.log('✅ Database connected successfully');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
}

// Helper query function
async function query(sql, params = []) {
  const upper = sql.trim().toUpperCase();
  if (upper.startsWith('SELECT') || upper.startsWith('PRAGMA')) {
    return await dbAll(sql, params);
  }

  return await new Promise((resolve, reject) => {
    const stmt = db.run(sql, params, function (err) {
      if (err) return reject(err);
      const result = { lastID: this.lastID, changes: this.changes };
      if (result.lastID !== undefined) {
        result.insertId = result.lastID;
      }
      resolve(result);
    });
  });
}

// Helper for single row
async function queryOne(sql, params = []) {
  return await dbGet(sql, params);
}

// Transaction helper
async function transaction(callback) {
  return new Promise((resolve, reject) => {
    db.run('BEGIN TRANSACTION', async (err) => {
      if (err) return reject(err);
      try {
        const result = await callback(db);
        db.run('COMMIT', (err) => {
          if (err) reject(err);
          else resolve(result);
        });
      } catch (err) {
        db.run('ROLLBACK', () => reject(err));
      }
    });
  });
}

module.exports = { testConnection, query, queryOne, transaction };
