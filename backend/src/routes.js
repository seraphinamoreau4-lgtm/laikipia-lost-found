const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const authController = require('./controllers/authController');
const itemsController = require('./controllers/itemsController');
const messagesController = require('./controllers/messagesController');
const adminController = require('./controllers/adminController');
const { authenticate, authorize } = require('./middleware/auth');
const { query } = require('./database');

const router = express.Router();

// ─── MULTER SETUP ─────────────────────────────────────────────
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});

// ─── AUTH ROUTES ──────────────────────────────────────────────
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticate, authController.getMe);
router.put('/auth/profile', authenticate, authController.updateProfile);
router.post('/auth/change-password', authenticate, authController.changePassword);

// ─── ITEMS ROUTES ─────────────────────────────────────────────
router.get('/items', itemsController.getItems);
router.get('/items/stats/overview', itemsController.getStats);
router.get('/items/:id', itemsController.getItemById);
router.post('/items', authenticate, upload.array('images', 5), itemsController.createItem);
router.put('/items/:id', authenticate, itemsController.updateItem);
router.delete('/items/:id', authenticate, itemsController.deleteItem);
router.post('/items/:id/claim', authenticate, upload.single('proof_image'), itemsController.claimItem);
router.get('/claims/:id', authenticate, itemsController.getClaimById);
router.post('/claims/:id/verify-identity', authenticate, upload.single('identity_document'), itemsController.submitIdentityVerification);

// ─── CATEGORIES & LOCATIONS ───────────────────────────────────
router.get('/categories', async (req, res) => {
  const cats = await query('SELECT * FROM categories ORDER BY name');
  res.json({ success: true, data: cats });
});
router.get('/locations', async (req, res) => {
  const locs = await query('SELECT * FROM locations ORDER BY name');
  res.json({ success: true, data: locs });
});

// ─── NOTIFICATIONS ────────────────────────────────────────────
router.get('/notifications', authenticate, async (req, res) => {
  const notifs = await query(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [req.user.id]
  );
  res.json({ success: true, data: notifs });
});
router.put('/notifications/:id/read', authenticate, async (req, res) => {
  await query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ success: true });
});
router.put('/notifications/read-all', authenticate, async (req, res) => {
  await query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
  res.json({ success: true });
});

// ─── MESSAGES ROUTES ──────────────────────────────────────────
router.get('/messages/conversations', authenticate, messagesController.getConversations);
router.get('/messages/unread/count', authenticate, messagesController.getUnreadCount);
router.get('/messages/:userId', authenticate, messagesController.getMessages);
router.post('/messages/:userId', authenticate, messagesController.sendMessage);

// ─── ADMIN ROUTES ─────────────────────────────────────────────
router.get('/admin/users', authenticate, authorize('admin'), adminController.getUsers);
router.put('/admin/users/:id', authenticate, authorize('admin'), adminController.updateUser);
router.get('/admin/claims', authenticate, authorize('admin', 'security'), adminController.getClaims);
router.put('/admin/claims/:id', authenticate, authorize('admin', 'security'), adminController.reviewClaim);
router.put('/admin/claims/:id/verify-identity', authenticate, authorize('admin', 'security'), adminController.verifyIdentity);
router.put('/admin/claims/:id/reject-identity', authenticate, authorize('admin', 'security'), adminController.rejectIdentity);
router.get('/admin/audit-log', authenticate, authorize('admin'), adminController.getAuditLog);

// ─── AI MATCH RE-RUN ──────────────────────────────────────────
router.post('/items/:id/rematch', authenticate, async (req, res) => {
  const { runMatchingForItem } = require('./services/aiMatchingService');
  setImmediate(() => runMatchingForItem(req.params.id));
  res.json({ success: true, message: 'AI matching re-initiated' });
});

// ─── USER PROFILE ─────────────────────────────────────────────
router.get('/users/:id/items', async (req, res) => {
  const items = await query(`
    SELECT i.id, i.type, i.title, i.status, i.date_occurred, i.created_at,
           c.name as category_name, c.icon as category_icon,
           (SELECT url FROM item_images WHERE item_id = i.id AND is_primary = 1 LIMIT 1) as primary_image
    FROM items i LEFT JOIN categories c ON i.category_id = c.id
    WHERE i.user_id = ? AND i.status != 'archived'
    ORDER BY i.created_at DESC
  `, [req.params.id]);
  res.json({ success: true, data: items });
});

module.exports = router;
