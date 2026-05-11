const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/laikipia_lost_found.db');
db.run("UPDATE users SET password_hash = '$2b$12$GXrf0HJNIWPc7yOZxVBBlOhVMVg7Gb6mcRdQu0XXM8MQgXReTb6m2' WHERE email = 'admin@laikipia.ac.ke'");
db.run("UPDATE users SET password_hash = '$2b$12$GXrf0HJNIWPc7yOZxVBBlOhVMVg7Gb6mcRdQu0XXM8MQgXReTb6m2' WHERE email = 'security@laikipia.ac.ke'");
db.close();
console.log('Updated');