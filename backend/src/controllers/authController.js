const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query, queryOne } = require('../database');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh', {
    expiresIn: '30d'
  });
  return { accessToken, refreshToken };
};

// POST /api/auth/register
const register = async (req, res) => {
  try {
    let { full_name, email, password, student_id, role, department, phone } = req.body;
    if (!full_name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Full name, email, and password are required' });
    }

    full_name = String(full_name).trim();
    email = String(email).trim().toLowerCase();
    student_id = student_id ? String(student_id).trim() : null;
    department = department ? String(department).trim() : null;
    phone = phone ? String(phone).trim() : null;

    const existing = await queryOne(
      'SELECT id FROM users WHERE email = ? OR (student_id IS NOT NULL AND student_id = ?)',
      [email, student_id]
    );
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email or Student ID already registered' });
    }

    const allowedRoles = ['student', 'staff'];
    const userRole = allowedRoles.includes(role) ? role : 'student';
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users (full_name, email, password_hash, student_id, role, department, phone, is_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [full_name, email, passwordHash, student_id, userRole, department, phone, 1]
    );

    const userId = result.insertId ?? result.lastID;
    if (!userId) {
      throw new Error('Failed to create user account');
    }

    const { accessToken, refreshToken } = generateTokens(userId);
    const user = await queryOne(
      'SELECT id, full_name, email, role, student_id, department, avatar_url FROM users WHERE id = ?',
      [userId]
    );

    res.status(201).json({ success: true, message: 'Account created successfully', data: { user, accessToken, refreshToken } });
  } catch (err) {
    console.error('Register error:', err);
    if (err.code === 'SQLITE_CONSTRAINT' || err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Email or Student ID already registered' });
    }
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await queryOne(
      'SELECT id, full_name, email, password_hash, role, student_id, department, avatar_url, is_active FROM users WHERE email = ?',
      [email]
    );

    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });
    if (!user.is_active) return res.status(403).json({ success: false, message: 'Account has been deactivated' });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const { accessToken, refreshToken } = generateTokens(user.id);
    const { password_hash, is_active, ...safeUser } = user;

    res.json({ success: true, message: 'Login successful', data: { user: safeUser, accessToken, refreshToken } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await queryOne(
      `SELECT u.id, u.full_name, u.email, u.role, u.student_id, u.department, u.phone, u.avatar_url, u.created_at,
       (SELECT COUNT(*) FROM items WHERE user_id = u.id AND type = 'lost') as lost_count,
       (SELECT COUNT(*) FROM items WHERE user_id = u.id AND type = 'found') as found_count,
       (SELECT COUNT(*) FROM items WHERE user_id = u.id AND status = 'resolved') as resolved_count
       FROM users u WHERE u.id = ?`,
      [req.user.id]
    );
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

// PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const { full_name, phone, department } = req.body;
    await query(
      'UPDATE users SET full_name = ?, phone = ?, department = ? WHERE id = ?',
      [full_name, phone, department, req.user.id]
    );
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

// POST /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await queryOne('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    const newHash = await bcrypt.hash(new_password, 12);
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
};

module.exports = { register, login, getMe, updateProfile, changePassword };
