-- ============================================================
-- LAIKIPIA UNIVERSITY LOST & FOUND SYSTEM — DATABASE SCHEMA
-- ============================================================

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'staff', 'admin', 'security')),
  department TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_verified INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CAMPUS LOCATIONS TABLE
CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  building TEXT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ITEMS TABLE (lost & found)
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('lost', 'found')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id INTEGER,
  location_id INTEGER,
  location_detail TEXT,
  date_occurred DATE NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'matched', 'resolved', 'archived')),
  is_valuable INTEGER DEFAULT 0,
  reward_offered INTEGER DEFAULT 0,
  reward_amount REAL,
  ai_tags TEXT,
  view_count INTEGER DEFAULT 0,
  contact_phone TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE INDEX IF NOT EXISTS idx_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_created ON items(created_at DESC);

-- ITEM IMAGES TABLE
CREATE TABLE IF NOT EXISTS item_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  is_primary INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- AI MATCHES TABLE
CREATE TABLE IF NOT EXISTS ai_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lost_item_id INTEGER NOT NULL,
  found_item_id INTEGER NOT NULL,
  confidence_score REAL NOT NULL,
  ai_reasoning TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lost_item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (found_item_id) REFERENCES items(id) ON DELETE CASCADE,
  UNIQUE(lost_item_id, found_item_id)
);

-- MESSAGES TABLE
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL,
  receiver_id INTEGER NOT NULL,
  item_id INTEGER,
  content TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_conversation ON messages(sender_id, receiver_id);

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('match_found', 'message_received', 'item_resolved', 'claim_request', 'system')),
  title TEXT NOT NULL,
  body TEXT,
  data TEXT,
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_unread ON notifications(user_id, is_read);

-- CLAIMS TABLE (with identity verification)
CREATE TABLE IF NOT EXISTS claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  claimant_id INTEGER NOT NULL,
  proof_description TEXT NOT NULL,
  proof_image_url TEXT,
  identity_document_url TEXT,
  identity_verification_status TEXT DEFAULT 'pending' CHECK (identity_verification_status IN ('pending', 'verified', 'rejected')),
  verification_questions TEXT,
  verification_answers_hash TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  reviewed_by INTEGER,
  reviewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (claimant_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  details TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_created_audit ON audit_log(created_at DESC);

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO categories (name, icon, color) VALUES
('Electronics', '💻', '#3B82F6'),
('Documents & ID', '🪪', '#8B5CF6'),
('Clothing & Accessories', '👜', '#EC4899'),
('Books & Stationery', '📚', '#F59E0B'),
('Keys', '🔑', '#10B981'),
('Jewelry & Watches', '💍', '#F97316'),
('Sports Equipment', '⚽', '#06B6D4'),
('Money & Wallets', '💰', '#84CC16'),
('Other', '📦', '#6B7280');

INSERT INTO locations (name, building, description) VALUES
('Main Library', 'Library Block', 'Ground and upper floors'),
('ICT Lab 1', 'Computing Block', 'Lab on first floor'),
('ICT Lab 2', 'Computing Block', 'Lab on second floor'),
('Cafeteria', 'Student Centre', 'Main dining area'),
('Administration Block', 'Admin Block', 'Reception and offices'),
('Lecture Hall A', 'Academic Block A', 'Halls 1–10'),
('Lecture Hall B', 'Academic Block B', 'Halls 11–20'),
('Sports Ground', 'Outdoor', 'Football pitch and courts'),
('Student Centre', 'Student Block', 'Common rooms and lobby'),
('Security Office', 'Main Gate', 'Main campus entrance'),
('Hostel A', 'Hostel Block A', 'Male hostel'),
('Hostel B', 'Hostel Block B', 'Female hostel'),
('Parking Lot', 'Outdoor', 'Main vehicle parking'),
('Chapel', 'Chapel Block', 'University chapel');

-- Default admin user (password: Admin@1234)
INSERT INTO users (student_id, full_name, email, password_hash, role, is_verified) VALUES
('ADMIN001', 'System Administrator', 'admin@laikipia.ac.ke',
 '$2b$12$GXrf0HJNIWPc7yOZxVBBlOhVMVg7Gb6mcRdQu0XXM8MQgXReTb6m2', 'admin', 1),
('SEC001', 'Security Office', 'security@laikipia.ac.ke',
 '$2b$12$GXrf0HJNIWPc7yOZxVBBlOhVMVg7Gb6mcRdQu0XXM8MQgXReTb6m2', 'security', 1);
