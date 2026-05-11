const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

async function migrate() {
  const dbPath = process.env.DB_PATH || './database/laikipia_lost_found.db';
  const db = new sqlite3.Database(dbPath);

  try {
    const schemaPath = path.join(__dirname, '../../../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Use db.exec to run the entire schema
    await new Promise((resolve, reject) => {
      db.exec(schema, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('✅ Database migration completed successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

migrate();