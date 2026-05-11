const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');

const usePostgres = Boolean(process.env.DATABASE_URL);

let pool;
let sqliteDb;
let dbAll;
let dbGet;
let sqliteDbRun;

if (usePostgres) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err);
    process.exit(-1);
  });
} else {
  const dbPath = process.env.DB_PATH || './database/laikipia_lost_found.db';
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ SQLite connection failed:', err.message);
      process.exit(1);
    }
    console.log('✅ SQLite database connected successfully at', dbPath);
  });

  dbAll = promisify(sqliteDb.all.bind(sqliteDb));
  dbGet = promisify(sqliteDb.get.bind(sqliteDb));
  sqliteDbRun = (sql, params = []) => new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes, insertId: this.lastID });
    });
  });
}

function normalizeSqlParams(sql, params = []) {
  if (!sql.includes('?')) return { text: sql, values: params };

  let index = 0;
  const text = sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
  return { text, values: params };
}

// Test connection on startup
async function testConnection() {
  if (!usePostgres) {
    try {
      await dbGet('SELECT 1');
      console.log('✅ SQLite database connected successfully');
    } catch (err) {
      console.error('❌ SQLite connection failed:', err.message);
      process.exit(1);
    }
    return;
  }

  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL database connected successfully:', result.rows[0]);
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
    process.exit(1);
  }
}

// Helper query function
async function query(sql, params = []) {
  const trimmed = sql.trim();
  const upper = trimmed.split(' ')[0].toUpperCase();

  if (!usePostgres) {
    if (upper === 'SELECT' || upper === 'PRAGMA') {
      return await dbAll(sql, params);
    }
    return await sqliteDbRun(sql, params);
  }

  try {
    const { text, values } = normalizeSqlParams(sql, params);
    const result = await pool.query(text, values);

    if (upper === 'SELECT' || upper === 'WITH') {
      return result.rows;
    }

    const payload = { rows: result.rows, changes: result.rowCount };
    if (upper === 'INSERT') {
      if (result.rows?.[0]?.id) {
        payload.insertId = result.rows[0].id;
      } else {
        const last = await pool.query('SELECT LASTVAL() AS id');
        payload.insertId = last.rows[0]?.id || null;
      }
    }
    return payload;
  } catch (err) {
    console.error('❌ Query error:', err);
    throw err;
  }
}

// Helper for single row
async function queryOne(sql, params = []) {
  if (!usePostgres) {
    return await dbGet(sql, params);
  }

  try {
    const { text, values } = normalizeSqlParams(sql, params);
    const result = await pool.query(text, values);
    return result.rows[0] || null;
  } catch (err) {
    console.error('❌ Query error:', err);
    throw err;
  }
}

// Transaction helper
async function transaction(callback) {
  if (!usePostgres) {
    return new Promise((resolve, reject) => {
      sqliteDb.run('BEGIN TRANSACTION', async (err) => {
        if (err) return reject(err);
        try {
          const result = await callback(sqliteDb);
          sqliteDb.run('COMMIT', (commitErr) => {
            if (commitErr) reject(commitErr);
            else resolve(result);
          });
        } catch (err) {
          sqliteDb.run('ROLLBACK', () => reject(err));
        }
      });
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { testConnection, query, queryOne, transaction, pool };
